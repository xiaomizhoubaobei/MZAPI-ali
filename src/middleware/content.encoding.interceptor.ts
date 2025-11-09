// Content-Encoding 头部拦截器，用于处理响应内容编码
import { Request, Response, NextFunction } from "express";
import { Logger } from "../logger";
import { createGzip, createDeflate, createBrotliCompress } from "zlib";
import { Transform } from "stream";

/**
 * Content-Encoding 头部拦截器中间件
 * 用于压缩响应内容并设置Content-Encoding相关头部，确保客户端正确处理压缩内容
 * @param req - Express请求对象
 * @param res - Express响应对象
 * @param next - Express next函数
 */
export const contentEncodingInterceptor = (req: Request, res: Response, next: NextFunction) => {
    // 获取客户端支持的编码方式
    const acceptEncoding = req.headers['accept-encoding'] as string;
    
    // 记录当前请求的编码支持情况
    Logger.info("ContentEncodingInterceptor", "checkEncoding", "检查客户端编码支持", {
        url: req.url,
        method: req.method,
        acceptEncoding: acceptEncoding || "none",
        userAgent: req.headers['user-agent'] || "unknown",
    });

    // 保存原始的 res.write 和 res.end 方法
    let transform: Transform | null = null;

    // 根据客户端支持情况设置响应编码头部并创建压缩流
    if (acceptEncoding) {
        // 如果客户端支持br，优先使用brotli压缩
        if (acceptEncoding.includes('br')) {
            res.setHeader('Content-Encoding', 'br');
            transform = createBrotliCompress();
        } else if (acceptEncoding.includes('gzip')) {
            // 如果客户端支持gzip，使用gzip压缩
            res.setHeader('Content-Encoding', 'gzip');
            transform = createGzip();
        } else if (acceptEncoding.includes('deflate')) {
            // 如果客户端支持deflate，使用deflate压缩
            res.setHeader('Content-Encoding', 'deflate');
            transform = createDeflate();
        } else {
            // 如果客户端不支持压缩，明确不设置Content-Encoding
            res.removeHeader('Content-Encoding');
        }
    } else {
        // 客户端未声明支持的编码类型，不设置Content-Encoding
        res.removeHeader('Content-Encoding');
    }

    // 如果需要压缩，拦截响应数据并进行压缩
    if (transform) {
        // 设置Vary头部，告知代理服务器根据Accept-Encoding进行缓存
        res.setHeader('Vary', 'Accept-Encoding');

        // 用于处理反压的队列
        let isTransformWritable = true;
        const pendingWrites: Array<{
            data: any;
            encoding?: any;
            callback?: any;
        }> = [];

        // 监听transform的可写性
        transform.on('drain', () => {
            isTransformWritable = true;
            // 处理队列中的写入操作
            while (pendingWrites.length > 0 && isTransformWritable) {
                const { data, encoding, callback } = pendingWrites.shift()!;
                isTransformWritable = transform.write(data, encoding, callback);
            }
        });

        // 监听transform错误
        transform.on('error', (err) => {
            Logger.error("ContentEncodingInterceptor", "transformError", "压缩流错误", {
                url: req.url,
                method: req.method,
                error: err.message,
            });
            res.destroy(err);
        });

        // 覆盖 res.write 方法
        res.write = function (data: any, encoding?: any, callback?: any) {
            if (!data) {
                if (callback) callback();
                return true;
            }

            if (!isTransformWritable) {
                // 如果transform不可写，将写入操作加入队列
                pendingWrites.push({ data, encoding, callback });
                return false;
            }

            // 尝试写入transform流，如果返回false说明需要等待反压
            isTransformWritable = transform.write(data, encoding, callback);
            return isTransformWritable;
        } as any;

        // 覆盖 res.end 方法
        res.end = function (data?: any, encoding?: any, callback?: any) {
            if (typeof encoding === 'function') {
                callback = encoding;
                encoding = undefined;
            }

            // 确保在transform流结束后才执行回调，防止竞态条件
            const finishCallback = () => {
                if (callback) callback();
            };

            if (data && transform) {
                // 监听transform流的finish事件，在流真正结束时执行回调
                transform.on('finish', finishCallback);
                // 使用transform.end而不是transform.write来确保数据完全写入
                transform.end(data, encoding);
            } else {
                if (transform) {
                    transform.on('finish', finishCallback);
                    transform.end();
                } else {
                    if (callback) callback();
                }
            }
        } as any;

        // 将压缩流的数据传输到响应对象
        transform.pipe(res);
    } else {
        // 不需要压缩时，仍需设置Vary头部
        res.setHeader('Vary', 'Accept-Encoding');
    }

    // 在响应结束时记录编码使用情况
    res.on('finish', () => {
        const contentEncoding = res.getHeader('Content-Encoding');
        Logger.info("ContentEncodingInterceptor", "responseEncoding", "响应编码设置完成", {
            url: req.url,
            method: req.method,
            contentEncoding: contentEncoding || "none",
            statusCode: res.statusCode,
        });
    });

    next();
};
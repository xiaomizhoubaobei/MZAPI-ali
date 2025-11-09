// Content-Encoding 头部拦截器，用于处理响应内容编码
import { Request, Response, NextFunction } from "express";
import { Logger } from "../logger";

/**
 * Content-Encoding 头部拦截器中间件
 * 用于设置Content-Encoding相关头部，确保客户端正确处理压缩内容
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

    // 根据客户端支持情况设置响应编码头部
    if (acceptEncoding) {
        // 如果客户端支持gzip，设置适当的响应编码
        if (acceptEncoding.includes('gzip')) {
            res.setHeader('Content-Encoding', 'gzip');
        } else if (acceptEncoding.includes('deflate')) {
            res.setHeader('Content-Encoding', 'deflate');
        } else if (acceptEncoding.includes('br')) {
            res.setHeader('Content-Encoding', 'br');
        } else {
            // 如果客户端不支持压缩，明确不设置Content-Encoding
            res.removeHeader('Content-Encoding');
        }
    } else {
        // 客户端未声明支持的编码类型，不设置Content-Encoding
        res.removeHeader('Content-Encoding');
    }

    // 设置Vary头部，告知代理服务器根据Accept-Encoding进行缓存
    res.setHeader('Vary', 'Accept-Encoding');

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
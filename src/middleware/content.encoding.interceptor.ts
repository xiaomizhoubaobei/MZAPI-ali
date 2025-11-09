// Content-Encoding 头部拦截器，用于处理响应内容编码
import { Request, Response, NextFunction } from "express";
import { Logger } from "../logger";
import { createGzip, createDeflate, createBrotliCompress } from "zlib";
import { Transform } from "stream";

// 检查字符串是否包含危险内容的辅助函数
function hasDangerousContent(data: string): boolean {
    // 检查常见的危险模式
    const dangerousPatterns = [
        /<script[^>]*>.*<\/script>/i, // script 标签
        /javascript:/i, // javascript: 协议
        /vbscript:/i, // vbscript: 协议
        /on\w+\s*=/i, // on事件处理器
        /<iframe[^>]*>.*<\/iframe>/i, // iframe 标签
        /<object[^>]*>.*<\/object>/i, // object 标签
        /<embed[^>]*>.*<\/embed>/i, // embed 标签
        /eval\s*\(/i, // eval 函数
        /expression\s*\(/i, // CSS expression
        /data:text\/html/i, // data URI html
    ];

    // 检查是否包含任何危险模式
    return dangerousPatterns.some(pattern => pattern.test(data));
}

// 清理字符串数据的辅助函数
function sanitizeString(data: string): string {
    // 移除或转义潜在危险字符
    return data
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

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

    // 存储原始的 res.write 和 res.end 方法引用
    const originalWrite = res.write;
    const originalEnd = res.end;
    
    // 保存 transform 流
    let transform: Transform | null = null;

    // 根据客户端支持情况设置响应编码头部并创建压缩流
    if (acceptEncoding) {
        if (acceptEncoding.includes('br')) {
            res.setHeader('Content-Encoding', 'br');
            transform = createBrotliCompress();
        } else if (acceptEncoding.includes('gzip')) {
            res.setHeader('Content-Encoding', 'gzip');
            transform = createGzip();
        } else if (acceptEncoding.includes('deflate')) {
            res.setHeader('Content-Encoding', 'deflate');
            transform = createDeflate();
        } else {
            res.removeHeader('Content-Encoding');
        }
    } else {
        res.removeHeader('Content-Encoding');
    }

    // 如果需要压缩，拦截响应数据并进行压缩
    if (transform) {
        // 设置Vary头部，告知代理服务器根据Accept-Encoding进行缓存
        res.setHeader('Vary', 'Accept-Encoding');

        // 用于处理反压的队列
        let isTransformStreamWritable = true;
        const pendingWriteOperations: Array<{
            responseData: any;
            responseEncoding?: any;
            responseCallback?: any;
        }> = [];
        const MAX_PENDING_WRITES = 1000; // 限制队列最大长度，防止内存耗尽
        const MAX_WRITE_SIZE = 100 * 1024 * 1024; // 限制单次写入最大大小为10MB

        // 监听transform的可写性
        transform.on('drain', () => {
            isTransformStreamWritable = true;
            while (pendingWriteOperations.length > 0 && isTransformStreamWritable) {
                const nextWrite = pendingWriteOperations.shift();
                // 检查队列是否意外变空（额外的安全检查）
                if (!nextWrite) {
                    Logger.warn("ContentEncodingInterceptor", "drainHandler", "Pending writes queue unexpectedly empty", {
                        url: req.url,
                        method: req.method,
                        queueLength: pendingWriteOperations.length,
                    });
                    break;
                }
                const { responseData, responseEncoding, responseCallback } = nextWrite;
                isTransformStreamWritable = transform.write(responseData, responseEncoding, responseCallback);
            }
        });

        // 监听transform错误
        transform.on('error', (err) => {
            Logger.error("ContentEncodingInterceptor", "transformError", "压缩流错误", {
                url: req.url,
                method: req.method,
                error: err.message,
            });

            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Response compression failed'
                });
            } else {
                // 使用原始方法结束响应
                originalEnd.call(res);
            }
        });

        // 覆盖 res.write 方法
        res.write = function (responseData: any, responseEncoding?: any, responseCallback?: any) {
            if (responseData === null || responseData === undefined) {
                if (responseCallback) responseCallback();
                return true;
            }

            // 数据验证和清理
            try {
                // 验证数据类型
                if (!(typeof responseData === 'string' || Buffer.isBuffer(responseData))) {
                    Logger.warn("ContentEncodingInterceptor", "invalidDataType", "Invalid data type for write", {
                        url: req.url,
                        method: req.method,
                        dataType: typeof responseData,
                    });
                    if (responseCallback) responseCallback(new Error('Data must be a string or Buffer'));
                    return false;
                }

                // 对字符串数据进行清理和验证
                let validatedData = responseData;
                if (typeof responseData === 'string') {
                    // 验证字符串内容，移除潜在的危险字符
                    if (hasDangerousContent(responseData)) {
                        Logger.error("ContentEncodingInterceptor", "dangerousContent", "Dangerous content detected in response data", {
                            url: req.url,
                            method: req.method,
                            contentType: 'string',
                        });
                        if (responseCallback) responseCallback(new Error('Response data contains dangerous content'));
                        return false;
                    }
                    // 限制字符串长度
                    if (responseData.length > MAX_WRITE_SIZE) {
                        Logger.error("ContentEncodingInterceptor", "writeTooLarge", `Write data too large: ${responseData.length} characters`, {
                            url: req.url,
                            method: req.method,
                            dataSize: responseData.length,
                            maxWriteSize: MAX_WRITE_SIZE,
                        });
                        if (responseCallback) responseCallback(new Error(`Write data exceeds maximum size of ${MAX_WRITE_SIZE} characters`));
                        return false;
                    }
                    validatedData = sanitizeString(responseData);
                } else if (Buffer.isBuffer(responseData)) {
                    // 验证Buffer数据大小
                    if (responseData.length > MAX_WRITE_SIZE) {
                        Logger.error("ContentEncodingInterceptor", "writeTooLarge", `Write data too large: ${responseData.length} bytes`, {
                            url: req.url,
                            method: req.method,
                            dataSize: responseData.length,
                            maxWriteSize: MAX_WRITE_SIZE,
                        });
                        if (responseCallback) responseCallback(new Error(`Write data exceeds maximum size of ${MAX_WRITE_SIZE} bytes`));
                        return false;
                    }
                }

                const responseDataSize = typeof validatedData === 'string' ? Buffer.byteLength(validatedData, responseEncoding) : validatedData.length;
                if (responseDataSize > MAX_WRITE_SIZE) {
                    Logger.error("ContentEncodingInterceptor", "writeTooLarge", `Write data too large: ${responseDataSize} bytes`, {
                        url: req.url,
                        method: req.method,
                        dataSize: responseDataSize,
                        maxWriteSize: MAX_WRITE_SIZE,
                    });
                    if (responseCallback) responseCallback(new Error(`Write data exceeds maximum size of ${MAX_WRITE_SIZE} bytes`));
                    return false;
                }

                if (!isTransformStreamWritable) {
                    if (pendingWriteOperations.length >= MAX_PENDING_WRITES) {
                        Logger.error("ContentEncodingInterceptor", "queueOverflow", `Pending writes queue overflow: ${pendingWriteOperations.length}`, {
                            url: req.url,
                            method: req.method,
                            queueLength: pendingWriteOperations.length,
                            maxPendingWrites: MAX_PENDING_WRITES,
                        });
                        if (responseCallback) responseCallback(new Error(`Too many pending writes, maximum allowed: ${MAX_PENDING_WRITES}`));
                        return false;
                    }
                    pendingWriteOperations.push({ responseData: validatedData, responseEncoding, responseCallback });
                    return false;
                }

                isTransformStreamWritable = transform.write(validatedData, responseEncoding, responseCallback);
                return isTransformStreamWritable;
            } catch (error) {
                Logger.error("ContentEncodingInterceptor", "dataValidationError", "Error during data validation", {
                    url: req.url,
                    method: req.method,
                    error: error instanceof Error ? error.message : String(error),
                });
                if (responseCallback) responseCallback(error instanceof Error ? error : new Error('Data validation error'));
                return false;
            }
        } as any;

        // 覆盖 res.end 方法
        res.end = function (responseData?: any, responseEncoding?: any, responseCallback?: any) {
            // 处理不同的参数组合
            // 1. res.end()
            // 2. res.end(callback)
            // 3. res.end(data)
            // 4. res.end(data, callback)
            // 5. res.end(data, encoding)
            // 6. res.end(data, encoding, callback)
            
            // 检查参数类型并重新分配
            if (typeof responseData === 'function') {
                responseCallback = responseData;
                responseData = undefined;
                responseEncoding = undefined;
            } else if (typeof responseEncoding === 'function') {
                responseCallback = responseEncoding;
                responseEncoding = undefined;
            }

            // 数据验证和清理
            let validatedData = responseData;
            if (responseData !== null && responseData !== undefined) {
                try {
                    if (typeof responseData === 'string') {
                        // 验证字符串内容，移除潜在的危险字符
                        if (hasDangerousContent(responseData)) {
                            Logger.error("ContentEncodingInterceptor", "dangerousContent", "Dangerous content detected in response data", {
                                url: req.url,
                                method: req.method,
                                contentType: 'string',
                            });
                            const error = new Error('Response data contains dangerous content');
                            if (responseCallback) responseCallback(error);
                            res.status(400).json({
                                error: 'Bad Request',
                                message: 'Response data contains dangerous content'
                            });
                            return;
                        }
                        validatedData = sanitizeString(responseData);
                    } else if (Buffer.isBuffer(responseData)) {
                        // 验证Buffer数据大小
                        if (responseData.length > MAX_WRITE_SIZE) {
                            Logger.error("ContentEncodingInterceptor", "writeTooLarge", `Write data too large: ${responseData.length} bytes`, {
                                url: req.url,
                                method: req.method,
                                dataSize: responseData.length,
                                maxWriteSize: MAX_WRITE_SIZE,
                            });
                            const error = new Error(`Write data exceeds maximum size of ${MAX_WRITE_SIZE} bytes`);
                            if (responseCallback) responseCallback(error);
                            res.status(413).json({
                                error: 'Payload Too Large',
                                message: `Response data exceeds maximum size of ${MAX_WRITE_SIZE} bytes`
                            });
                            return;
                        }
                    } else if (!(typeof responseData === 'string' || Buffer.isBuffer(responseData) || responseData === null || responseData === undefined)) {
                        Logger.warn("ContentEncodingInterceptor", "invalidDataType", "Invalid data type for end", {
                            url: req.url,
                            method: req.method,
                            dataType: typeof responseData,
                        });
                        const error = new Error('Data must be a string or Buffer');
                        if (responseCallback) responseCallback(error);
                        res.status(400).json({
                            error: 'Bad Request',
                            message: 'Response data must be a string or Buffer'
                        });
                        return;
                    }
                } catch (error) {
                    Logger.error("ContentEncodingInterceptor", "dataValidationError", "Error during data validation in end", {
                        url: req.url,
                        method: req.method,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    const validationError = error instanceof Error ? error : new Error('Data validation error');
                    if (responseCallback) responseCallback(validationError);
                    res.status(500).json({
                        error: 'Internal Server Error',
                        message: 'Error during response data validation'
                    });
                    return;
                }
            }

            const finishCallback = () => {
                if (responseCallback) responseCallback();
            };

            if (validatedData !== undefined && validatedData !== null && transform) {
                transform.on('finish', finishCallback);
                transform.end(validatedData, responseEncoding);
            } else {
                if (transform) {
                    transform.on('finish', finishCallback);
                    transform.end();
                } else {
                    // 使用原始方法结束响应
                    originalEnd.call(res);
                }
            }
        } as any;

        // 将压缩流的数据传输到响应对象
        transform.pipe(res);
    } else {
        // 不需要压缩时，仍需设置Vary头部
        res.setHeader('Vary', 'Accept-Encoding');
        
        // 不需要压缩时，确保使用原始方法处理响应结束
        // 重写 res.end 方法以确保调用原始方法
        res.end = function (responseData?: any, responseEncoding?: any, responseCallback?: any) {
            // 处理不同的参数组合
            if (typeof responseData === 'function') {
                responseCallback = responseData;
                responseData = undefined;
                responseEncoding = undefined;
            } else if (typeof responseEncoding === 'function') {
                responseCallback = responseEncoding;
                responseEncoding = undefined;
            }
            
            // 调用原始的 end 方法
            return originalEnd.call(this, responseData, responseEncoding, responseCallback);
        } as any;
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
import { Request, Response, NextFunction } from "express";
import { Logger } from "../logger";

/**
 * 验证图像URL的中间件
 * @param req Express请求对象
 * @param res Express响应对象
 * @param next 下一个中间件函数
 */
export function validateImageUrl(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const requestId = (req.headers["x-fc-request-id"] as string) || undefined;
    const userAgent = req.get("user-agent");

    Logger.info("ValidationMiddleware", "validateImageUrl", "开始验证图像URL", {
        method: req.method,
        url: req.url,
        ip,
        userAgent,
        requestId,
    });

    try {
        // 检查请求体是否存在
        if (!req.body || typeof req.body !== "object") {
            Logger.warn("ValidationMiddleware", "validateImageUrl", "请求体为空或格式错误", {
                ip,
                requestId,
            });

            res.status(400).json({
                error: "请求体不能为空且必须为JSON格式",
                code: "INVALID_REQUEST_BODY",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const { imageUrl } = req.body;

        // 检查imageUrl是否存在
        if (!imageUrl) {
            Logger.warn("ValidationMiddleware", "validateImageUrl", "缺少imageUrl参数", {
                ip,
                requestId,
            });

            res.status(400).json({
                error: "imageUrl参数是必需的",
                code: "MISSING_IMAGE_URL",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 检查imageUrl类型
        if (typeof imageUrl !== "string") {
            Logger.warn("ValidationMiddleware", "validateImageUrl", "imageUrl参数类型错误", {
                imageUrlType: typeof imageUrl,
                ip,
                requestId,
            });

            res.status(400).json({
                error: "imageUrl参数必须是字符串类型",
                code: "INVALID_IMAGE_URL_TYPE",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 检查imageUrl长度
        if (imageUrl.trim().length === 0) {
            Logger.warn("ValidationMiddleware", "validateImageUrl", "imageUrl参数为空字符串", {
                ip,
                requestId,
            });

            res.status(400).json({
                error: "imageUrl参数不能为空字符串",
                code: "EMPTY_IMAGE_URL",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 检查URL长度限制
        if (imageUrl.length > 2048) {
            Logger.warn("ValidationMiddleware", "validateImageUrl", "imageUrl参数过长", {
                urlLength: imageUrl.length,
                ip,
                requestId,
            });

            res.status(400).json({
                error: "imageUrl参数长度不能超过2048个字符",
                code: "IMAGE_URL_TOO_LONG",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 验证URL格式
        let urlObj: URL;
        try {
            urlObj = new URL(imageUrl.trim());
        } catch (urlError) {
            Logger.warn("ValidationMiddleware", "validateImageUrl", "无效的URL格式", {
                imageUrl: imageUrl.substring(0, 50) + "...",
                error: urlError instanceof Error ? urlError.message : "Unknown error",
                ip,
                requestId,
            });

            res.status(400).json({
                error: "imageUrl参数必须是有效的URL格式",
                code: "INVALID_URL_FORMAT",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 检查协议是否为HTTP或HTTPS
        if (!["http:", "https:"].includes(urlObj.protocol)) {
            Logger.warn("ValidationMiddleware", "validateImageUrl", "不支持的URL协议", {
                protocol: urlObj.protocol,
                ip,
                requestId,
            });

            res.status(400).json({
                error: "imageUrl参数必须使用HTTP或HTTPS协议",
                code: "UNSUPPORTED_URL_PROTOCOL",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 检查是否为常见的图像文件扩展名
        const supportedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
        const hasValidExtension = supportedExtensions.some(ext => 
            imageUrl.toLowerCase().endsWith(ext)
        );

        if (!hasValidExtension) {
            Logger.warn("ValidationMiddleware", "validateImageUrl", "URL可能不指向图像文件", {
                imageUrl: imageUrl.substring(0, 50) + "...",
                ip,
                requestId,
            });

            // 这里只是警告，但不阻止请求，因为有些图像URL可能没有明确的扩展名
            Logger.info("ValidationMiddleware", "validateImageUrl", "URL可能不指向图像文件，但继续处理", {
                imageUrl: imageUrl.substring(0, 50) + "...",
                ip,
                requestId,
            });
        }

        Logger.info("ValidationMiddleware", "validateImageUrl", "图像URL验证通过", {
            imageUrl: imageUrl.substring(0, 50) + "...",
            ip,
            requestId,
        });

        // 将验证后的imageUrl添加到请求对象中
        (req as any).validatedImageUrl = imageUrl.trim();
        next();
    } catch (error) {
        Logger.error("ValidationMiddleware", "validateImageUrl", "验证过程中发生错误", {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            ip,
            requestId,
        });

        res.status(500).json({
            error: "请求验证过程中发生内部错误",
            code: "VALIDATION_ERROR",
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * 错误处理中间件
 * @param error 错误对象
 * @param req Express请求对象
 * @param res Express响应对象
 * @param next 下一个中间件函数
 */
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const requestId = (req.headers["x-fc-request-id"] as string) || undefined;

    Logger.error("ErrorHandler", "errorHandler", "处理请求时发生错误", {
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url,
        ip,
        requestId,
    });

    // 根据错误类型返回不同的状态码
    let statusCode = 500;
    let errorCode = "INTERNAL_SERVER_ERROR";
    let message = "服务器内部错误";

    if (error.name === "ValidationError") {
        statusCode = 400;
        errorCode = "VALIDATION_FAILED";
        message = "请求验证失败";
    } else if (error.name === "InvalidModelTypeError" || error.name === "UnhandledModelTypeError") {
        statusCode = 400;
        errorCode = "INVALID_MODEL_TYPE";
        message = "无效的模型类型";
    } else if (error.name === "SubmitTaskError" || error.name === "QueryTaskError" || error.name === "ProcessTaskError") {
        statusCode = 503;
        errorCode = "EXTERNAL_SERVICE_ERROR";
        message = "外部服务错误";
    } else if (error.name === "TaskTimeoutError") {
        statusCode = 408;
        errorCode = "REQUEST_TIMEOUT";
        message = "请求超时";
    }

    res.status(statusCode).json({
        error: message,
        code: errorCode,
        message: error.message,
        timestamp: new Date().toISOString(),
    });
}
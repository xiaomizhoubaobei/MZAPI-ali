import { Request, Response, NextFunction } from "express";
import { ErrorLogService } from "../services/error.log.service";

export const errorHandlerMiddleware = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
) => {
    // 生成唯一的错误ID，用于内部调试
    const errorId = req.headers["x-fc-request-id"] as string;

    // 记录详细的错误日志，包含错误ID用于内部调试，但不向客户端暴露敏感信息
    ErrorLogService.logUnhandledError(error, req, errorId);

    // 安全的错误响应 - 不管在开发还是生产环境都不直接暴露错误详情
    // 防止基于 NODE_ENV 返回详细错误信息可能无意中泄露敏感信息
    const safeResponse = {
        error: "服务器内部错误",
        message: "系统发生未知错误，请稍后再试", // 统一的错误消息，不暴露具体错误信息
        code: "INTERNAL_ERROR",
        errorId, // 提供错误ID用于内部追踪，但不暴露系统实现细节
        timestamp: new Date().toISOString(),
    };

    // 仅在开发环境中记录原始错误信息用于调试（仅在日志中，不在响应中）
    if (process.env.NODE_ENV === "development") {
        console.error("开发模式下的原始错误信息:", error); // 在控制台记录原始错误，但不在响应中返回
    }

    res.status(500).json(safeResponse);
};
import { Request, Response, NextFunction } from "express";
import { ErrorLogService } from "../services/error.log.service";

export const errorHandlerMiddleware = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
) => {
    // 生成唯一的错误ID，用于内部调试
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 记录详细的错误日志，包含错误ID用于内部调试，但不向客户端暴露敏感信息
    ErrorLogService.logUnhandledError(error, req, errorId);

    // 根据环境决定是否返回详细错误信息
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // 确保错误响应不包含敏感信息
    res.status(500).json({
        error: "服务器内部错误",
        message: isDevelopment ? error.message : "系统发生未知错误，请稍后再试",
        code: "INTERNAL_ERROR",
        errorId, // 提供错误ID用于内部追踪，但不暴露系统实现细节
        timestamp: new Date().toISOString(),
    });
};
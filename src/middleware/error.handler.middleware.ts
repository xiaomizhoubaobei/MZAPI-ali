import { Request, Response, NextFunction } from "express";
import { ErrorLogService } from "../services/error.log.service";

export const errorHandlerMiddleware = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
) => {
    // 记录错误日志
    ErrorLogService.logUnhandledError(error, req);

    res.status(500).json({
        error: "服务器内部错误",
        message: "系统发生未知错误，请稍后再试",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
    });
};
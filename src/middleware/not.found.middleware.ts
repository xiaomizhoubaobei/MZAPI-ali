import { Request, Response } from "express";
import { ErrorLogService } from "../services/error.log.service";

export const notFoundMiddleware = (req: Request, res: Response) => {
    // 记录404错误日志
    ErrorLogService.logNotFound(req);

    res.status(404).json({
        error: "请求的接口不存在",
        message: "请检查您的请求路径是否正确",
        code: "NOT_FOUND",
        timestamp: new Date().toISOString(),
    });
};
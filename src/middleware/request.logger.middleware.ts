import { Request, Response, NextFunction } from "express";
import { RequestLogService } from "../services/request.log.service";

export const requestLoggerMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    // 设置请求开始时间
    RequestLogService.setRequestStartTime(req);
    
    // 记录请求开始
    RequestLogService.logRequestStart(req);

    // 在响应结束时记录日志
    res.on("finish", () => {
        RequestLogService.logRequestEnd(req, res);
    });

    next();
};
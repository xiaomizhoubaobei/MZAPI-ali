import { Request } from "express";
import { Logger } from "../logger";
import { IpUtil } from "../utils/ip.util";

/**
 * 错误日志服务类
 * 专门处理应用中的错误日志记录
 */
export class ErrorLogService {
    /**
     * 记录未处理的错误日志
     * @param error 错误对象
     * @param req Express请求对象
     * @param errorId 错误唯一标识符，用于追踪和调试
     */
    public static logUnhandledError(error: Error, req: Request, errorId?: string): void {
        const ip = IpUtil.getClientIp(req);

        Logger.error("Main", "ErrorHandler", "【应用层】捕获未处理的错误", {
            errorId,
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            ip,
        });
    }

    /**
     * 记录404错误日志
     * @param req Express请求对象
     */
    public static logNotFound(req: Request): void {
        const ip = IpUtil.getClientIp(req);

        Logger.warn("Main", "NotFound", "请求的接口不存在", {
            url: req.url,
            method: req.method,
            ip,
        });
    }
}
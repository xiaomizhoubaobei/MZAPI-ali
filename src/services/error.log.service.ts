import { Request } from "express";
import { Logger } from "../logger";

/**
 * 错误日志服务类
 * 专门处理应用中的错误日志记录
 */
export class ErrorLogService {
    /**
     * 记录未处理的错误日志
     * @param error 错误对象
     * @param req Express请求对象
     */
    public static logUnhandledError(error: Error, req: Request): void {
        const ip = this.getClientIp(req);

        Logger.error("Main", "ErrorHandler", "【应用层】捕获未处理的错误", {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            ip,
        });
    }

    /**
     * 获取客户端真实IP地址
     * 优先使用阿里云CDN的Eo-Client-Ip头部
     * @param req Express请求对象
     * @returns 客户端IP地址
     */
    private static getClientIp(req: Request): string {
        // 优先使用Eo-Client-Ip头部
        if (req.headers["Eo-Client-Ip"]) {
            return req.headers["Eo-Client-Ip"] as string;
        }
        // 如果Eo-Client-Ip不存在，尝试从X-Forwarded-For头部获取
        const xForwardedFor = req.headers["x-forwarded-for"] as string;
        if (xForwardedFor) {
            // X-Forwarded-For可能包含多个IP，以逗号分隔，取第一个IP
            const ipList = xForwardedFor.split(",");
            return ipList[0].trim();
        }
        // 其次使用标准的req.ip
        if (req.ip) {
            return req.ip;
        }
        // 最后使用socket.remoteAddress
        if (req.socket && req.socket.remoteAddress) {
            return req.socket.remoteAddress;
        }
        // 如果都获取不到，返回未知
        return "unknown";
    }

    /**
     * 记录404错误日志
     * @param req Express请求对象
     */
    public static logNotFound(req: Request): void {
        const ip = this.getClientIp(req);

        Logger.warn("Main", "NotFound", "请求的接口不存在", {
            url: req.url,
            method: req.method,
            ip,
        });
    }
}
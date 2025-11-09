import { Request, Response } from "express";
import { Logger } from "../logger";

/**
 * 请求日志服务类
 * 专门处理HTTP请求相关的日志记录
 */
export class RequestLogService {
    /**
     * 记录请求开始日志
     * @param req Express请求对象
     */
    public static logRequestStart(req: Request): void {
        const requestId = this.getRequestId(req);
        (req as any).requestId = requestId;

        Logger.info("Main", "RequestStart", `收到 ${req.method} ${req.path} 请求`, {
            requestId,
            url: req.url,
            userAgent: req.get("User-Agent"),
            ip: this.getClientIp(req),
        });
    }

    /**
     * 记录请求结束日志
     * @param req Express请求对象
     * @param res Express响应对象
     */
    public static logRequestEnd(req: Request, res: Response): void {
        const duration = this.getDuration(req);
        const ip = this.getClientIp(req);
        const userId = (req as any).userId || "anonymous";
        const requestId = this.getRequestId(req);

        Logger.info(
            "Main",
            "RequestEnd",
            `${req.method} ${req.path} 请求处理完成`,
            {
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                userAgent: req.get("User-Agent"),
                ip,
                requestId,
                userId,
            },
        );

        // 记录审计日志
        Logger.audit(
            req.method,
            "API_REQUEST",
            res.statusCode < 400 ? "SUCCESS" : "FAILED",
            `${req.method} ${req.path} 请求处理${res.statusCode < 400 ? "成功" : "失败"}`,
            {
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                ip,
                requestId,
                userId,
            },
        );
    }

    /**
     * 获取或生成请求ID
     * @param req Express请求对象
     * @returns 请求ID
     */
    private static getRequestId(req: Request): string {
        return (
            (req.headers["x-request-id"] as string) ||
            (req.headers["x-correlation-id"] as string) ||
            require("crypto").randomBytes(16).toString("hex")
        );
    }

    /**
     * 获取客户端真实IP地址
     * 优先使用阿里云CDN的Ali-Cdn-Real-Ip头部
     * @param req Express请求对象
     * @returns 客户端IP地址
     */
    private static getClientIp(req: Request): string {
        // 优先使用阿里云CDN的Ali-Cdn-Real-Ip头部
        if (req.headers['ali-cdn-real-ip']) {
            return req.headers['ali-cdn-real-ip'] as string;
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
        return 'unknown';
    }

    /**
     * 计算请求处理时长
     * @param req Express请求对象
     * @returns 处理时长（毫秒）
     */
    private static getDuration(req: Request): number {
        const startTime: number = (req as any).startTime || Date.now();
        return Date.now() - startTime;
    }

    /**
     * 设置请求开始时间
     * @param req Express请求对象
     */
    public static setRequestStartTime(req: Request): void {
        (req as any).startTime = Date.now();
    }
}
import { Request } from "express";

/**
 * IP 工具类
 * 提供获取客户端真实IP地址的功能
 */
export class IpUtil {
    /**
     * 获取客户端真实IP地址
     * 优先使用阿里云CDN的Eo-Client-Ip头部（Node.js会将其规范化为小写）
     * @param req Express请求对象
     * @returns 客户端IP地址
     */
    public static getClientIp(req: Request): string {
        // 优先使用Eo-Client-Ip头部（Node.js会将其规范化为小写形式eo-client-ip）
        if (req.headers["eo-client-ip"]) {
            return req.headers["eo-client-ip"] as string;
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
}
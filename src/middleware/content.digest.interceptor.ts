// Content-Digest 头部拦截器，用于为响应添加 Content-Digest 头部
import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { Logger } from "../logger";

/**
 * 计算响应内容的摘要
 * @param content - 响应内容
 * @param algorithm - 摘要算法 (sha-256, sha-512等)
 * @returns base64编码的摘要值
 */
const calculateDigest = (content: string | Buffer, algorithm: string = "sha-256"): string => {
    const hash = createHash(algorithm.replace("-", ""));
    hash.update(content);
    return hash.digest("base64");
};

/**
 * Content-Digest 头部拦截器中间件
 * 用于为响应添加 Content-Digest 头部，提供响应内容的完整性校验
 * @param req - Express请求对象
 * @param res - Express响应对象
 * @param next - Express next函数
 */
export const contentDigestInterceptor = (req: Request, res: Response, next: NextFunction) => {
    // 保存原始的 send 和 end 方法
    const originalSend = res.send;
    const originalEnd = res.end;
    
    // 用于存储响应数据
    let responseData: string | Buffer | undefined;
    
    // 重写 send 方法以捕获响应数据
    res.send = function (data?: any): any {
        responseData = data;
        return originalSend.call(this, data);
    };
    
    // 重写 end 方法以在发送响应前添加 Content-Digest 头部
    const patchedEnd = function (chunk?: any, encoding?: any, callback?: any): any {
        // 如果有响应数据，则计算摘要并添加头部
        if (responseData !== undefined) {
            try {
                const digestValue = calculateDigest(responseData);
                res.setHeader("Content-Digest", `sha-256=:${digestValue}:`);
                
                // 记录 Content-Digest 设置操作
                Logger.info("ContentDigestInterceptor", "setDigest", "已设置 Content-Digest 头部", {
                    url: req.url,
                    method: req.method,
                    requestId: (req as any).requestId || "unknown",
                });
            } catch (error) {
                Logger.error("ContentDigestInterceptor", "setDigest", "计算 Content-Digest 失败", {
                    url: req.url,
                    method: req.method,
                    error: (error as Error).message,
                    requestId: (req as any).requestId || "unknown",
                });
            }
        }
        
        // 恢复原始的 end 方法并调用
        res.end = originalEnd;
        return res.end(chunk, encoding, callback);
    };
    
    // 替换 end 方法
    res.end = patchedEnd as any;
    
    next();
};
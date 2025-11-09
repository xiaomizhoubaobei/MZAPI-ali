import { Request, Response, NextFunction } from "express";
import { Logger } from "../logger";

/**
 * Server-Timing 拦截器中间件
 * 用于测量请求处理时间并将其添加到 Server-Timing 响应头部
 * Server-Timing 标头允许服务器传递与请求处理相关的服务器定时指标
 * 语法: Server-Timing: metric1;dur=100.0, metric2;dur=200.0;desc="metric description"
 * @param req - Express请求对象
 * @param res - Express响应对象
 * @param next - Express next函数
 */
export const serverTimingInterceptor = (req: Request, res: Response, next: NextFunction) => {
  // 记录请求开始时间
  const startTime = process.hrtime();

  // 保存原始的 res.end 方法
  const originalEnd = res.end;

  // 重写 res.end 方法以在响应发送前添加 Server-Timing 头部
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    // 计算请求处理时间
    const elapsedHrTime = process.hrtime(startTime);
    const elapsedTimeInMs = (elapsedHrTime[0] * 1000) + (elapsedHrTime[1] / 1000000);

    // 构建 Server-Timing 头部值
    const serverTimingHeader = `total;dur=${elapsedTimeInMs.toFixed(2)}`;
    
    // 添加 Server-Timing 响应头部
    res.setHeader("Server-Timing", serverTimingHeader);

    // 记录 Server-Timing 信息
    Logger.info("ServerTimingInterceptor", "addTimingHeader", "已添加 Server-Timing 响应头部", {
      url: req.url,
      method: req.method,
      duration: `${elapsedTimeInMs.toFixed(2)}ms`,
      requestId: (req as any).requestId || "unknown",
    });

    // 调用原始的 res.end 方法
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};
import express = require("express");
import { Request, Response } from "express";
import cors = require("cors");
import path = require("path");
import { CartoonizeModule } from "./module/cartoonize.module";
import { Logger } from "./logger";

const app: express.Application = express();
const PORT = process.env.PORT || 3000;

// 创建模块实例
const cartoonizeModule = new CartoonizeModule();
const cartoonizeController = cartoonizeModule.getController();

// 中间件
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 用于服务上传的文件
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 主页路由
app.get("/", (req: Request, res: Response) => {
    cartoonizeController.getApiInfo(req, res);
});

// 图像卡通化API路由
app.post("/api/modelscope/cartoonize", async (req: Request, res: Response) => {
    await cartoonizeController.cartoonizeImage(req, res);
});

// 请求日志中间件
app.use((req: Request, res: Response, next: express.NextFunction) => {
    const startTime = Date.now();
    const requestId =
        (req.headers["x-request-id"] as string) ||
        (req.headers["x-correlation-id"] as string) ||
        require("crypto").randomBytes(16).toString("hex");

    // 将requestId添加到请求对象中，供后续使用
    (req as any).requestId = requestId;

    // 记录请求开始
    Logger.info("Main", "RequestStart", `收到 ${req.method} ${req.path} 请求`, {
        requestId,
        url: req.url,
        userAgent: req.get("User-Agent"),
        ip: req.ip || req.socket.remoteAddress,
    });

    // 在响应结束时记录日志
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const ip = req.ip || req.socket.remoteAddress;
        const userId = (req as any).userId || "anonymous";

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
    });

    next();
});

// 错误处理中间件
app.use(
    (
        error: Error,
        req: Request,
        res: Response,
        _next: express.NextFunction,
    ) => {
        const ip = req.ip || req.socket.remoteAddress;

        Logger.error("Main", "ErrorHandler", "【应用层】捕获未处理的错误", {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            ip,
        });

        res.status(500).json({
            error: "服务器内部错误",
            message: "系统发生未知错误，请稍后再试",
            code: "INTERNAL_ERROR",
            timestamp: new Date().toISOString(),
        });
    },
);

// 404处理 - 在所有路由之后，作为兜底处理
app.use((req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress;

    Logger.warn("Main", "NotFound", "请求的接口不存在", {
        url: req.url,
        method: req.method,
        ip,
    });

    res.status(404).json({
        error: "请求的接口不存在",
        message: "请检查您的请求路径是否正确",
        code: "NOT_FOUND",
        timestamp: new Date().toISOString(),
    });
});

// 启动服务器
const server = app.listen(PORT, () => {
    Logger.info("Main", "ServerStart", `🚀 API服务正在端口 ${PORT} 上运行`);
    Logger.info("Main", "ServerStart", "✅ 服务启动成功，等待请求...");
    Logger.info("Main", "ServerStart", "🔧 服务器配置信息:", {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
    });
});

// 处理服务器启动的Promise，避免未处理的Promise警告
server.on("error", (error) => {
    Logger.error("Main", "ServerStart", "【应用层】服务器启动失败", {
        error: error.message,
    });
});

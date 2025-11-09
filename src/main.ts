import express = require("express");
import cors = require("cors");
import { Logger } from "./logger";
import {

    headerInterceptor,

    contentDigestInterceptor,

    contentEncodingInterceptor,

    requestLoggerMiddleware,

    serverTimingInterceptor,

    errorHandlerMiddleware,

    notFoundMiddleware

} from "./middleware";
import { HttpMethodRestrictMiddleware } from "./middleware";
import appRouter from "./routes";

const app: express.Application = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Server-Timing 拦截器 - 必须在所有中间件之前添加，以测量整个请求处理时间
app.use(serverTimingInterceptor);

// 自定义头部拦截器 - 必须在路由处理之前添加
app.use(headerInterceptor);

// 请求日志中间件
app.use(requestLoggerMiddleware);

// 限制所有以/api开头的路径只允许POST方法
app.use(HttpMethodRestrictMiddleware.restrictApiPathToPost());

// API路由
app.use("/", appRouter);

// Content-Digest 拦截器 - 必须在路由处理之后添加
app.use(contentDigestInterceptor);

// Content-Encoding 拦截器 - 必须在路由处理之后添加
app.use(contentEncodingInterceptor);

// 错误处理中间件
app.use(errorHandlerMiddleware);

// 404处理 - 在所有路由之后，作为兜底处理
app.use(notFoundMiddleware);

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
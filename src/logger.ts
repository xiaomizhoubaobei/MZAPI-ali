import * as winston from "winston";
import * as path from "path";
import "winston-daily-rotate-file";

// 定义日志级别
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

// 创建日志格式
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const logData = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...(Object.keys(meta).length > 0 && { meta }),
            ...(stack && { stack }),
        };
        return JSON.stringify(logData);
    }),
);

// 创建审计日志格式（包含更多审计信息）
const auditLogFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
        ({
            timestamp,
            level,
            message,
            userId,
            requestId,
            ip,
            module,
            method,
            action,
            resource,
            status,
            ...meta
        }) => {
            const logData = {
                timestamp,
                level: level.toUpperCase(),
                module,
                method,
                action,
                resource,
                status,
                message,
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
                ...(Object.keys(meta).length > 0 && { meta }),
            };
            return JSON.stringify(logData);
        },
    ),
);

// 创建日志目录
path.join(__dirname, "../logs");
// 创建 Winston 日志记录器实例
const logger = winston.createLogger({
    levels,
    level: "debug",
    format: logFormat,
    transports: [
        // 控制台输出
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ],
});

// 创建审计日志记录器实例
const auditLogger = winston.createLogger({
    levels,
    level: "info",
    format: auditLogFormat,
    transports: [
        // 控制台输出
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ],
});

export interface LogMeta {
    userId?: string;
    requestId?: string;
    ip?: string;
    module?: string;
    method?: string;
    action?: string;
    resource?: string;
    status?: string;
    [key: string]: any;
}
class Logger {
    static info(message: string, meta?: LogMeta): void;
    static info(
        module: string,
        method: string,
        message: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void;
    static info(
        arg1: string,
        arg2?: string | LogMeta,
        arg3?: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void {
        if (typeof arg2 === "object") {
            // 新的调用方式：info(message, meta)
            logger.info(arg1, arg2);
        } else {
            // 兼容旧的调用方式：info(module, method, message, ...)
            const module = arg1;
            const method = arg2 as string;
            const message = arg3 || "";

            logger.info(message, {
                module,
                method,
                ...(data && { data }),
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
            });

            // 同时记录到审计日志（仅记录重要操作）
            if (module !== "Main" && method !== "Request") {
                auditLogger.info(message, {
                    module,
                    method,
                    ...(data && { data }),
                    ...(userId && { userId }),
                    ...(requestId && { requestId }),
                    ...(ip && { ip }),
                });
            }
        }
    }
    static warn(
        module: string,
        method: string,
        message: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void;
    static warn(
        arg1: string,
        arg2?: string | LogMeta,
        arg3?: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void {
        if (typeof arg2 === "object") {
            // 新的调用方式：warn(message, meta)
            logger.warn(arg1, arg2);
        } else {
            // 兼容旧的调用方式：warn(module, method, message, ...)
            const module = arg1;
            const method = arg2 as string;
            const message = arg3 || "";

            logger.warn(message, {
                module,
                method,
                ...(data && { data }),
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
            });

            // 同时记录到审计日志
            auditLogger.warn(message, {
                module,
                method,
                ...(data && { data }),
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
            });
        }
    }

    static error(message: string, meta?: LogMeta): void;
    static error(
        module: string,
        method: string,
        message: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void;
    static error(
        arg1: string,
        arg2?: string | LogMeta,
        arg3?: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void {
        if (typeof arg2 === "object") {
            // 新的调用方式：error(message, meta)
            logger.error(arg1, arg2);
        } else {
            // 兼容旧的调用方式：error(module, method, message, ...)
            const module = arg1;
            const method = arg2 as string;
            const message = arg3 || "";

            logger.error(message, {
                module,
                method,
                ...(data && { data }),
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
            });

            // 同时记录到审计日志
            auditLogger.error(message, {
                module,
                method,
                ...(data && { data }),
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
            });
        }
    }

    static debug(message: string, meta?: LogMeta): void;
    static debug(
        module: string,
        method: string,
        message: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void;
    static debug(
        arg1: string,
        arg2?: string | LogMeta,
        arg3?: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void {
        if (typeof arg2 === "object") {
            // 新的调用方式：debug(message, meta)
            logger.debug(arg1, arg2);
        } else {
            // 兼容旧的调用方式：debug(module, method, message, ...)
            const module = arg1;
            const method = arg2 as string;
            const message = arg3 || "";

            logger.debug(message, {
                module,
                method,
                ...(data && { data }),
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
            });
        }
    }

    /**
     * 记录审计日志的专用方法
     * @param action 操作类型（如：CREATE, UPDATE, DELETE, LOGIN等）
     * @param resource 操作资源（如：USER, IMAGE, TASK等）
     * @param status 操作状态（如：SUCCESS, FAILED, PENDING等）
     * @param message 操作描述
     * @param meta 其他元数据
     */
    static audit(
        action: string,
        resource: string,
        status: string,
        message: string,
        meta?: Omit<LogMeta, "action" | "resource" | "status">,
    ): void {
        auditLogger.info(message, {
            action,
            resource,
            status,
            ...meta,
        });
    }
}

export { logger, auditLogger, Logger };

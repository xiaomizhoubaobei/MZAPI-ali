import * as winston from "winston";
import * as path from "path";
import "winston-daily-rotate-file";

// 日志级别定义
export const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

// 通用日志格式
export const logFormat = winston.format.combine(
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

// 审计日志格式
export const auditLogFormat = winston.format.combine(
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

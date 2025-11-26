import * as winston from "winston";
import {
    logLevels,
    auditLogFormat,
} from "../config/log.config";

/**
 * 审计日志记录器实例
 * 专门用于记录用户操作、系统事件等审计信息
 * 配置了审计专用的日志格式和级别
 */
export const auditLogger = winston.createLogger({
    levels: logLevels,
    level: "info",
    format: auditLogFormat,
    transports: [
        // 控制台输出
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        })
    ],
});

/**
 * 获取带有上下文信息的审计日志记录器实例
 * @param context 上下文标识，用于区分不同模块的审计日志
 * @returns 带有上下文信息的子审计日志记录器实例
 */
export const getAuditLogger = (context: string) => {
    return auditLogger.child({ context });
};

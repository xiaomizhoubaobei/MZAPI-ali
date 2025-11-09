import * as winston from "winston";
import {
    logLevels,
    auditLogFormat,
} from "../config/log.config";

// 创建审计日志记录器实例
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

// 用于在应用不同部分获取特定的审计记录器实例
export const getAuditLogger = (context: string) => {
    return auditLogger.child({ context });
};

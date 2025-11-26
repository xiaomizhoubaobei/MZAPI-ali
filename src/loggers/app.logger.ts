import * as winston from "winston";
import { logLevels, logFormat } from "../config/log.config";

/**
 * 应用日志记录器实例
 * 配置了日志级别、格式和控制台输出
 */
export const appLogger = winston.createLogger({
    levels: logLevels,
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

/**
 * 获取带有上下文信息的日志记录器实例
 * @param context 上下文标识，用于区分不同模块的日志
 * @returns 带有上下文信息的子日志记录器实例
 */
export const getAppLogger = (context: string) => {
    return appLogger.child({ context });
};

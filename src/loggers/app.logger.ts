import * as winston from "winston";
import { logLevels, logFormat } from "../config/log.config";

// 创建应用日志记录器实例
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

// 用于在应用不同部分获取特定的记录器实例
export const getAppLogger = (context: string) => {
    return appLogger.child({ context });
};

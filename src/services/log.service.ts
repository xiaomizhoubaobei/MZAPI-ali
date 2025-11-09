import { Logger } from "winston";
import {appLogger, getAppLogger} from "../loggers/app.logger";
import {auditLogger, getAuditLogger} from "../loggers/audit.logger";

// 日志元数据接口
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

// 日志服务类 - 封装所有日志功能
export class LogService {
    private appLogger: Logger;
    private auditLogger: Logger;

    constructor(context?: string) {
        this.appLogger = context ? getAppLogger(context) : appLogger;
        this.auditLogger = context ? getAuditLogger(context) : auditLogger;
    }

    /**
     * 记录信息日志
     * @param message 日志消息
     * @param meta 日志元数据
     */
    info(message: string, meta?: LogMeta): void;
    info(
        module: string,
        method: string,
        message: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void;
    info(
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
            this.appLogger.info(arg1, arg2);
        } else {
            // 兼容旧的调用方式：info(module, method, message, ...)
            const module = arg1;
            const method = arg2 as string;
            const message = arg3 || "";

            this.appLogger.info(message, {
                module,
                method,
                ...(data && { data }),
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
            });

            // 同时记录到审计日志（仅记录重要操作）
            if (module !== "Main" && method !== "Request") {
                this.auditLogger.info(message, {
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
    warn(
        module: string,
        method: string,
        message: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void;
    warn(
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
            this.appLogger.warn(arg1, arg2);
        } else {
            // 兼容旧的调用方式：warn(module, method, message, ...)
            const module = arg1;
            const method = arg2 as string;
            const message = arg3 || "";

            this.appLogger.warn(message, {
                module,
                method,
                ...(data && { data }),
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
            });

            // 同时记录到审计日志
            this.auditLogger.warn(message, {
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
     * 记录错误日志
     * @param message 日志消息
     * @param meta 日志元数据
     */
    error(message: string, meta?: LogMeta): void;
    error(
        module: string,
        method: string,
        message: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void;
    error(
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
            this.appLogger.error(arg1, arg2);
        } else {
            // 兼容旧的调用方式：error(module, method, message, ...)
            const module = arg1;
            const method = arg2 as string;
            const message = arg3 || "";

            this.appLogger.error(message, {
                module,
                method,
                ...(data && { data }),
                ...(userId && { userId }),
                ...(requestId && { requestId }),
                ...(ip && { ip }),
            });

            // 同时记录到审计日志
            this.auditLogger.error(message, {
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
     * 记录调试日志
     * @param message 日志消息
     * @param meta 日志元数据
     */
    debug(message: string, meta?: LogMeta): void;
    debug(
        module: string,
        method: string,
        message: string,
        data?: any,
        userId?: string,
        requestId?: string,
        ip?: string,
    ): void;
    debug(
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
            this.appLogger.debug(arg1, arg2);
        } else {
            // 兼容旧的调用方式：debug(module, method, message, ...)
            const module = arg1;
            const method = arg2 as string;
            const message = arg3 || "";

            this.appLogger.debug(message, {
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
    audit(
        action: string,
        resource: string,
        status: string,
        message: string,
        meta?: Omit<LogMeta, "action" | "resource" | "status">,
    ): void {
        this.auditLogger.info(message, {
            action,
            resource,
            status,
            ...meta,
        });
    }
}

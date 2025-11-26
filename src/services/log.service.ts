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

            // 对敏感信息操作进行审计日志记录
            if (this.isSensitiveOperation(module, method, data)) {
                this.audit(
                    "READ",
                    "SENSITIVE_DATA",
                    "SUCCESS",
                    `访问敏感信息: ${message}`,
                    {
                        module,
                        method,
                        userId,
                        requestId,
                        ip,
                    }
                );
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

            // 对潜在安全风险操作进行审计日志记录
            if (this.isSecurityRelevantOperation(module, method, data)) {
                this.audit(
                    "SECURITY_WARNING",
                    "SYSTEM_SECURITY",
                    "WARNING",
                    `安全相关警告: ${message}`,
                    {
                        module,
                        method,
                        userId,
                        requestId,
                        ip,
                    }
                );
            }
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

            // 对错误和安全相关操作进行审计日志记录
            if (this.isCriticalError(module, method, data)) {
                this.audit(
                    "SYSTEM_ERROR",
                    "APPLICATION_SECURITY",
                    "FAILED",
                    `关键错误: ${message}`,
                    {
                        module,
                        method,
                        userId,
                        requestId,
                        ip,
                    }
                );
            }
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
     * 判断是否为敏感信息操作
     * @param module 模块名称
     * @param method 方法名称
     * @param data 数据内容
     * @returns 是否为敏感操作
     */
    private isSensitiveOperation(module: string, method: string, data?: any): boolean {
        const sensitiveModules = ["UserController", "AuthService", "AdminController"];
        const sensitiveMethods = ["login", "register", "updateProfile", "changePassword"];
        const sensitiveKeywords = ["password", "token", "secret", "key", "credential"];
        
        if (sensitiveModules.includes(module) || sensitiveMethods.includes(method)) {
            return true;
        }
        
        if (data && typeof data === 'object') {
            const dataStr = JSON.stringify(data).toLowerCase();
            return sensitiveKeywords.some(keyword => dataStr.includes(keyword));
        }
        
        return false;
    }

    /**
     * 判断是否为安全相关操作
     * @param module 模块名称
     * @param method 方法名称
     * @param data 数据内容
     * @returns 是否为安全相关操作
     */
    private isSecurityRelevantOperation(module: string, method: string, data?: any): boolean {
        const securityModules = ["SecurityService", "AuthController", "Middleware"];
        const securityMethods = ["authenticate", "authorize", "validate", "sanitize"];
        const securityKeywords = ["unauthorized", "forbidden", "invalid", "suspicious"];
        
        if (securityModules.includes(module) || securityMethods.includes(method)) {
            return true;
        }
        
        if (data && typeof data === 'object') {
            const dataStr = JSON.stringify(data).toLowerCase();
            return securityKeywords.some(keyword => dataStr.includes(keyword));
        }
        
        return false;
    }

    /**
     * 判断是否为关键错误
     * @param module 模块名称
     * @param method 方法名称
     * @param data 数据内容
     * @returns 是否为关键错误
     */
    private isCriticalError(module: string, method: string, data?: any): boolean {
        const criticalModules = ["DatabaseService", "PaymentService", "SecurityService"];
        const criticalMethods = ["processPayment", "deleteData", "systemShutdown"];
        const criticalKeywords = ["crash", "fatal", "critical", "exception", "breach"];
        
        if (criticalModules.includes(module) || criticalMethods.includes(method)) {
            return true;
        }
        
        if (data && typeof data === 'object') {
            const dataStr = JSON.stringify(data).toLowerCase();
            return criticalKeywords.some(keyword => dataStr.includes(keyword));
        }
        
        return false;
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

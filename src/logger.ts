import { LogService, LogMeta } from "./services/log.service";

import { appLogger } from "./loggers/app.logger";

import { auditLogger } from "./loggers/audit.logger";



// 保持向后兼容的全局日志实例

const globalLogService = new LogService();



// 保持向后兼容的静态方法

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

        globalLogService.info(arg1 as any, arg2 as any, arg3, data, userId, requestId, ip);

    }



    static warn(message: string, meta?: LogMeta): void;

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

        globalLogService.warn(arg1 as any, arg2 as any, arg3, data, userId, requestId, ip);

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

        globalLogService.error(arg1 as any, arg2 as any, arg3, data, userId, requestId, ip);

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

        globalLogService.debug(arg1 as any, arg2 as any, arg3, data, userId, requestId, ip);

    }



    static audit(

        action: string,

        resource: string,

        status: string,

        message: string,

        meta?: Omit<LogMeta, "action" | "resource" | "status">,

    ): void {

        globalLogService.audit(action, resource, status, message, meta);

    }
}



export { Logger, LogMeta, appLogger, auditLogger, LogService };

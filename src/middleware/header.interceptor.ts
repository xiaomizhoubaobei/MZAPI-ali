// 自定义头部拦截器，用于覆盖默认的X-Powered-By头部并添加CDN标识
import { Request, Response, NextFunction } from "express";
import { Logger } from "../logger";

// 定义路径到服务名称的映射
const PATH_TO_SERVICE_NAME: { [key: string]: string } = {
    "/": "MZAPI-Info-Service",
    "/api/modelscope/*": "MZAPI-modelscope-Service",
};

/**
 * 根据请求路径获取对应的服务名称
 * @param path - 请求路径
 * @returns 服务名称
 */
const getServiceNameByPath = (path: string): string => {
    // 精确匹配
    if (PATH_TO_SERVICE_NAME[path]) {
        return PATH_TO_SERVICE_NAME[path];
    }

    // 通配符匹配
    for (const [routePath, serviceName] of Object.entries(PATH_TO_SERVICE_NAME)) {
        if (routePath.endsWith("/*") && path.startsWith(routePath.slice(0, -2))) {
            return serviceName;
        }
    }

    // 如果没有找到精确匹配，返回默认服务名称
    return "MZAPI-Service";
};

/**
 * 自定义头部拦截器中间件
 * 用于覆盖默认的X-Powered-By头部、添加CDN标识以及其他安全相关头部
 * @param req - Express请求对象
 * @param res - Express响应对象
 * @param next - Express next函数
 */
export const headerInterceptor = (req: Request, res: Response, next: NextFunction) => {
    // 覆盖默认的X-Powered-By头部
    res.setHeader("X-Powered-By", "MZAPI-Service");

    // 根据请求路径动态设置服务名称
    const serviceName = getServiceNameByPath(req.path);

    // 去掉serviceName中的MZAPI-部分
    const serviceIdentifier = serviceName.replace("MZAPI-", "");

    res.setHeader("X-Service-Name", serviceName);
    res.setHeader("X-Service-Version", "1.0.0");
    res.setHeader("X-Service-Environment", process.env.NODE_ENV || "production");
    res.setHeader("Service", serviceIdentifier);

    // CDN相关头部 - 标识API正在使用TencentEdgeOne
    res.setHeader("X-Cdn-Provider", "TencentEdgeOne");
    res.setHeader("X-Cdn-Timestamp", new Date().toISOString());

    // 生成或获取请求ID
    const requestId = req.headers["x-fc-request-id"];
    if (requestId) {
        res.setHeader("X-Cdn-Request-Id", requestId as string);
    }

    // 安全相关头部
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    // 记录头部设置操作
    Logger.info("HeaderInterceptor", "setHeaders", "已设置自定义响应头部", {
        url: req.url,
        method: req.method,
        service: serviceIdentifier,
        requestId: (req as any).requestId || "unknown",
    });

    next();
};
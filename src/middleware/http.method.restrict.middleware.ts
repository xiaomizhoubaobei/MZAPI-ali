import { Request, Response, NextFunction } from "express";

/**
 * HTTP方法限制中间件
 * 用于限制特定路径只允许指定的HTTP方法
 */
export class HttpMethodRestrictMiddleware {
    /**
     * 限制所有以/api开头的路径只允许POST方法
     */
    static restrictApiPathToPost() {
        return (req: Request, res: Response, next: NextFunction) => {
            // 检查请求路径是否以/api开头
            if (req.path.startsWith('/api')) {
                // 检查请求方法是否为POST
                if (req.method !== 'POST') {
                    return res.status(405).json({
                        error: "Method Not Allowed",
                        message: `The HTTP method ${req.method} is not allowed for API endpoints. Only POST is allowed for /api paths.`,
                        statusCode: 405
                    });
                }
            }
            next();
        };
    }
}
import { Request, Response, NextFunction } from "express";
import { CartoonizeModelType } from "../service";
import { Logger } from "../logger";

/**
 * 验证模型类型的中间件
 * @param req Express请求对象
 * @param res Express响应对象
 * @param next 下一个中间件函数
 */
export function validateModelType(req: Request, res: Response, next: NextFunction): void {
    const modelType = req.params.model_type as CartoonizeModelType;
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const requestId = (req.headers["x-fc-request-id"] as string) || undefined;
    const userAgent = req.get("user-agent");

    Logger.info("ModelTypeValidationMiddleware", "validateModelType", "开始验证模型类型", {
        method: req.method,
        url: req.url,
        modelType,
        ip,
        userAgent,
        requestId,
    });

    // 支持的模型类型列表
    const validModelTypes: readonly CartoonizeModelType[] = ["3D", "HANDDRAWN", "SKETCH"] as const;

    // 检查模型类型是否有效
    if (!modelType || !validModelTypes.includes(modelType)) {
        Logger.warn("ModelTypeValidationMiddleware", "validateModelType", "无效的模型类型", {
            providedModelType: modelType,
            validModelTypes,
            ip,
            requestId,
        });

        res.status(400).json({
            error: "无效的模型类型",
            code: "INVALID_MODEL_TYPE",
            providedModelType: modelType || "undefined",
            supportedTypes: validModelTypes,
            usage: "请使用以下端点之一: /api/modelscope/cartoonize/3D, /api/modelscope/cartoonize/HANDDRAWN, /api/modelscope/cartoonize/SKETCH",
            timestamp: new Date().toISOString(),
        });
        return;
    }

    // 将验证后的模型类型添加到请求对象中
    (req as any).validatedModelType = modelType;

    Logger.info("ModelTypeValidationMiddleware", "validateModelType", "模型类型验证通过", {
        modelType,
        ip,
        requestId,
    });

    next();
}
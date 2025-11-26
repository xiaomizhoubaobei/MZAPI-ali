import { Request, Response } from "express";
import { CartoonizeService, CartoonizeModelType } from "../service";
import { CartoonizeDto } from "../dto";
import { Logger } from "../logger";
import { IpUtil } from "../utils";

/**
 * 卡通化控制器
 * 处理图像卡通化相关的HTTP请求
 */
export class CartoonizeController {
    private readonly cartoonizeService: CartoonizeService;

    /**
     * 构造函数 - 初始化卡通化控制器
     * @param cartoonizeService 卡通化服务实例，可选参数，用于依赖注入
     */
    constructor(cartoonizeService?: CartoonizeService) {
        if (cartoonizeService) {
            this.cartoonizeService = cartoonizeService;
        } else {
            this.cartoonizeService = new CartoonizeService();
        }
    }

    /**
     * 通用图像卡通化处理接口
     * @param req Express请求对象
     * @param res Express响应对象
     */
    async cartoonizeImage(req: Request, res: Response): Promise<void> {
        // 使用中间件验证过的模型类型
        const modelType = (req as any).validatedModelType as CartoonizeModelType;
        
        // 根据模型类型设置显示名称
        const modelTypeNames = {
            "3D": "3D卡通化",
            "HANDDRAWN": "手绘卡通化",
            "SKETCH": "素描卡通化"
        };

        const processName = `图像${modelTypeNames[modelType]}`;
        const methodName = `cartoonizeImage${modelType}`;
        
        await this.processImageRequest(req, res, methodName, processName, modelType);
    }

    /**
     * 处理图像卡通化请求的核心逻辑
     * @param req Express请求对象
     * @param res Express响应对象
     * @param methodName 方法名称，用于日志记录
     * @param processName 处理名称，用于用户提示
     * @param modelType 模型类型
     */
    private async processImageRequest(
        req: Request,
        res: Response,
        methodName: string,
        processName: string,
        modelType: CartoonizeModelType
    ): Promise<void> {
        const ip = IpUtil.getClientIp(req);
        const requestId = (req.headers["x-fc-request-id"] as string) || undefined;
        const userAgent = req.get("user-agent");
        const userId = (req as any).userId || "anonymous";

        Logger.info(
            "CartoonizeController",
            methodName,
            `收到${processName}请求`,
            {
                method: req.method,
                url: req.url,
                ip,
                userAgent,
                requestId,
                userId,
            }
        );

        try {
            // 使用验证中间件验证过的imageUrl
            const imageUrl = (req as any).validatedImageUrl || (req.body as CartoonizeDto).imageUrl;

            // 双重验证：如果验证中间件没有提供imageUrl，则进行基本验证
            if (!imageUrl) {
                Logger.warn(
                    "CartoonizeController",
                    methodName,
                    "缺少图像URL参数（验证中间件失效）",
                    {
                        ip,
                        requestId,
                        userId,
                    }
                );

                Logger.audit(
                    "CREATE",
                    "IMAGE_TASK",
                    "FAILED",
                    `${processName}请求失败：缺少图像URL参数`,
                    {
                        ip,
                        requestId,
                        userId,
                    }
                );

                res.status(400).json({
                    error: "图像URL是必需的",
                    code: "MISSING_IMAGE_URL",
                });
                return;
            }

            Logger.info(
                "CartoonizeController",
                methodName,
                "开始处理图像",
                {
                    imageUrl: imageUrl?.substring(0, 50) + "...",
                    ip,
                    requestId,
                    userId,
                }
            );

            Logger.audit(
                "CREATE",
                "IMAGE_TASK",
                "STARTED",
                `开始${processName}处理`,
                {
                    ip,
                    requestId,
                    userId,
                }
            );

            // 调用服务层处理，实现优雅降级
            let resultUrl: string;
            let retryCount = 0;
            const maxRetries = 2; // 最多重试2次

            while (retryCount <= maxRetries) {
                try {
                    resultUrl = await this.cartoonizeService.cartoonizeImage(
                        imageUrl,
                        modelType,
                        userId,
                        requestId
                    );
                    break; // 成功则跳出重试循环
                } catch (serviceError: any) {
                    retryCount++;
                    
                    Logger.warn(
                        "CartoonizeController",
                        methodName,
                        `服务层处理失败，尝试第${retryCount}次重试`,
                        {
                            error: serviceError.message,
                            retryCount,
                            maxRetries,
                            imageUrl: imageUrl?.substring(0, 50) + "...",
                            ip,
                            requestId,
                            userId,
                        }
                    );

                    if (retryCount > maxRetries) {
                        // 所有重试都失败，实现优雅降级
                        Logger.error(
                            "CartoonizeController",
                            methodName,
                            `${processName}处理失败，所有重试都已用尽`,
                            {
                                error: serviceError.message,
                                totalRetries: maxRetries,
                                imageUrl: imageUrl?.substring(0, 50) + "...",
                                ip,
                                requestId,
                                userId,
                            }
                        );

                        Logger.audit(
                            "CREATE",
                            "IMAGE_TASK",
                            "FAILED",
                            `${processName}处理失败：所有重试都已用尽`,
                            {
                                ip,
                                requestId,
                                userId,
                            }
                        );

                        // 优雅降级：返回原始URL和错误信息
                        res.status(200).json({
                            success: false,
                            originalUrl: imageUrl,
                            cartoonizedUrl: null,
                            fallbackUrl: imageUrl, // 降级方案：返回原始URL
                            timestamp: new Date().toISOString(),
                            message: `${processName}处理失败，返回原始图像`,
                            error: serviceError.message,
                            retryAttempts: maxRetries,
                        });
                        return;
                    }

                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            Logger.info(
                "CartoonizeController",
                methodName,
                "图像处理完成，准备返回结果给客户端",
                {
                    ip,
                    requestId,
                    userId,
                }
            );

            Logger.audit(
                "CREATE",
                "IMAGE_TASK",
                "SUCCESS",
                `${processName}处理成功`,
                {
                    ip,
                    requestId,
                    userId,
                }
            );

            res.status(200).json({
                success: true,
                originalUrl: imageUrl,
                cartoonizedUrl: resultUrl,
                timestamp: new Date().toISOString(),
                message: `${processName}处理成功`,
            });
        } catch (error: any) {
            Logger.error(
                "CartoonizeController",
                methodName,
                `${processName}过程中发生错误`,
                {
                    error: error.message,
                    stack: error.stack,
                    ip,
                    requestId,
                    userId,
                }
            );

            Logger.audit(
                "CREATE",
                "IMAGE_TASK",
                "FAILED",
                `${processName}处理失败：${error.message}`,
                {
                    ip,
                    requestId,
                    userId,
                }
            );

            if (error instanceof TypeError && error.message.includes("URL")) {
                res.status(400).json({
                    error: "无效的图像URL格式",
                    code: "INVALID_URL_FORMAT",
                });
                return;
            }

            res.status(500).json({
                error: "图像处理失败",
                message: error instanceof Error ? error.message : "发生未知错误",
                code: "PROCESSING_ERROR",
                timestamp: new Date().toISOString(),
            });
        }
    }

    /**
     * 获取API信息接口
     * @param req Express请求对象
     * @param res Express响应对象
     */
    getApiInfo(req: Request, res: Response): void {
        const ip = IpUtil.getClientIp(req);
        const requestId = (req.headers["x-fc-request-id"] as string) || undefined;
        const userId = (req as any).userId || "anonymous";

        Logger.info("CartoonizeController", "getApiInfo", "收到API信息请求", {
            ip,
            requestId,
            userId,
        });

        res.status(200).json({
            message: "图像卡通化API服务",
            endpoints: {
                "POST /api/modelscope/cartoonize/:model_type": "通用图像卡通化端点，支持多种风格"
            },
            modelTypes: {
                "3D": "3D卡通风格",
                "HANDDRAWN": "手绘卡通风格",
                "SKETCH": "素描卡通风格"
            },
            usage: {
                "端点示例": [
                    "POST /api/modelscope/cartoonize/3D",
                    "POST /api/modelscope/cartoonize/HANDDRAWN",
                    "POST /api/modelscope/cartoonize/SKETCH"
                ],
                "请求体": '{"imageUrl": "https://example.com/image.jpg"}',
                "响应示例": '{"success": true, "originalUrl": "...", "cartoonizedUrl": "...", "timestamp": "..."}'
            },
            description: "发送图像URL以获取卡通化版本",
            version: "2.0.0",
            timestamp: new Date().toISOString(),
        });

        Logger.info("CartoonizeController", "getApiInfo", "已返回API信息响应", {
            ip,
            requestId,
            userId,
        });

        Logger.audit("READ", "API_INFO", "SUCCESS", "获取API信息成功", {
            ip,
            requestId,
            userId,
        });
    }
}
import { Request, Response } from "express";
import { CartoonizeService, CartoonizeModelType } from "../service";
import { CartoonizeDto } from "../dto";
import { Logger } from "../logger";
import {IpUtil} from "../utils";

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
     * 图像3D卡通化处理接口
     * @param req Express请求对象
     * @param res Express响应对象
     */
    async cartoonizeImage(req: Request, res: Response): Promise<void> {
        await this.processImageRequest(req, res, "cartoonizeImage", "图像卡通化", "3D");
    }

    /**
     * 图像手绘卡通化处理接口
     * @param req Express请求对象
     * @param res Express响应对象
     */
    async cartoonizeImageHanddrawn(req: Request, res: Response): Promise<void> {
        await this.processImageRequest(req, res, "cartoonizeImageHanddrawn", "图像手绘卡通化", "HANDDRAWN");
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
            const { imageUrl } = req.body as CartoonizeDto;

            // 验证输入
            if (!imageUrl) {
                Logger.warn(
                    "CartoonizeController",
                    methodName,
                    "缺少图像URL参数",
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

            // 简单验证URL格式
            try {
                new URL(imageUrl);
            } catch (urlError) {
                Logger.warn(
                    "CartoonizeController",
                    methodName,
                    "无效的图像URL格式",
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
                    "FAILED",
                    `${processName}请求失败：无效的图像URL格式`,
                    {
                        ip,
                        requestId,
                        userId,
                    }
                );

                res.status(400).json({
                    error: "无效的图像URL格式",
                    code: "INVALID_URL_FORMAT",
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

            // 调用服务层处理
            const resultUrl = await this.cartoonizeService.cartoonizeImage(
                imageUrl,
                modelType,
                userId,
                requestId
            );

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
                "POST /api/modelscope/cv_unet_person-image-cartoon-3d_compound-models": "将图像转换为卡通风格",
                "POST /api/modelscope/cv_unet_person-image-cartoon-handdrawn_compound-models": "将图像转换为手绘卡通风格",
            },
            description: "发送图像URL以获取卡通化版本",
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
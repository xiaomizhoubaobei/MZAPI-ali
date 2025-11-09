import { Request, Response } from "express";
import { CartoonizeService } from "../service/cartoonize.service";
import { CartoonizeDto } from "../dto/cartoonize.dto";
import { Logger } from "../logger";
import {IpUtil} from "../utils/ip.util";

export class CartoonizeController {
    private cartoonizeService: CartoonizeService;

    constructor(cartoonizeService?: CartoonizeService) {
        if (cartoonizeService) {
            this.cartoonizeService = cartoonizeService;
        } else {
            this.cartoonizeService = new CartoonizeService();
        }
    }
    async cartoonizeImage(req: Request, res: Response): Promise<void> {
        const ip = IpUtil.getClientIp(req);
        const requestId = (req.headers["x-fc-request-id"] as string) || undefined;
        const userAgent = req.get("user-agent");
        const userId = (req as any).userId || "anonymous"; // 从请求中获取用户ID，如果没有则为匿名用户

        Logger.info(
            "CartoonizeController",
            "cartoonizeImage",
            "收到图像卡通化请求",
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
                    "cartoonizeImage",
                    "缺少图像URL参数",
                    {
                        ip,
                        requestId,
                        userId,
                    }
                );

                // 记录审计日志
                Logger.audit(
                    "CREATE",
                    "IMAGE_TASK",
                    "FAILED",
                    "图像卡通化请求失败：缺少图像URL参数",
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
                    "cartoonizeImage",
                    "无效的图像URL格式",
                    {
                        imageUrl: imageUrl?.substring(0, 50) + "...", // 只记录URL的前50个字符以保护隐私
                        ip,
                        requestId,
                        userId,
                    }
                );

                // 记录审计日志
                Logger.audit(
                    "CREATE",
                    "IMAGE_TASK",
                    "FAILED",
                    "图像卡通化请求失败：无效的图像URL格式",
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
                "cartoonizeImage",
                "开始处理图像",
                {
                    imageUrl: imageUrl?.substring(0, 50) + "...", // 只记录URL的前50个字符以保护隐私
                    ip,
                    requestId,
                    userId,
                }
            );

            // 记录审计日志 - 开始处理
            Logger.audit(
                "CREATE",
                "IMAGE_TASK",
                "STARTED",
                "开始图像卡通化处理",
                {
                    ip,
                    requestId,
                    userId,
                }
            );

            // 调用服务层处理
            const resultUrl = await this.cartoonizeService.cartoonizeImage(
                imageUrl,
                userId,
                requestId
            );

            Logger.info(
                "CartoonizeController",
                "cartoonizeImage",
                "图像处理完成，准备返回结果给客户端",
                {
                    ip,
                    requestId,
                    userId,
                }
            );

            // 记录审计日志 - 处理成功
            Logger.audit(
                "CREATE",
                "IMAGE_TASK",
                "SUCCESS",
                "图像卡通化处理成功",
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
                message: "图像卡通化处理成功",
            });
        } catch (error: any) {
            Logger.error(
                "CartoonizeController",
                "cartoonizeImage",
                "图像卡通化过程中发生错误",
                {
                    error: error.message,
                    stack: error.stack,
                    ip,
                    requestId,
                    userId,
                }
            );

            // 记录审计日志 - 处理失败
            Logger.audit(
                "CREATE",
                "IMAGE_TASK",
                "FAILED",
                `图像卡通化处理失败：${error.message}`,
                {
                    ip,
                    requestId,
                    userId,
                }
            );

            // 根据错误类型返回不同的状态码
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
            },
            description: "发送图像URL以获取卡通化版本",
            timestamp: new Date().toISOString(),
        });

        Logger.info("CartoonizeController", "getApiInfo", "已返回API信息响应", {
            ip,
            requestId,
            userId,
        });

        // 记录审计日志
        Logger.audit("READ", "API_INFO", "SUCCESS", "获取API信息成功", {
            ip,
            requestId,
            userId,
        });
    }
}
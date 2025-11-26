import axios from "axios";
import { Logger } from "../logger";
import { SecureUrlHandler } from "../utils";

// ModelScope API配置
const MODELS = {
    "3D": "iic/cv_unet_person-image-cartoon-3d_compound-models",
    "HANDDRAWN": "iic/cv_unet_person-image-cartoon-handdrawn_compound-models",
    "SKETCH": "iic/cv_unet_person-image-cartoon-sketch_compound-models"
} as const;

/**
 * 获取ModelScope API的提交和查询URL
 * @param modelKey 模型键名
 * @returns 包含提交和查询URL的对象
 */
const getApiUrls = (modelKey: keyof typeof MODELS) => ({
    submit: `https://modelscope.cn/api/v1/models/${MODELS[modelKey]}/widgets/submit`,
    query: `https://modelscope.cn/api/v1/models/${MODELS[modelKey]}/widgets/query`
});

const headers = {
    "Content-Type": "application/json",
    "bx-v": "2.5.31",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

/**
 * ModelScope API请求载荷接口
 */
interface Payload {
    task: string;
    inputs: string[];
    parameters: Record<string, any>;
    urlPaths: {
        inUrls: { type: string; fileType: string }[];
        outUrls: { outputKey: string; type: string }[];
    };
}

/**
 * ModelScope任务提交响应接口
 */
interface SubmitResponse {
    Code: number;
    Data: {
        id: string;
    };
    Message: string;
    RequestId: string;
    Success: boolean;
}

/**
 * ModelScope任务查询响应接口
 */
interface QueryResponse {
    Code: number;
    Data: {
        code: number;
        status: number;
        data: {
            output_img: string;
        };
    };
    Message: string;
    RequestId: string;
    Success: boolean;
}

/**
 * 卡通化模型类型定义
 */
export type CartoonizeModelType = "3D" | "HANDDRAWN" | "SKETCH";

export class CartoonizeService {
    /**
     * 图像卡通化处理
     * @param imageUrl 图像URL地址
     * @param modelType 卡通化模型类型（"3D"或"HANDDRAWN"）
     * @param userId 用户ID，默认为"anonymous"
     * @param requestId 请求ID，用于日志追踪
     * @returns 处理后的图像URL
     */
    async cartoonizeImage(
        imageUrl: string,
        modelType: CartoonizeModelType,
        userId: string = "anonymous",
        requestId?: string,
    ): Promise<string> {
        // 严格验证modelType以防止日志注入
        const validModelTypes: readonly CartoonizeModelType[] = ["3D", "HANDDRAWN", "SKETCH"] as const;
        if (!validModelTypes.includes(modelType)) {
            const error = new Error(`无效的模型类型: ${modelType}`);
            error.name = "InvalidModelTypeError";
            Logger.error("CartoonizeService", "cartoonizeImage", "无效的模型类型", {
                modelType,
                userId,
                requestId,
            });
            throw error;
        }

        // 安全验证和清理URL
        let safeImageUrl: string;
        try {
            safeImageUrl = SecureUrlHandler.sanitizeAndValidateUrl(imageUrl, requestId);
        } catch (urlError) {
            Logger.error("CartoonizeService", "cartoonizeImage", "URL安全验证失败", {
                originalUrl: imageUrl?.substring(0, 50) + "...",
                error: urlError instanceof Error ? urlError.message : "Unknown error",
                userId,
                requestId,
            });

            // 重新抛出URL验证错误，保持错误类型和消息
            throw urlError;
        }

        const urls = getApiUrls(modelType);
        
        // 使用映射对象提高可读性和可维护性
        const modelConfig = {
            "3D": {
                display: "3D",
                methodName: "cartoonizeImage3D"
            },
            "HANDDRAWN": {
                display: "手绘",
                methodName: "cartoonizeImageHanddrawn"
            },
            "SKETCH": {
                display: "素描",
                methodName: "cartoonizeImageSketch"
            }
        } as const;

        // 获取模型配置，由于前面已经验证过modelType，这里直接访问是安全的
        const config = modelConfig[modelType];
        if (!config) {
            // 这种情况理论上不会发生，因为上面已经验证了modelType
            const error = new Error(`未处理的模型类型: ${modelType}`);
            error.name = "UnhandledModelTypeError";
            throw error;
        }
        
        return this.processImage(safeImageUrl, userId, requestId, config.display, urls.submit, urls.query, config.methodName);
    }

    /**
     * 处理图像卡通化的核心逻辑
     * @param imageUrl 图像URL地址
     * @param userId 用户ID
     * @param requestId 请求ID
     * @param modelType 模型类型显示名称
     * @param submitUrl ModelScope任务提交URL
     * @param queryUrl ModelScope任务查询URL
     * @param methodName 调用方法名，用于日志记录
     * @returns 处理后的图像URL
     */
    private async processImage(
        imageUrl: string,
        userId: string,
        requestId: string | undefined,
        modelType: string,
        submitUrl: string,
        queryUrl: string,
        methodName: string,
    ): Promise<string> {
        Logger.info(
            "CartoonizeService",
            methodName,
            `开始处理图像${modelType}卡通化请求`,
            {
                imageUrl: imageUrl?.substring(0, 50) + "...", // 只记录URL的前50个字符以保护隐私
                userId,
                requestId,
            },
        );

        // 1. 提交任务
        const payload: Payload = {
            task: "image-portrait-stylization",
            inputs: [imageUrl],
            parameters: {},
            urlPaths: {
                inUrls: [{ type: "image", fileType: "png" }],
                outUrls: [{ outputKey: "output_img", type: "image" }],
            },
        };

        try {
            Logger.debug(
                "CartoonizeService",
                methodName,
                `提交${modelType}卡通化任务到ModelScope API`,
                {
                    payloadSize: JSON.stringify(payload).length,
                    userId,
                    requestId,
                },
            );

            const submitResponse = await axios.post<SubmitResponse>(
                submitUrl,
                payload,
                { headers },
            );

            // 检查响应状态
            if (!submitResponse.data.Success) {
                const error = new Error(
                    `任务提交失败: ${submitResponse.data.Message}`,
                );
                error.name = "SubmitTaskError";
                Logger.error(
                    "CartoonizeService",
                    methodName,
                    "任务提交失败",
                    {
                        error: error.message,
                        response: submitResponse.data,
                        userId,
                        requestId,
                    },
                );

                
                Logger.audit(
                    "CREATE",
                    "MODELSCOPE_TASK",
                    "FAILED",
                    `任务提交失败：${error.message}`,
                    {
                        userId,
                        requestId,
                    },
                );

                throw error;
            }

            const taskId = submitResponse.data.Data.id;
            Logger.info(
                "CartoonizeService",
                methodName,
                "任务提交成功",
                {
                    taskId,
                    userId,
                    requestId,
                },
            );

            
            Logger.audit(
                "CREATE",
                "MODELSCOPE_TASK",
                "SUBMITTED",
                "任务提交成功",
                {
                    taskId,
                    userId,
                    requestId,
                },
            );

            // 2. 轮询结果
            let retryCount = 0;
            const maxRetries = 30; // 最多轮询30次（约60秒）

            while (retryCount < maxRetries) {
                Logger.debug(
                    "CartoonizeService",
                    methodName,
                    "轮询任务状态",
                    {
                        taskId,
                        retryCount: retryCount + 1,
                        maxRetries,
                        userId,
                        requestId,
                    },
                );

                const queryResponse = await axios.post<QueryResponse>(
                    queryUrl,
                    { id: taskId },
                    { headers },
                );

                // 检查查询响应状态
                if (!queryResponse.data.Success) {
                    const error = new Error(
                        `任务查询失败: ${queryResponse.data.Message}`,
                    );
                    error.name = "QueryTaskError";
                    Logger.error(
                        "CartoonizeService",
                        methodName,
                        "任务查询失败",
                        {
                            error: error.message,
                            taskId,
                            response: queryResponse.data,
                            userId,
                            requestId,
                        },
                    );

                    
                    Logger.audit(
                        "READ",
                        "MODELSCOPE_TASK",
                        "FAILED",
                        `任务查询失败：${error.message}`,
                        {
                            taskId,
                            userId,
                            requestId,
                        },
                    );

                    throw error;
                }

                const data = queryResponse.data.Data;

                // Status 2 means succeeded according to the API response
                if (data.status === 2) {
                    Logger.info(
                        "CartoonizeService",
                        methodName,
                        "图像处理成功完成",
                        {
                            taskId,
                            userId,
                            requestId,
                        },
                    );

                    
                    Logger.audit(
                        "UPDATE",
                        "MODELSCOPE_TASK",
                        "SUCCESS",
                        "图像处理成功完成",
                        {
                            taskId,
                            userId,
                            requestId,
                        },
                    );

                    return data.data.output_img;
                }

                // Status 3 means failed according to the API response
                if (data.status === 3) {
                    const error = new Error("图像处理任务失败");
                    error.name = "ProcessTaskError";
                    Logger.error(
                        "CartoonizeService",
                        methodName,
                        "图像处理任务失败",
                        {
                            error: error.message,
                            taskId,
                            userId,
                            requestId,
                        },
                    );

                    
                    Logger.audit(
                        "UPDATE",
                        "MODELSCOPE_TASK",
                        "FAILED",
                        `图像处理任务失败：${error.message}`,
                        {
                            taskId,
                            userId,
                            requestId,
                        },
                    );

                    throw error;
                }

                retryCount++;
                // 等待2秒后再次查询
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            // 超过最大重试次数
            const error = new Error("图像处理超时，请稍后再试");
            error.name = "TaskTimeoutError";
            Logger.error(
                "CartoonizeService",
                methodName,
                "图像处理超时",
                {
                    taskId,
                    maxRetries,
                    userId,
                    requestId,
                },
            );

            
            Logger.audit(
                "UPDATE",
                "MODELSCOPE_TASK",
                "TIMEOUT",
                "图像处理超时",
                {
                    taskId,
                    maxRetries,
                    userId,
                    requestId,
                },
            );

            throw error;
        } catch (error: any) {
            Logger.error(
                "CartoonizeService",
                methodName,
                `图像${modelType}卡通化处理过程中发生错误`,
                {
                    error: "图像处理错误",
                    userId,
                    requestId,
                },
            );

            
            Logger.audit(
                "CREATE",
                "MODELSCOPE_TASK",
                "ERROR",
                `图像${modelType}卡通化处理过程中发生错误`,
                {
                    userId,
                    requestId,
                },
            );

            // 直接重新抛出捕获的错误，避免不必要的包装
            throw error;
        }
    }
}

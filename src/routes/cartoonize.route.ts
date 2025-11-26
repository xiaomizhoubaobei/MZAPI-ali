import { Router, Request, Response } from "express";
import { CartoonizeModule } from "../module";
import { validateImageUrl, errorHandler, validateModelType } from "../middleware";

const router: Router = Router();

// 创建模块实例
const cartoonizeModule = new CartoonizeModule();
const cartoonizeController = cartoonizeModule.getController();

// 应用全局错误处理中间件
router.use(errorHandler);

/**
 * 主页路由 - 返回API信息
 */
router.get("/", (req: Request, res: Response) => {
    cartoonizeController.getApiInfo(req, res);
});

/**
 * 通用图像卡通化API路由
 * 接收图像URL和模型类型，返回对应风格的卡通化图像
 * 支持的模型类型: 3D, HANDDRAWN, SKETCH
 */
router.post("/api/modelscope/cartoonize/:model_type", validateModelType, validateImageUrl, async (req: Request, res: Response) => {
    try {
        await cartoonizeController.cartoonizeImage(req, res);
    } catch (error) {
        // 错误已经被全局错误处理中间件捕获
        throw error;
    }
});

export default router;

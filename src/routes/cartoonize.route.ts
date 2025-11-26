import { Router, Request, Response } from "express";
import { CartoonizeModule } from "../module";

const router: Router = Router();

// 创建模块实例
const cartoonizeModule = new CartoonizeModule();
const cartoonizeController = cartoonizeModule.getController();

/**
 * 主页路由 - 返回API信息
 */
router.get("/", (req: Request, res: Response) => {
    cartoonizeController.getApiInfo(req, res);
});

/**
 * 图像3D卡通化API路由
 * 接收图像URL，返回3D卡通风格的图像
 */
router.post("/api/modelscope/cv_unet_person-image-cartoon-3d_compound-models", async (req: Request, res: Response) => {
    await cartoonizeController.cartoonizeImage(req, res);
});

/**
 * 图像手绘卡通化API路由
 * 接收图像URL，返回手绘卡通风格的图像
 */
router.post("/api/modelscope/cv_unet_person-image-cartoon-handdrawn_compound-models", async (req: Request, res: Response) => {
    await cartoonizeController.cartoonizeImageHanddrawn(req, res);
});

export default router;
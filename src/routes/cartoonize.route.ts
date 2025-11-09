import { Router, Request, Response } from "express";
import { CartoonizeModule } from "../module/cartoonize.module";

const router: Router = Router();

// 创建模块实例
const cartoonizeModule = new CartoonizeModule();
const cartoonizeController = cartoonizeModule.getController();

// 主页路由
router.get("/", (req: Request, res: Response) => {
    cartoonizeController.getApiInfo(req, res);
});

// 图像卡通化API路由
router.post("/api/modelscope/cv_unet_person-image-cartoon-3d_compound-models", async (req: Request, res: Response) => {
    await cartoonizeController.cartoonizeImage(req, res);
});

export default router;
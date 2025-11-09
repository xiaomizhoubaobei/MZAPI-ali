import { Router } from "express";
import cartoonizeRoutes from "./cartoonize.route";

const appRouter = Router();

// 主要API路由
appRouter.use("/", cartoonizeRoutes);

export default appRouter;
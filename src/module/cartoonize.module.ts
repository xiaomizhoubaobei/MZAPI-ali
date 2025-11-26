import { CartoonizeController } from "../controller/cartoonize.controller";
import { CartoonizeService } from "../service";
import { Logger } from "../logger";

/**
 * 卡通化模块
 * 负责管理卡通化相关的控制器和服务实例
 */
export class CartoonizeModule {
    private readonly controller: CartoonizeController;
    private readonly service: CartoonizeService;

    /**
     * 构造函数 - 初始化卡通化模块
     */
    constructor() {
        Logger.info("CartoonizeModule", "constructor", "初始化卡通化模块");
        this.service = new CartoonizeService();
        this.controller = new CartoonizeController(this.service);
    }

    /**
     * 获取卡通化控制器实例
     * @returns 卡通化控制器实例
     */
    getController(): CartoonizeController {
        return this.controller;
    }
}

import { CartoonizeController } from "../controller/cartoonize.controller";
import { CartoonizeService } from "../service/cartoonize.service";
import { Logger } from "../logger";

export class CartoonizeModule {
    private readonly controller: CartoonizeController;
    private readonly service: CartoonizeService;

    constructor() {
        Logger.info("CartoonizeModule", "constructor", "初始化卡通化模块");
        this.service = new CartoonizeService();
        this.controller = new CartoonizeController(this.service);
    }

    getController(): CartoonizeController {
        return this.controller;
    }
}

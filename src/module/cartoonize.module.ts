import { CartoonizeController } from '../controller/cartoonize.controller';
import { CartoonizeService } from '../service/cartoonize.service';

export class CartoonizeModule {
  private readonly controller: CartoonizeController;
  private readonly service: CartoonizeService;

  constructor() {
    this.service = new CartoonizeService();
    this.controller = new CartoonizeController();
  }

  getController(): CartoonizeController {
    return this.controller;
  }

  getService(): CartoonizeService {
    return this.service;
  }
}
import { Request, Response } from 'express';
import { CartoonizeService } from '../service/cartoonize.service';
import { CartoonizeDto } from '../dto/cartoonize.dto';
import axios from 'axios';

export class CartoonizeController {
  private cartoonizeService: CartoonizeService;

  constructor() {
    this.cartoonizeService = new CartoonizeService();
  }

  async cartoonizeImage(req: Request, res: Response): Promise<void> {
    console.log('【控制器层】收到图像卡通化请求');
    console.log('【控制器层】客户端IP:', req.ip);
    console.log('【控制器层】完整请求信息:', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      params: req.params,
      query: req.query,
      headers: req.headers,
      body: req.body,
      ip: req.ip,
      ips: req.ips,
      protocol: req.protocol,
      secure: req.secure,
      xhr: req.xhr,
      fresh: req.fresh,
      stale: req.stale,
      subdomains: req.subdomains,
      hostname: req.hostname,
      path: req.path,
      host: req.get('host'),
      'content-type': req.get('content-type'),
      'user-agent': req.get('user-agent'),
      'content-length': req.get('content-length')
    });
    
    try {
      const { imageUrl } = req.body as CartoonizeDto;

      // 验证输入
      if (!imageUrl) {
        console.warn('【控制器层】缺少图像URL参数');
        res.status(400).json({ 
          error: '图像URL是必需的', 
          code: 'MISSING_IMAGE_URL' 
        });
        return;
      }

      // 简单验证URL格式
      try {
        new URL(imageUrl);
      } catch (urlError) {
        console.warn('【控制器层】无效的图像URL格式:', imageUrl);
        res.status(400).json({ 
          error: '无效的图像URL格式', 
          code: 'INVALID_URL_FORMAT' 
        });
        return;
      }

      console.log('【控制器层】开始处理图像:', imageUrl);
      console.log('【控制器层】正在调用服务层进行图像卡通化处理...');
      
      // 调用服务层处理
      const resultUrl = await this.cartoonizeService.cartoonizeImage(imageUrl);
      
      console.log('【控制器层】图像处理完成，准备返回结果给客户端');
      res.status(200).json({ 
        success: true, 
        originalUrl: imageUrl,
        cartoonizedUrl: resultUrl,
        timestamp: new Date().toISOString(),
        message: '图像卡通化处理成功'
      });
    } catch (error) {
      console.error('【控制器层】图像卡通化过程中发生错误:', error);
      
      // 根据错误类型返回不同的状态码
      if (error instanceof TypeError && error.message.includes('URL')) {
        res.status(400).json({ 
          error: '无效的图像URL格式', 
          code: 'INVALID_URL_FORMAT' 
        });
        return;
      }
      
      res.status(500).json({ 
        error: '图像处理失败', 
        message: error instanceof Error ? error.message : '发生未知错误',
        code: 'PROCESSING_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  getApiInfo(req: Request, res: Response): void {
    console.log('【控制器层】收到API信息请求');
    console.log('【控制器层】请求来源IP:', req.ip);
    
    res.status(200).json({ 
      message: '图像卡通化API服务', 
      endpoints: {
        'POST /api/modelscope/cartoonize': '将图像转换为卡通风格',
        'POST /api/modelscope/submit': '代理ModelScope提交接口',
        'POST /api/modelscope/query': '代理ModelScope查询接口',
      },
      description: '发送图像URL以获取卡通化版本',
      timestamp: new Date().toISOString()
    });
    
    console.log('【控制器层】已返回API信息响应');
  }

  async proxyModelscopeSubmit(req: Request, res: Response): Promise<void> {
    try {
      // 转发请求到ModelScope API
      const MODEL = 'iic/cv_unet_person-image-cartoon-3d_compound-models';
      const url = `https://modelscope.cn/api/v1/models/${MODEL}/widgets/submit`;
      
      const headers = {
        'Content-Type': 'application/json',
        'bx-v': '2.5.31',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      
      const response = await axios.post(url, req.body, { headers });
      
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('【控制器层】ModelScope提交代理请求失败:', error);
      res.status(500).json({ 
        error: '代理请求失败', 
        message: error instanceof Error ? error.message : '发生未知错误'
      });
    }
  }

  async proxyModelscopeQuery(req: Request, res: Response): Promise<void> {
    try {
      // 转发请求到ModelScope API
      const MODEL = 'iic/cv_unet_person-image-cartoon-3d_compound-models';
      const url = `https://modelscope.cn/api/v1/models/${MODEL}/widgets/query`;
      
      const headers = {
        'Content-Type': 'application/json',
        'bx-v': '2.5.31',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      
      const response = await axios.post(url, req.body, { headers });
      
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('【控制器层】ModelScope查询代理请求失败:', error);
      res.status(500).json({ 
        error: '代理请求失败', 
        message: error instanceof Error ? error.message : '发生未知错误'
      });
    }
  }
}
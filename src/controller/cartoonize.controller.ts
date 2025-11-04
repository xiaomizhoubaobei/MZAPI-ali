import { Request, Response } from 'express';
import { CartoonizeService } from '../service/cartoonize.service';
import { CartoonizeDto } from '../dto/cartoonize.dto';
import axios from 'axios';
import { Logger } from '../logger';

export class CartoonizeController {
  private cartoonizeService: CartoonizeService;

  constructor() {
    this.cartoonizeService = new CartoonizeService();
  }

  async cartoonizeImage(req: Request, res: Response): Promise<void> {
    const ip = req.ip || req.connection.remoteAddress;
    const requestId = req.headers['x-request-id'] as string || undefined;
    const userAgent = req.get('user-agent');
    const userId = (req as any).userId || 'anonymous'; // 从请求中获取用户ID，如果没有则为匿名用户
    
    Logger.info('CartoonizeController', 'cartoonizeImage', '收到图像卡通化请求', {
      method: req.method,
      url: req.url,
      ip,
      userAgent,
      requestId,
      userId
    });
    
    try {
      const { imageUrl } = req.body as CartoonizeDto;

      // 验证输入
      if (!imageUrl) {
        Logger.warn('CartoonizeController', 'cartoonizeImage', '缺少图像URL参数', {
          ip,
          requestId,
          userId
        });
        
        // 记录审计日志
        Logger.audit('CREATE', 'IMAGE_TASK', 'FAILED', '图像卡通化请求失败：缺少图像URL参数', {
          ip,
          requestId,
          userId
        });
        
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
        Logger.warn('CartoonizeController', 'cartoonizeImage', '无效的图像URL格式', {
          imageUrl: imageUrl?.substring(0, 50) + '...', // 只记录URL的前50个字符以保护隐私
          ip,
          requestId,
          userId
        });
        
        // 记录审计日志
        Logger.audit('CREATE', 'IMAGE_TASK', 'FAILED', '图像卡通化请求失败：无效的图像URL格式', {
          ip,
          requestId,
          userId
        });
        
        res.status(400).json({ 
          error: '无效的图像URL格式', 
          code: 'INVALID_URL_FORMAT' 
        });
        return;
      }

      Logger.info('CartoonizeController', 'cartoonizeImage', '开始处理图像', {
        imageUrl: imageUrl?.substring(0, 50) + '...', // 只记录URL的前50个字符以保护隐私
        ip,
        requestId,
        userId
      });
      
      // 记录审计日志 - 开始处理
      Logger.audit('CREATE', 'IMAGE_TASK', 'STARTED', '开始图像卡通化处理', {
        ip,
        requestId,
        userId
      });
      
      // 调用服务层处理
      const resultUrl = await this.cartoonizeService.cartoonizeImage(imageUrl, userId, requestId);
      
      Logger.info('CartoonizeController', 'cartoonizeImage', '图像处理完成，准备返回结果给客户端', {
        ip,
        requestId,
        userId
      });
      
      // 记录审计日志 - 处理成功
      Logger.audit('CREATE', 'IMAGE_TASK', 'SUCCESS', '图像卡通化处理成功', {
        ip,
        requestId,
        userId
      });
      
      res.status(200).json({ 
        success: true, 
        originalUrl: imageUrl,
        cartoonizedUrl: resultUrl,
        timestamp: new Date().toISOString(),
        message: '图像卡通化处理成功'
      });
    } catch (error: any) {
      Logger.error('CartoonizeController', 'cartoonizeImage', '图像卡通化过程中发生错误', {
        error: error.message,
        stack: error.stack,
        ip,
        requestId,
        userId
      });
      
      // 记录审计日志 - 处理失败
      Logger.audit('CREATE', 'IMAGE_TASK', 'FAILED', `图像卡通化处理失败：${error.message}`, {
        ip,
        requestId,
        userId
      });
      
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
    const ip = req.ip || req.connection.remoteAddress;
    const requestId = req.headers['x-request-id'] as string || undefined;
    const userId = (req as any).userId || 'anonymous';
    
    Logger.info('CartoonizeController', 'getApiInfo', '收到API信息请求', {
      ip,
      requestId,
      userId
    });
    
    res.status(200).json({ 
      message: '图像卡通化API服务', 
      endpoints: {
        'POST /api/modelscope/cartoonize': '将图像转换为卡通风格'
      },
      description: '发送图像URL以获取卡通化版本',
      timestamp: new Date().toISOString()
    });
    
    Logger.info('CartoonizeController', 'getApiInfo', '已返回API信息响应', {
      ip,
      requestId,
      userId
    });
    
    // 记录审计日志
    Logger.audit('READ', 'API_INFO', 'SUCCESS', '获取API信息成功', {
      ip,
      requestId,
      userId
    });
  }

  async proxyModelscopeSubmit(req: Request, res: Response): Promise<void> {
    const ip = req.ip || req.connection.remoteAddress;
    const requestId = req.headers['x-request-id'] as string || undefined;
    const userId = (req as any).userId || 'anonymous';
    
    try {
      Logger.info('CartoonizeController', 'proxyModelscopeSubmit', '收到ModelScope提交代理请求', {
        ip,
        requestId,
        userId
      });
      
      // 记录审计日志 - 开始代理请求
      Logger.audit('CREATE', 'PROXY_TASK', 'STARTED', '开始ModelScope提交代理请求', {
        ip,
        requestId,
        userId
      });
      
      // 转发请求到ModelScope API
      const MODEL = 'iic/cv_unet_person-image-cartoon-3d_compound-models';
      const url = `https://modelscope.cn/api/v1/models/${MODEL}/widgets/submit`;
      
      const headers = {
        'Content-Type': 'application/json',
        'bx-v': '2.5.31',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      
      const response = await axios.post(url, req.body, { headers });
      
      Logger.info('CartoonizeController', 'proxyModelscopeSubmit', 'ModelScope提交代理请求成功', {
        status: response.status,
        ip,
        requestId,
        userId
      });
      
      // 记录审计日志 - 代理请求成功
      Logger.audit('CREATE', 'PROXY_TASK', 'SUCCESS', 'ModelScope提交代理请求成功', {
        status: response.status,
        ip,
        requestId,
        userId
      });
      
      res.status(response.status).json(response.data);
    } catch (error: any) {
      Logger.error('CartoonizeController', 'proxyModelscopeSubmit', 'ModelScope提交代理请求失败', {
        error: error.message,
        stack: error.stack,
        ip,
        requestId,
        userId
      });
      
      // 记录审计日志 - 代理请求失败
      Logger.audit('CREATE', 'PROXY_TASK', 'FAILED', `ModelScope提交代理请求失败：${error.message}`, {
        ip,
        requestId,
        userId
      });
      
      res.status(500).json({ 
        error: '代理请求失败', 
        message: error instanceof Error ? error.message : '发生未知错误'
      });
    }
  }

  async proxyModelscopeQuery(req: Request, res: Response): Promise<void> {
    const ip = req.ip || req.connection.remoteAddress;
    const requestId = req.headers['x-request-id'] as string || undefined;
    const userId = (req as any).userId || 'anonymous';
    
    try {
      Logger.info('CartoonizeController', 'proxyModelscopeQuery', '收到ModelScope查询代理请求', {
        ip,
        requestId,
        userId
      });
      
      // 记录审计日志 - 开始代理请求
      Logger.audit('READ', 'PROXY_TASK', 'STARTED', '开始ModelScope查询代理请求', {
        ip,
        requestId,
        userId
      });
      
      // 转发请求到ModelScope API
      const MODEL = 'iic/cv_unet_person-image-cartoon-3d_compound-models';
      const url = `https://modelscope.cn/api/v1/models/${MODEL}/widgets/query`;
      
      const headers = {
        'Content-Type': 'application/json',
        'bx-v': '2.5.31',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      
      const response = await axios.post(url, req.body, { headers });
      
      Logger.info('CartoonizeController', 'proxyModelscopeQuery', 'ModelScope查询代理请求成功', {
        status: response.status,
        ip,
        requestId,
        userId
      });
      
      // 记录审计日志 - 代理请求成功
      Logger.audit('READ', 'PROXY_TASK', 'SUCCESS', 'ModelScope查询代理请求成功', {
        status: response.status,
        ip,
        requestId,
        userId
      });
      
      res.status(response.status).json(response.data);
    } catch (error: any) {
      Logger.error('CartoonizeController', 'proxyModelscopeQuery', 'ModelScope查询代理请求失败', {
        error: error.message,
        stack: error.stack,
        ip,
        requestId,
        userId
      });
      
      // 记录审计日志 - 代理请求失败
      Logger.audit('READ', 'PROXY_TASK', 'FAILED', `ModelScope查询代理请求失败：${error.message}`, {
        ip,
        requestId,
        userId
      });
      
      res.status(500).json({ 
        error: '代理请求失败', 
        message: error instanceof Error ? error.message : '发生未知错误'
      });
    }
  }
}
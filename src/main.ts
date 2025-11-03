import express = require('express');
import { Request, Response } from 'express';
import cors = require('cors');
import path = require('path');
import { CartoonizeModule } from './module/cartoonize.module';

const app: express.Application = express();
const PORT = process.env.PORT || 3000;

// 创建模块实例
const cartoonizeModule = new CartoonizeModule();
const cartoonizeController = cartoonizeModule.getController();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 用于服务上传的文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 主页路由
app.get('/', (req: Request, res: Response) => {
  cartoonizeController.getApiInfo(req, res);
});

// 图像卡通化API路由
app.post('/api/modelscope/cartoonize', async (req: Request, res: Response) => {
  await cartoonizeController.cartoonizeImage(req, res);
});

// ModelScope API代理路由
app.post('/api/modelscope/submit', async (req: Request, res: Response) => {
  await cartoonizeController.proxyModelscopeSubmit(req, res);
});

app.post('/api/modelscope/query', async (req: Request, res: Response) => {
  await cartoonizeController.proxyModelscopeQuery(req, res);
});

// 错误处理中间件
app.use((error: Error, req: Request, res: Response, _next: express.NextFunction) => {
  console.error('【应用层】捕获未处理的错误:', error);
  console.error('【应用层】错误堆栈:', error.stack);
  
  res.status(500).json({ 
    error: '服务器内部错误', 
    message: '系统发生未知错误，请稍后再试',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// 404处理 - 在所有路由之后，作为兜底处理
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    error: '请求的接口不存在', 
    message: '请检查您的请求路径是否正确',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`\n🚀 API服务正在端口 ${PORT} 上运行`);
  console.log(`\n✅ 服务启动成功，等待请求...`);
  console.log(`\n🔧 服务器配置信息:`);
  console.log(`   端口: ${PORT}`);
  console.log(`   环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   时间: ${new Date().toISOString()}`);
});

// 处理服务器启动的Promise，避免未处理的Promise警告
server.on('error', (error) => {
  console.error('【应用层】服务器启动失败:', error);
});
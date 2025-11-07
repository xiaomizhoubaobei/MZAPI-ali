# iFlow Cartoonize API

这是一个图像卡通化服务API，基于Node.js和Express构建。该服务使用ModelScope的AI模型将人像图片转换为3D卡通风格。

## 功能特性

- 基于ModelScope AI模型的图像卡通化处理
- 支持URL方式提交图像进行处理
- 客户端提示（Client Hints）支持，根据设备能力优化处理效果
- 完善的错误处理和日志记录机制
- 审计日志功能，记录所有重要操作
- 缓存控制，确保响应数据的实时性

## 项目结构

```
src/
├── main.ts                    # 应用入口文件
├── logger.ts                  # 日志模块
├── controller/                # 控制器层
│   └── cartoonize.controller.ts
├── dto/                       # 数据传输对象
│   └── cartoonize.dto.ts
├── middleware/                # 中间件
│   ├── accept-ch.middleware.ts
│   ├── content-digest.middleware.ts
│   ├── content-encoding.middleware.ts
│   ├── error-handler.middleware.ts
│   ├── request-logger.middleware.ts
│   ├── request-validator.middleware.ts
│   └── setup.middleware.ts
├── module/                    # 模块定义
│   ├── cartoonize.module.ts
│   ├── error-handler.module.ts
│   └── logger.module.ts
├── routes/                    # 路由定义
│   └── cartoonize.routes.ts
├── service/                   # 服务层
│   └── cartoonize.service.ts
└── utils/                     # 工具函数
    ├── cache-control.utils.ts
    └── ip.utils.ts
```

## 部署方式

### 1. 本地部署

```bash
# 安装依赖
yarn install

# 构建项目
yarn build

# 启动服务
yarn start
```

### 2. 开发模式

```bash
# 在开发模式下运行（支持热重载）
yarn dev
```

### 3. Docker部署

```bash
# 构建Docker镜像
docker build -t iflow-cartoonize-api .

# 运行容器
docker run -p 3000:3000 iflow-cartoonize-api
```

或者使用docker-compose:

```bash
# 启动服务
docker-compose up -d
```

## API端点

### GET /

返回API基本信息和可用端点。

**响应示例:**

```json
{
    "message": "图像卡通化API服务",
    "endpoints": {
        "POST /api/modelscope/cartoonize": "将图像转换为卡通风格"
    },
    "description": "发送图像URL以获取卡通化版本",
    "timestamp": "2023-04-01T12:00:00.000Z"
}
```

### POST /api/modelscope/cartoonize

将图像转换为卡通风格。

**请求体:**

```json
{
    "imageUrl": "https://example.com/image.jpg"
}
```

**响应示例:**

```json
{
    "success": true,
    "originalUrl": "https://example.com/image.jpg",
    "cartoonizedUrl": "https://modelscope.cn/output/cartoonized.jpg",
    "timestamp": "2023-04-01T12:00:00.000Z",
    "message": "图像卡通化处理成功",
    "processingOptions": {
        "quality": "medium",
        "maxWidth": 1920,
        "optimizeForData": false
    }
}
```

## 错误响应

API使用标准HTTP状态码表示响应结果：

- `200` - 请求成功
- `400` - 请求参数错误
- `404` - 请求的资源不存在
- `408` - 请求超时
- `500` - 服务器内部错误

**错误响应格式:**

```json
{
    "error": "错误描述",
    "message": "详细错误信息",
    "code": "错误代码",
    "timestamp": "2023-04-01T12:00:00.000Z"
}
```

## 环境变量

- `PORT` - 服务端口 (默认: 3000)
- `NODE_ENV` - 环境 (默认: development)

## Docker镜像

Dockerfile使用多阶段构建，确保了镜像的轻量化和安全性。

- 基础镜像：node:18-alpine
- 构建后镜像大小：约210MB
- 暴露端口：3000

### 预构建镜像

我们提供了预构建的Docker镜像，可以直接使用：

GitHub Packages:

```bash
docker pull ghcr.io/xiaomizhoubaobei/mzapi-ali
```

Docker Hub:

```bash
docker pull qixiaoxin/iflow-cartoonize-api
```

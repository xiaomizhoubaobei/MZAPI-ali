# iFlow Cartoonize API

这是一个图像卡通化服务API，基于Node.js和Express构建。

## 功能特性

- 图像卡通化处理
- 上传文件管理
- 错误处理和日志记录

## 项目结构

```
src/
├── main.ts          # 应用入口文件
├── controller/      # 控制器层
│   └── cartoonize.controller.ts
├── dto/            # 数据传输对象
│   └── cartoonize.dto.ts
├── module/         # 模块定义
│   └── cartoonize.module.ts
└── service/        # 服务层
    └── cartoonize.service.ts
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

### 2. Docker部署

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

- `GET /` - API信息
- `POST /api/modelscope/cartoonize` - 图像卡通化

## 环境变量

- `PORT` - 服务端口 (默认: 3000)
- `NODE_ENV` - 环境 (默认: development)

## Docker镜像

Dockerfile使用多阶段构建，确保了镜像的轻量化和安全性。

- 基础镜像：node:18-alpine
- 构建后镜像大小：约210MB
- 暴露端口：3000
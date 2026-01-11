# 图片内容审核 API - `/aliyun/image-moderation`

## 概述

图片内容审核 API 提供基于阿里云内容安全服务的图片审核功能，可以自动检测图片中的色情、暴恐、广告、政治敏感等违规内容。

**端点信息：**
- **URL**: `/aliyun/image-moderation`
- **方法**: `POST`
- **认证**: 需要提供阿里云访问密钥

## 系统架构

### 整体架构图

```mermaid
graph TB
    subgraph Client["客户端应用"]
        A[Web App / Mobile App]
    end

    subgraph Gateway["API 网关层"]
        B1[CORS 拦截器]
        B2[安全头拦截器]
        B3[CDN 代理拦截器]
        B4[POST 请求拦截器]
        B5[无缓存拦截器]
        B6[内容摘要拦截器]
        B7[内容语言拦截器]
        B8[服务器计时拦截器]
        B9[超时拦截器]
        B10[请求体大小限制拦截器]
    end

    subgraph Controller["控制器层"]
        C[ImageModerationController<br/>接收 POST 请求<br/>参数验证 DTO<br/>调用服务层<br/>返回审核结果]
    end

    subgraph Service["服务层"]
        D[ImageModerationService<br/>创建阿里云 RPC 客户端<br/>验证服务类型<br/>验证必传参数<br/>验证图片 URL<br/>构建请求参数<br/>调用阿里云 API<br/>处理响应结果]
    end

    subgraph Aliyun["阿里云内容安全服务"]
        E[绿网内容安全 API<br/>图片内容审核<br/>多种检测场景<br/>AI 智能识别<br/>实时检测]
    end

    A -->|HTTPS Request| B1
    B1 --> B2
    B2 --> B3
    B3 --> B4
    B4 --> B5
    B5 --> B6
    B6 --> B7
    B7 --> B8
    B8 --> B9
    B9 --> B10
    B10 --> C
    C --> D
    D -->|HTTPS Request| E
```

### 请求处理流程图

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Interceptors as 安全拦截器链
    participant Controller as 控制器层
    participant Service as 服务层
    participant Aliyun as 阿里云服务

    Client->>Interceptors: 1. 发送 POST 请求<br/>/aliyun/image-moderation<br/>{ service, accessKeyId, ... }

    Interceptors->>Interceptors: 2. CORS 拦截器<br/>检查跨域请求
    Interceptors->>Interceptors: 3. 安全头拦截器<br/>添加安全响应头
    Interceptors->>Interceptors: 4. CDN 代理拦截器<br/>处理 CDN 请求
    Interceptors->>Interceptors: 5. POST 请求拦截器<br/>验证请求方法
    Interceptors->>Interceptors: 6. 无缓存拦截器<br/>设置缓存控制头
    Interceptors->>Interceptors: 7. 内容摘要拦截器<br/>计算内容摘要
    Interceptors->>Interceptors: 8. 内容语言拦截器<br/>设置内容语言
    Interceptors->>Interceptors: 9. 服务器计时拦截器<br/>记录处理时间
    Interceptors->>Interceptors: 10. 超时拦截器<br/>检查请求超时
    Interceptors->>Interceptors: 11. 请求体大小限制拦截器<br/>验证请求体大小

    Interceptors->>Controller: 12. 请求体 (ImageModerationDto)<br/>请求头
    Controller->>Controller: 13. 记录日志
    Controller->>Service: 14. 调用服务层

    Service->>Service: 15. 创建阿里云 RPC 客户端<br/>accessKeyId, accessKeySecret, endpoint
    Service->>Service: 16. 验证服务类型
    Service->>Service: 17. 验证必传参数
    Service->>Service: 18. 验证图片 URL
    Service->>Service: 19. 构建请求参数<br/>Service, ServiceParameters
    Service->>Aliyun: 20. HTTPS 请求<br/>ImageModeration API

    Aliyun->>Aliyun: 21. 接收请求
    Aliyun->>Aliyun: 22. 下载图片
    Aliyun->>Aliyun: 23. AI 智能分析<br/>色情、暴恐、广告、政治敏感、AIGC
    Aliyun->>Aliyun: 24. 生成审核结果<br/>置信度、标签、建议
    Aliyun->>Service: 25. 返回响应

    Service->>Service: 26. 记录日志
    Service->>Controller: 27. 返回审核结果
    Controller->>Client: 28. 响应返回<br/>Code, Data, Message, RequestId
```

### 数据流图

```mermaid
graph LR
    subgraph Input["客户端请求"]
        A[ImageModerationDto<br/>service: string<br/>accessKeyId: string<br/>accessKeySecret: string<br/>endpoint: string<br/>imageUrl: string]
    end

    subgraph Validation["数据验证层"]
        B[class-validator 验证<br/>IsString 字符串验证<br/>IsUrl URL 格式验证<br/>IsIn 枚举值验证<br/>IsNotEmpty 非空验证]
    end

    subgraph Business["业务逻辑层"]
        C[AliyunValidationUtils<br/>validateServiceType 服务类型验证<br/>validateRequiredParams 必填参数验证<br/>validateImageUrl 图片 URL 验证]
    end

    subgraph Transform["数据转换层"]
        D[Request Parameters<br/>Service: string<br/>ServiceParameters: JSON<br/>dataId: UUID<br/>imageUrl: string]
    end

    subgraph Aliyun["阿里云 API"]
        E[Response<br/>Code: string<br/>Data: object<br/>Data.Data: array<br/>Confidence: number<br/>Label: string<br/>Suggestion: string<br/>Message: string<br/>RequestId: string]
    end

    subgraph Output["客户端响应"]
        F[JSON Body<br/>审核结果数据]
    end

    A -->|验证| B
    B -->|验证通过| C
    C -->|验证通过| D
    D -->|HTTPS 请求| E
    E -->|返回| F
```

### 安全架构图

```mermaid
graph TB
    subgraph Security["安全防护层"]
        direction TB
        
        subgraph Network["网络层安全"]
            N1[HTTPS 加密传输]
            N2[TLS 1.2+]
            N3[证书验证]
        end
        
        subgraph Application["应用层安全"]
            A1[CORS 策略]
            A2[安全响应头<br/>X-Frame-Options: DENY<br/>X-Content-Type-Options: nosniff<br/>X-XSS-Protection: 1 mode=block<br/>Strict-Transport-Security<br/>Content-Security-Policy]
            A3[请求体大小限制 1MB]
            A4[请求超时 30s]
            A5[仅允许 POST 请求]
        end
        
        subgraph DataValidation["数据验证层"]
            D1[输入验证 class-validator]
            D2[类型检查]
            D3[枚举值验证]
            D4[URL 格式验证]
            D5[非空验证]
        end
        
        subgraph BusinessLogic["业务逻辑层"]
            B1[服务类型验证]
            B2[必填参数验证]
            B3[图片 URL 验证]
        end
        
        subgraph DataTransfer["数据传输层"]
            T1[阿里云 API 加密传输]
            T2[AccessKey 认证]
            T3[请求签名]
        end
        
        subgraph Monitoring["日志与监控"]
            M1[请求日志]
            M2[错误日志]
            M3[性能监控]
            M4[请求 ID 追踪]
        end
    end

    Network --> Application
    Application --> DataValidation
    DataValidation --> BusinessLogic
    BusinessLogic --> DataTransfer
    DataTransfer --> Monitoring
```

## 支持

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至项目维护者
- 查看项目文档

## 许可证

本项目采用 AGPL-3.0 许可证。
# 百炼文本生成 API - `/aliyun/text-generation`

## 概述

百炼文本生成 API 提供基于阿里云百炼服务的文本生成功能，支持多种通义千问模型，包括深度思考、联网搜索、代码解释器等高级特性。

**端点信息：**
- **URL**: `/aliyun/text-generation`
- **方法**: `POST`
- **认证**: 需要提供阿里云百炼 API Key

## 支持的模型

| 模型名称                   | 说明       |
|------------------------|----------|
| `qwen-plus`            | 通义千问增强版  |
| `qwen-turbo`           | 通义千问快速版  |
| `qwen-max`             | 通义千问旗舰版  |
| `qwen-max-longcontext` | 通义千问长文本版 |

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
        C[TextGenerationController<br/>接收 POST 请求<br/>参数验证 DTO<br/>判断流式/非流式<br/>调用服务层<br/>返回生成结果]
    end

    subgraph Service["服务层"]
        D[TextGenerationService<br/>创建 OpenAI 客户端<br/>构建请求参数<br/>处理深度思考/联网搜索/代码解释器<br/>调用百炼 API<br/>处理响应结果]
    end

    subgraph Aliyun["阿里云百炼服务"]
        E[通义千问 API<br/>文本生成<br/>深度思考<br/>联网搜索<br/>代码解释器]
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
    participant Aliyun as 阿里云百炼

    Client->>Interceptors: 1. 发送 POST 请求<br/>/aliyun/text-generation<br/>{ model, messages, apiKey, ... }

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

    Interceptors->>Controller: 12. 请求体 (TextGenerationDto)<br/>请求头
    Controller->>Controller: 13. 记录日志
    Controller->>Controller: 14. 判断是否流式输出

    alt 流式输出 (stream: true)
        Controller->>Controller: 15. 设置 SSE 响应头<br/>Content-Type: text/event-stream<br/>Cache-Control: no-cache
        Controller->>Service: 16. 调用服务层
        Service->>Service: 17. 创建 OpenAI 客户端<br/>apiKey, baseURL
        Service->>Service: 18. 构建请求参数<br/>model, messages, temperature, etc.
        Service->>Service: 19. 构建 extra_body<br/>enable_thinking<br/>enable_search<br/>enable_code_interpreter
        Service->>Aliyun: 20. HTTPS 请求<br/>Chat Completions API
        Aliyun->>Service: 21. 返回流式响应
        Service->>Controller: 22. 流式数据
        Controller->>Client: 23. SSE 事件流<br/>data: { content }
        Controller->>Client: 24. 结束标记<br/>data: "[DONE]"
    else 非流式输出 (stream: false)
        Controller->>Service: 15. 调用服务层
        Service->>Service: 16. 创建 OpenAI 客户端<br/>apiKey, baseURL
        Service->>Service: 17. 构建请求参数<br/>model, messages, temperature, etc.
        Service->>Service: 18. 构建 extra_body<br/>enable_thinking<br/>enable_search<br/>enable_code_interpreter
        Service->>Aliyun: 19. HTTPS 请求<br/>Chat Completions API
        Aliyun->>Service: 20. 返回完整响应
        Service->>Controller: 21. 生成结果
        Controller->>Client: 22. 响应返回<br/>完整 JSON 数据
    end
```

### 数据流图

```mermaid
graph LR
    subgraph Input["客户端请求"]
        A["TextGenerationDto<br/>model: string<br/>messages: MessageDto[]<br/>apiKey: string<br/>temperature?: number<br/>max_tokens?: number<br/>stream?: boolean<br/>enable_thinking?: boolean<br/>enable_search?: boolean<br/>enable_code_interpreter?: boolean"]
    end

    subgraph Validation["数据验证层"]
        B[class-validator 验证<br/>IsString 字符串验证<br/>IsArray 数组验证<br/>ValidateNested 嵌套验证<br/>IsNotEmpty 非空验证]
    end

    subgraph Transform["数据转换层"]
        C["API Parameters<br/>model: string<br/>messages: object[]<br/>temperature: number<br/>max_tokens: number<br/>stream: boolean"]
    end

    subgraph ExtraBody["扩展参数"]
        D[extra_body<br/>enable_thinking: boolean<br/>enable_search: boolean<br/>enable_code_interpreter: boolean]
    end

    subgraph Aliyun["阿里云百炼 API"]
        E[Response<br/>id: string<br/>object: string<br/>created: number<br/>model: string<br/>choices: array<br/>usage: object<br/>system_fingerprint: string]
    end

    subgraph Output["客户端响应"]
        F[JSON Body / SSE Stream<br/>生成文本数据]
    end

    A -->|验证| B
    B -->|验证通过| C
    C --> D
    C -->|HTTPS 请求| E
    D -->|HTTPS 请求| E
    E -->|返回| F
```

## 请求参数

### TextGenerationDto

| 参数名                       | 类型           | 必填 | 说明            | 默认值                                                 |
|---------------------------|--------------|----|---------------|-----------------------------------------------------|
| `model`                   | string       | 是  | 模型名称          | -                                                   |
| `messages`                | MessageDto[] | 是  | 消息列表          | -                                                   |
| `apiKey`                  | string       | 是  | 阿里云百炼 API Key | -                                                   |
| `baseURL`                 | string       | 否  | 基础 URL        | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `temperature`             | number       | 否  | 温度参数 (0-2)    | 0.7                                                 |
| `max_tokens`              | number       | 否  | 最大生成 token 数  | 2048                                                |
| `top_p`                   | number       | 否  | 采样策略 (0-1)    | 0.8                                                 |
| `stream`                  | boolean      | 否  | 是否使用流式输出      | false                                               |
| `enable_thinking`         | boolean      | 否  | 是否启用深度思考模式    | false                                               |
| `enable_search`           | boolean      | 否  | 是否启用联网搜索      | false                                               |
| `enable_code_interpreter` | boolean      | 否  | 是否启用代码解释器     | false                                               |
| `stream_options`          | object       | 否  | 流式输出选项        | -                                                   |
| `response_format`         | object       | 否  | 响应格式          | -                                                   |

### MessageDto

| 参数名       | 类型          | 必填 | 说明                           | 默认值   |
|-----------|-------------|----|------------------------------|-------|
| `role`    | MessageRole | 是  | 消息角色 (system/user/assistant) | -     |
| `content` | string      | 是  | 消息内容                         | -     |
| `partial` | boolean     | 否  | 是否为部分补全                      | false |

### MessageRole

| 值           | 说明   |
|-------------|------|
| `system`    | 系统角色 |
| `user`      | 用户角色 |
| `assistant` | 助手角色 |

## 响应格式

### 非流式响应

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "qwen-plus",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "生成的文本内容"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  },
  "system_fingerprint": "fp_xxx"
}
```

### 流式响应

SSE 事件流格式：

```
data: {"content":"生成的文本内容片段1"}

data: {"content":"生成的文本内容片段2"}

data: "[DONE]"
```

## 高级特性

### 深度思考模式 (`enable_thinking`)

当启用深度思考模式时，模型会在思考后回复，适用于需要复杂推理的场景。

**注意：** 
- 深度思考模式仅支持 `qwen-max` 系列
- 启用后会增加响应时间和 token 消耗

### 联网搜索 (`enable_search`)

启用联网搜索后，模型将判断用户问题是否需要联网查询：
- 若需要，则结合搜索结果回答
- 若不需要，则直接使用模型自身知识回答

### 代码解释器 (`enable_code_interpreter`)

启用后，模型可以执行代码来回答问题。

**注意：**
- 代码解释器功能仅支持思考模式调用
- 代码解释器功能仅支持流式输出调用

### JSON 输出 (`response_format`)

支持两种 JSON 输出格式：

1. **json_object** - 简单 JSON 对象输出
2. **json_schema** - 带有 schema 验证的 JSON 输出

示例：

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "weather",
      "description": "天气信息",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "city": { "type": "string" },
          "temperature": { "type": "number" },
          "condition": { "type": "string" }
        },
        "required": ["city", "temperature", "condition"]
      }
    }
  }
}
```

## 支持与联系

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至项目维护者
- 查看项目文档

## 许可证

本项目采用 AGPL-3.0 许可证。
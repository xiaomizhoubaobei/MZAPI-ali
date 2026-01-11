import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 消息角色类型
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

/**
 * 消息数据传输对象
 */
export class MessageDto {
  /**
   * 消息角色
   */
  @IsString()
  @IsNotEmpty()
  role: MessageRole;

  /**
   * 消息内容
   */
  @IsString()
  @IsNotEmpty()
  content: string;

  /**
   * 是否为部分补全
   * @description 当为 true 时，表示该消息是部分内容，需要模型进行补全
   * @default false
   */
  @IsOptional()
  partial?: boolean;
}

/**
 * 阿里云百炼文本生成数据传输对象
 */
export class TextGenerationDto {
  /**
   * 模型名称
   * @example 'qwen-plus' - 通义千问增强版
   * @example 'qwen-turbo' - 通义千问快速版
   * @example 'qwen-max' - 通义千问旗舰版
   * @example 'qwen-max-longcontext' - 通义千问长文本版
   */
  @IsString()
  @IsNotEmpty()
  model: string;

  /**
   * 消息列表
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  /**
   * 阿里云百炼 API Key
   */
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  /**
   * 基础 URL
   * @default 'https://dashscope.aliyuncs.com/compatible-mode/v1' - 北京地域
   * @example 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' - 新加坡地域
   */
  @IsString()
  @IsOptional()
  baseURL?: string;

  /**
   * 温度参数，控制输出的随机性
   * @default 0.7
   * @minimum 0
   * @maximum 2
   */
  @IsOptional()
  temperature?: number;

  /**
   * 最大生成 token 数
   * @default 2048
   */
  @IsOptional()
  max_tokens?: number;

  /**
   * 采样策略，控制多样性
   * @default 0.8
   * @minimum 0
   * @maximum 1
   */
  @IsOptional()
  top_p?: number;

  /**
   * 是否使用流式输出
   * @default false
   */
  @IsOptional()
  stream?: boolean;

  /**
   * 是否启用深度思考模式
   * @description 当为 true 时，模型会在思考后回复；当为 false 时，模型直接回复
   * @default false
   */
  @IsOptional()
  enable_thinking?: boolean;

  /**
   * 是否启用联网搜索功能
   * @description 当为 true 时，模型将判断用户问题是否需要联网查询；若需要，则结合搜索结果回答；若不需要，则直接使用模型自身知识回答
   * @default false
   */
  @IsOptional()
  enable_search?: boolean;

  /**
   * 是否启用代码解释器功能
   * @description 启用后，模型可以执行代码来回答问题。注意：代码解释器功能仅支持思考模式调用和流式输出调用
   * @default false
   */
  @IsOptional()
  enable_code_interpreter?: boolean;

  /**
   * 流式输出选项
   * @description 控制流式返回的行为
   */
  @IsOptional()
  stream_options?: {
    /**
     * 是否在流式返回的最后一个数据包包含 Token 消耗信息
     * @default false
     */
    include_usage?: boolean;
  };

  /**
   * 响应格式
   * @description 控制 API 返回的格式，支持 JSON 输出
   */
  @IsOptional()
  response_format?:
    | {
        type: 'json_object';
      }
    | {
        type: 'json_schema';
        json_schema: {
          name: string;
          description?: string;
          strict?: boolean;
          schema: Record<string, any>;
        };
        strict?: boolean;
      };
}
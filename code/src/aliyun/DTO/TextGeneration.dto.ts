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
}
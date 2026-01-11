import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { TextGenerationDto } from '../DTO';

@Injectable()
/**
 * 阿里云百炼文本生成服务
 */
export class TextGenerationService {
  private readonly logger = new Logger(TextGenerationService.name);
  private readonly defaultBaseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  /**
   * 执行文本生成
   * @param params - 包含模型配置和消息列表的数据传输对象
   * @returns 返回文本生成结果
   * @throws {Error} 当 API 调用失败时抛出错误
   */
  async textGeneration(params: TextGenerationDto) {
    try {
      // 创建 OpenAI 客户端
      const openai = new OpenAI({
        apiKey: params.apiKey,
        baseURL: params.baseURL || this.defaultBaseURL,
      });

      this.logger.log(`开始调用阿里云百炼 API，模型: ${params.model}`);
      this.logger.debug(
        `请求参数: ${JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          top_p: params.top_p,
        })}`,
      );

      // 调用百炼 API
      const completion = await openai.chat.completions.create({
        model: params.model,
        messages: params.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
      });

      this.logger.debug(`阿里云百炼 API 调用成功，模型: ${params.model}`);
      this.logger.verbose(`返回结果: ${JSON.stringify(completion)}`);

      return completion;
    } catch (error) {
      this.logger.error(
        `阿里云百炼 API 调用失败: ${error.message}`,
        error.stack,
      );
      throw new Error('阿里云百炼 API 调用失败: ' + error.message);
    }
  }
}
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
   * @returns 返回文本生成结果或流式响应
   * @throws {Error} 当 API 调用失败时抛出错误
   */
  async textGeneration(params: TextGenerationDto) {
    try {
      // 创建 OpenAI 客户端
      const openai = new OpenAI({
        apiKey: params.apiKey,
        baseURL: params.baseURL || this.defaultBaseURL,
      });

      this.logger.log(`开始调用阿里云百炼 API，模型: ${params.model}，流式: ${params.stream || false}，深度思考: ${params.enable_thinking || false}，联网搜索: ${params.enable_search || false}，代码解释器: ${params.enable_code_interpreter || false}`);
      this.logger.debug(
        `请求参数: ${JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          top_p: params.top_p,
          stream: params.stream,
          enable_thinking: params.enable_thinking,
          enable_search: params.enable_search,
          enable_code_interpreter: params.enable_code_interpreter,
          stream_options: params.stream_options,
          response_format: params.response_format,
        })}`,
      );

      // 构建 API 请求参数
      const apiParams: any = {
        model: params.model,
        messages: params.messages.map((msg) => {
          const mappedMsg: any = {
            role: msg.role,
            content: msg.content,
          };
          // 添加 partial 参数
          if (msg.partial !== undefined) {
            mappedMsg.partial = msg.partial;
          }
          return mappedMsg;
        }),
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stream: params.stream || false,
      };

      // 添加流式选项
      if (params.stream_options) {
        apiParams.stream_options = params.stream_options;
      }

      // 添加响应格式
      if (params.response_format) {
        apiParams.response_format = params.response_format;
      }

      // 构建 extra_body 传入非标准参数
      const extraBody: any = {};
      if (params.enable_thinking !== undefined) {
        extraBody.enable_thinking = params.enable_thinking;
      }
      if (params.enable_search !== undefined) {
        extraBody.enable_search = params.enable_search;
      }
      if (params.enable_code_interpreter !== undefined) {
        extraBody.enable_code_interpreter = params.enable_code_interpreter;
      }

      // 调用百炼 API
      const completion = await openai.chat.completions.create(apiParams, extraBody);

      this.logger.debug(`阿里云百炼 API 调用成功，模型: ${params.model}`);

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
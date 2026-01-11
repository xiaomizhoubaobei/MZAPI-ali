import { Controller, Post, Body, Headers, Res, HttpStatus } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Response } from 'express';
import { TextGenerationService } from '../service';
import { TextGenerationDto } from '../DTO';

@Controller('aliyun')
/**
 * 阿里云百炼文本生成控制器
 */
export class TextGenerationController {
  private readonly logger = new Logger(TextGenerationController.name);

  /**
   * 构造函数
   * @param textGenerationService - 文本生成服务实例
   */
  constructor(
    private readonly textGenerationService: TextGenerationService,
  ) {}

  /**
   * 处理文本生成请求
   * @param textGenerationDto - 包含模型配置和消息列表的数据传输对象
   * @param headers - 请求头信息
   * @param res - Express 响应对象
   * @returns 返回文本生成结果或流式响应
   */
  @Post('text-generation')
  async textGeneration(
    @Body() textGenerationDto: TextGenerationDto,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    this.logger.log(
      `收到文本生成请求，模型: ${textGenerationDto.model}，流式: ${textGenerationDto.stream || false}`,
    );
    this.logger.debug(`请求头信息: ${JSON.stringify(headers)}`);

    try {
      // 如果启用流式输出
      if (textGenerationDto.stream) {
        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const stream = await this.textGenerationService.textGeneration(textGenerationDto);

        // 流式输出
        if (typeof (stream as any)[Symbol.asyncIterator] === 'function') {
          for await (const chunk of stream as any) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          }
        }

        // 发送结束标记
        res.write('data: [DONE]\n\n');
        res.end();

        this.logger.debug(`流式文本生成完成，模型: ${textGenerationDto.model}`);
        return;
      } else {
        // 非流式输出
        const result =
          await this.textGenerationService.textGeneration(textGenerationDto);
        this.logger.debug(`文本生成完成，模型: ${textGenerationDto.model}`);
        return result;
      }
    } catch (error) {
      this.logger.error(`文本生成失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
import { Controller, Post, Body, Headers } from '@nestjs/common';
import { Logger } from '@nestjs/common';
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
   * @returns 返回文本生成结果
   */
  @Post('text-generation')
  async textGeneration(
    @Body() textGenerationDto: TextGenerationDto,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(
      `收到文本生成请求，模型: ${textGenerationDto.model}`,
    );
    this.logger.debug(`请求头信息: ${JSON.stringify(headers)}`);
    try {
      const result =
        await this.textGenerationService.textGeneration(textGenerationDto);
      this.logger.debug(`文本生成完成，模型: ${textGenerationDto.model}`);
      return result;
    } catch (error) {
      this.logger.error(`文本生成失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
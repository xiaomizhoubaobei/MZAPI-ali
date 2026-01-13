import { Controller, Get } from '@nestjs/common';

/**
 * API 列表控制器
 */
@Controller()
export class AppController {
  /**
   * 获取所有可用的 API 端点列表
   * @returns 返回 API 端点列表
   */
  @Get()
  getApiList() {
    return {
      name: 'MZAPI',
      version: '0.0.1',
      description: '米粥宝贝 API 服务',
      apis: [
        {
          name: '图片内容审核',
          endpoint: '/aliyun/image-moderation',
          method: 'POST',
          description: '基于阿里云内容安全服务的图片审核功能，可以自动检测图片中的色情、暴恐、广告、政治敏感等违规内容',
          documentation: '/docs/IMAGE-MODERATION.md',
          launchDate: '2025-01-11',
        },
        {
          name: '文本生成',
          endpoint: '/aliyun/text-generation',
          method: 'POST',
          description: '基于阿里云百炼的文本生成功能，支持多种通义千问模型',
          launchDate: '2025-01-11',
        },
      ],
    };
  }
}
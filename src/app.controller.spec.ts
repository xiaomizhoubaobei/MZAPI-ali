import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getApiList', () => {
    it('should return API list with correct structure', () => {
      const result = controller.getApiList();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('name', 'MZAPI');
      expect(result).toHaveProperty('version', '0.0.1');
      expect(result).toHaveProperty('description', '米粥宝贝 API 服务');
      expect(result).toHaveProperty('apis');
      expect(Array.isArray(result.apis)).toBe(true);
    });

    it('should return correct number of APIs', () => {
      const result = controller.getApiList();

      expect(result.apis).toHaveLength(2);
    });

    it('should include image moderation API', () => {
      const result = controller.getApiList();

      const imageModerationApi = result.apis.find(
        (api: any) => api.name === '图片内容审核',
      );

      expect(imageModerationApi).toBeDefined();
      if (imageModerationApi) {
        expect(imageModerationApi.endpoint).toBe('/aliyun/image-moderation');
        expect(imageModerationApi.method).toBe('POST');
        expect(imageModerationApi.documentation).toBe(
          '/docs/IMAGE-MODERATION.md',
        );
        expect(imageModerationApi.launchDate).toBe('2025-01-11');
      }
    });

    it('should include text generation API', () => {
      const result = controller.getApiList();

      const textGenerationApi = result.apis.find(
        (api: any) => api.name === '文本生成',
      );

      expect(textGenerationApi).toBeDefined();
      if (textGenerationApi) {
        expect(textGenerationApi.endpoint).toBe('/aliyun/text-generation');
        expect(textGenerationApi.method).toBe('POST');
        expect(textGenerationApi.launchDate).toBe('2025-01-11');
      }
    });

    it('should not include documentation field for text generation API', () => {
      const result = controller.getApiList();

      const textGenerationApi = result.apis.find(
        (api: any) => api.name === '文本生成',
      );

      expect(textGenerationApi).toBeDefined();
      if (textGenerationApi) {
        expect(textGenerationApi).not.toHaveProperty('documentation');
      }
    });

    it('should include documentation field for image moderation API', () => {
      const result = controller.getApiList();

      const imageModerationApi = result.apis.find(
        (api: any) => api.name === '图片内容审核',
      );

      expect(imageModerationApi).toBeDefined();
      if (imageModerationApi) {
        expect(imageModerationApi).toHaveProperty('documentation');
      }
    });

    it('should have launchDate for all APIs', () => {
      const result = controller.getApiList();

      result.apis.forEach((api: any) => {
        expect(api).toHaveProperty('launchDate');
        expect(api.launchDate).toBe('2025-01-11');
      });
    });

    it('should not have root level launchDate', () => {
      const result = controller.getApiList();

      expect(result).not.toHaveProperty('launchDate');
    });

    it('should not have documentation field at root level', () => {
      const result = controller.getApiList();

      expect(result).not.toHaveProperty('documentation');
    });

    it('should not have license field', () => {
      const result = controller.getApiList();

      expect(result).not.toHaveProperty('license');
    });

    it('should not have repository field', () => {
      const result = controller.getApiList();

      expect(result).not.toHaveProperty('repository');
    });

    it('should not have contact field', () => {
      const result = controller.getApiList();

      expect(result).not.toHaveProperty('contact');
    });
  });
});
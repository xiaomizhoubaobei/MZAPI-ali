import { Test, TestingModule } from '@nestjs/testing';
import { ImageModerationController } from './ImageModeration.controller';
import { ImageModerationService } from '../service';
import { BadRequestException } from '@nestjs/common';

describe('ImageModerationController', () => {
  let controller: ImageModerationController;
  let service: ImageModerationService;

  const mockImageModerationService = {
    imageModeration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageModerationController],
      providers: [
        {
          provide: ImageModerationService,
          useValue: mockImageModerationService,
        },
      ],
    }).compile();

    controller = module.get<ImageModerationController>(
      ImageModerationController,
    );
    service = module.get<ImageModerationService>(ImageModerationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('imageModeration', () => {
    const validDto = {
      service: 'baselineCheck' as const,
      accessKeyId: 'test-key-id',
      accessKeySecret: 'test-key-secret',
      endpoint: 'green-cip.cn-shanghai.aliyuncs.com',
      imageUrl: 'https://example.com/image.jpg',
    };

    const mockHeaders = {
      'content-type': 'application/json',
      'user-agent': 'test-agent',
    };

    const mockResponse = {
      Code: '200',
      Message: 'OK',
      Data: {},
    };

    it('should return moderation result successfully', async () => {
      mockImageModerationService.imageModeration.mockResolvedValue(mockResponse);

      const result = await controller.imageModeration(validDto, mockHeaders);

      expect(result).toEqual(mockResponse);
      expect(service.imageModeration).toHaveBeenCalledWith(validDto);
    });

    it('should handle service errors and rethrow them', async () => {
      const error = new BadRequestException('Invalid request');
      mockImageModerationService.imageModeration.mockRejectedValue(error);

      await expect(
        controller.imageModeration(validDto, mockHeaders),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockImageModerationService.imageModeration.mockRejectedValue(error);

      await expect(
        controller.imageModeration(validDto, mockHeaders),
      ).rejects.toThrow('Unexpected error');
    });

    it('should pass headers correctly', async () => {
      mockImageModerationService.imageModeration.mockResolvedValue(mockResponse);

      await controller.imageModeration(validDto, mockHeaders);

      expect(service.imageModeration).toHaveBeenCalledWith(validDto);
    });

    it('should handle empty headers', async () => {
      mockImageModerationService.imageModeration.mockResolvedValue(mockResponse);

      const result = await controller.imageModeration(validDto, {});

      expect(result).toEqual(mockResponse);
    });

    it('should handle array headers', async () => {
      mockImageModerationService.imageModeration.mockResolvedValue(mockResponse);

      const arrayHeaders = {
        'content-type': ['application/json', 'text/plain'] as any,
      };

      const result = await controller.imageModeration(validDto, arrayHeaders);

      expect(result).toEqual(mockResponse);
    });
  });
});
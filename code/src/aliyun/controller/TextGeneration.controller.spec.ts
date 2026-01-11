import { Test, TestingModule } from '@nestjs/testing';
import { TextGenerationController } from './TextGeneration.controller';
import { TextGenerationService } from '../service';
import { BadRequestException } from '@nestjs/common';
import { TextGenerationDto, MessageRole } from '../DTO';

describe('TextGenerationController', () => {
  let controller: TextGenerationController;
  let service: TextGenerationService;

  const mockTextGenerationService = {
    textGeneration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TextGenerationController],
      providers: [
        {
          provide: TextGenerationService,
          useValue: mockTextGenerationService,
        },
      ],
    }).compile();

    controller = module.get<TextGenerationController>(TextGenerationController);
    service = module.get<TextGenerationService>(TextGenerationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('textGeneration', () => {
    const validDto: TextGenerationDto = {
      model: 'qwen-plus',
      apiKey: 'sk-test-key',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      messages: [
        {
          role: MessageRole.SYSTEM,
          content: 'You are a helpful assistant.',
        },
        {
          role: MessageRole.USER,
          content: 'Hello',
        },
      ],
    };

    const mockHeaders = {
      'content-type': 'application/json',
      'user-agent': 'test-agent',
    };

    const mockResponse = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1699012345,
      model: 'qwen-plus',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you today?',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };

    it('should return text generation result successfully', async () => {
      mockTextGenerationService.textGeneration.mockResolvedValue(mockResponse);

      const result = await controller.textGeneration(validDto, mockHeaders);

      expect(result).toEqual(mockResponse);
      expect(service.textGeneration).toHaveBeenCalledWith(validDto);
    });

    it('should handle service errors and rethrow them', async () => {
      const error = new BadRequestException('Invalid request');
      mockTextGenerationService.textGeneration.mockRejectedValue(error);

      await expect(
        controller.textGeneration(validDto, mockHeaders),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockTextGenerationService.textGeneration.mockRejectedValue(error);

      await expect(
        controller.textGeneration(validDto, mockHeaders),
      ).rejects.toThrow('Unexpected error');
    });

    it('should pass headers correctly', async () => {
      mockTextGenerationService.textGeneration.mockResolvedValue(mockResponse);

      await controller.textGeneration(validDto, mockHeaders);

      expect(service.textGeneration).toHaveBeenCalledWith(validDto);
    });

    it('should handle empty headers', async () => {
      mockTextGenerationService.textGeneration.mockResolvedValue(mockResponse);

      const result = await controller.textGeneration(validDto, {});

      expect(result).toEqual(mockResponse);
    });

    it('should handle optional parameters', async () => {
      const dtoWithOptionalParams: TextGenerationDto = {
        ...validDto,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.8,
      };

      mockTextGenerationService.textGeneration.mockResolvedValue(mockResponse);

      const result = await controller.textGeneration(dtoWithOptionalParams, mockHeaders);

      expect(result).toEqual(mockResponse);
      expect(service.textGeneration).toHaveBeenCalledWith(dtoWithOptionalParams);
    });

    it('should handle dto without baseURL (should use default)', async () => {
      const dtoWithoutBaseURL: TextGenerationDto = {
        ...validDto,
        baseURL: undefined,
      };

      mockTextGenerationService.textGeneration.mockResolvedValue(mockResponse);

      const result = await controller.textGeneration(dtoWithoutBaseURL, mockHeaders);

      expect(result).toEqual(mockResponse);
      expect(service.textGeneration).toHaveBeenCalledWith(dtoWithoutBaseURL);
    });
  });
});
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

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      const result = await controller.textGeneration(validDto, mockHeaders, mockRes as any);

      expect(result).toEqual(mockResponse);
      expect(service.textGeneration).toHaveBeenCalledWith(validDto);
    });

    it('should handle service errors and rethrow them', async () => {
      const error = new BadRequestException('Invalid request');
      mockTextGenerationService.textGeneration.mockRejectedValue(error);

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      await expect(
        controller.textGeneration(validDto, mockHeaders, mockRes as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockTextGenerationService.textGeneration.mockRejectedValue(error);

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      await expect(
        controller.textGeneration(validDto, mockHeaders, mockRes as any),
      ).rejects.toThrow('Unexpected error');
    });

    it('should pass headers correctly', async () => {
      mockTextGenerationService.textGeneration.mockResolvedValue(mockResponse);

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      await controller.textGeneration(validDto, mockHeaders, mockRes as any);

      expect(service.textGeneration).toHaveBeenCalledWith(validDto);
    });

    it('should handle empty headers', async () => {
      mockTextGenerationService.textGeneration.mockResolvedValue(mockResponse);

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      const result = await controller.textGeneration(validDto, {}, mockRes as any);

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

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      const result = await controller.textGeneration(dtoWithOptionalParams, mockHeaders, mockRes as any);

      expect(result).toEqual(mockResponse);
      expect(service.textGeneration).toHaveBeenCalledWith(dtoWithOptionalParams);
    });

    it('should handle dto without baseURL (should use default)', async () => {
      const dtoWithoutBaseURL: TextGenerationDto = {
        ...validDto,
        baseURL: undefined,
      };

      mockTextGenerationService.textGeneration.mockResolvedValue(mockResponse);

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      const result = await controller.textGeneration(dtoWithoutBaseURL, mockHeaders, mockRes as any);

      expect(result).toEqual(mockResponse);
      expect(service.textGeneration).toHaveBeenCalledWith(dtoWithoutBaseURL);
    });

    it('should handle streaming mode and send SSE events', async () => {
      const dtoWithStream: TextGenerationDto = {
        ...validDto,
        stream: true,
      };

      // 创建模拟的异步迭代器
      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'Hello' } }] };
        yield { choices: [{ delta: { content: ' there' } }] };
        yield { choices: [{ delta: { content: '!' } }] };
      })();

      mockTextGenerationService.textGeneration.mockResolvedValue(mockStream);

      // 创建 mock Response 对象
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      await controller.textGeneration(dtoWithStream, mockHeaders, mockRes as any);

      // 验证响应头设置
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');

      // 验证 SSE 数据写入
      expect(mockRes.write).toHaveBeenCalledWith('data: {"content":"Hello"}\n\n');
      expect(mockRes.write).toHaveBeenCalledWith('data: {"content":" there"}\n\n');
      expect(mockRes.write).toHaveBeenCalledWith('data: {"content":"!"}\n\n');
      expect(mockRes.write).toHaveBeenCalledWith('data: [DONE]\n\n');
      expect(mockRes.end).toHaveBeenCalled();

      expect(service.textGeneration).toHaveBeenCalledWith(dtoWithStream);
    });

    it('should handle streaming mode with empty content chunks', async () => {
      const dtoWithStream: TextGenerationDto = {
        ...validDto,
        stream: true,
      };

      // 创建模拟的异步迭代器，包含空内容
      const mockStream = (async function* () {
        yield { choices: [{}] }; // 空的 delta
        yield { choices: [{ delta: { content: 'Hello' } }] };
        yield { choices: [{ delta: {} }] }; // 空的 delta
      })();

      mockTextGenerationService.textGeneration.mockResolvedValue(mockStream);

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      await controller.textGeneration(dtoWithStream, mockHeaders, mockRes as any);

      // 只应该写入有内容的块
      expect(mockRes.write).toHaveBeenCalledWith('data: {"content":"Hello"}\n\n');
      expect(mockRes.write).toHaveBeenCalledWith('data: [DONE]\n\n');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
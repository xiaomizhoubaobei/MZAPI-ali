// Mock the openai module before importing the service
const mockCreate = jest.fn();
const mockChat = { completions: { create: mockCreate } };
const mockOpenAI = jest.fn().mockImplementation(() => ({ chat: mockChat }));

jest.mock('openai', () => ({
  __esModule: true,
  default: mockOpenAI,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { TextGenerationService } from './TextGeneration.service';
import { TextGenerationDto, MessageRole } from '../DTO';

describe('TextGenerationService', () => {
  let service: TextGenerationService;

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
    temperature: 0.7,
    max_tokens: 2048,
    top_p: 0.8,
  };

  const mockCompletionResponse = {
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TextGenerationService],
    }).compile();

    service = module.get<TextGenerationService>(TextGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('textGeneration', () => {
    it('should call OpenAI API with correct parameters', async () => {
      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(validDto);

      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: validDto.apiKey,
        baseURL: validDto.baseURL,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: validDto.model,
        messages: validDto.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: validDto.temperature,
        max_tokens: validDto.max_tokens,
        top_p: validDto.top_p,
      });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle missing optional parameters', async () => {
      const dtoWithoutOptionalParams: TextGenerationDto = {
        ...validDto,
        temperature: undefined,
        max_tokens: undefined,
        top_p: undefined,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithoutOptionalParams);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithoutOptionalParams.model,
        messages: dtoWithoutOptionalParams.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: undefined,
        max_tokens: undefined,
        top_p: undefined,
      });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should use default baseURL when not provided', async () => {
      const dtoWithoutBaseURL: TextGenerationDto = {
        ...validDto,
        baseURL: undefined,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithoutBaseURL);

      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: dtoWithoutBaseURL.apiKey,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle API errors and throw custom error', async () => {
      const apiError = new Error('API Error: Invalid API key');
      mockCreate.mockRejectedValue(apiError);

      await expect(service.textGeneration(validDto)).rejects.toThrow(
        '阿里云百炼 API 调用失败: API Error: Invalid API key',
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockCreate.mockRejectedValue(networkError);

      await expect(service.textGeneration(validDto)).rejects.toThrow(
        '阿里云百炼 API 调用失败: ECONNREFUSED',
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockCreate.mockRejectedValue(timeoutError);

      await expect(service.textGeneration(validDto)).rejects.toThrow(
        '阿里云百炼 API 调用失败: Request timeout',
      );
    });

    it('should handle multiple messages correctly', async () => {
      const dtoWithMultipleMessages: TextGenerationDto = {
        ...validDto,
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: 'You are a helpful assistant.',
          },
          {
            role: MessageRole.USER,
            content: 'Hello',
          },
          {
            role: MessageRole.ASSISTANT,
            content: 'Hi there!',
          },
          {
            role: MessageRole.USER,
            content: 'How are you?',
          },
        ],
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithMultipleMessages);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithMultipleMessages.model,
        messages: dtoWithMultipleMessages.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithMultipleMessages.temperature,
        max_tokens: dtoWithMultipleMessages.max_tokens,
        top_p: dtoWithMultipleMessages.top_p,
      });

      expect(result).toEqual(mockCompletionResponse);
    });
  });
});
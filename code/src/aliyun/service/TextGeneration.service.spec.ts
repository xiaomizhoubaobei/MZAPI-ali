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
        stream: false,
      }, {});

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
        stream: false,
      }, {});

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
        stream: false,
      }, {});

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle streaming mode', async () => {
      const dtoWithStream: TextGenerationDto = {
        ...validDto,
        stream: true,
      };

      // 创建模拟的异步迭代器
      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: 'Hello' } }],
        };
        yield {
          choices: [{ delta: { content: ' there' } }],
        };
        yield {
          choices: [{ delta: { content: '!' } }],
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithStream);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithStream.model,
        messages: dtoWithStream.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithStream.temperature,
        max_tokens: dtoWithStream.max_tokens,
        top_p: dtoWithStream.top_p,
        stream: true,
      }, {});

      expect(result).toBe(mockStream);
    });

    it('should handle enable_thinking parameter', async () => {
      const dtoWithThinking: TextGenerationDto = {
        ...validDto,
        enable_thinking: true,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithThinking);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithThinking.model,
        messages: dtoWithThinking.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithThinking.temperature,
        max_tokens: dtoWithThinking.max_tokens,
        top_p: dtoWithThinking.top_p,
        stream: false,
      }, { enable_thinking: true });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle enable_thinking with false value', async () => {
      const dtoWithThinkingFalse: TextGenerationDto = {
        ...validDto,
        enable_thinking: false,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithThinkingFalse);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithThinkingFalse.model,
        messages: dtoWithThinkingFalse.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithThinkingFalse.temperature,
        max_tokens: dtoWithThinkingFalse.max_tokens,
        top_p: dtoWithThinkingFalse.top_p,
        stream: false,
      }, { enable_thinking: false });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle stream_options with include_usage', async () => {
      const dtoWithStreamOptions: TextGenerationDto = {
        ...validDto,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: 'Hello' } }],
        };
        yield {
          choices: [{ delta: { content: ' there' } }],
        };
        yield {
          choices: [{ delta: { content: '!' } }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithStreamOptions);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithStreamOptions.model,
        messages: dtoWithStreamOptions.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithStreamOptions.temperature,
        max_tokens: dtoWithStreamOptions.max_tokens,
        top_p: dtoWithStreamOptions.top_p,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      }, {});

      expect(result).toBe(mockStream);
    });

    it('should handle enable_thinking and stream_options together', async () => {
      const dtoWithBoth: TextGenerationDto = {
        ...validDto,
        enable_thinking: true,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: 'Hello' } }],
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithBoth);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithBoth.model,
        messages: dtoWithBoth.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithBoth.temperature,
        max_tokens: dtoWithBoth.max_tokens,
        top_p: dtoWithBoth.top_p,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      }, { enable_thinking: true });

      expect(result).toBe(mockStream);
    });

    it('should handle JSON Object mode', async () => {
      const dtoWithJsonObject: TextGenerationDto = {
        ...validDto,
        response_format: {
          type: 'json_object',
        },
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithJsonObject);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithJsonObject.model,
        messages: dtoWithJsonObject.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithJsonObject.temperature,
        max_tokens: dtoWithJsonObject.max_tokens,
        top_p: dtoWithJsonObject.top_p,
        stream: false,
        response_format: {
          type: 'json_object',
        },
      }, {});

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle JSON Schema mode', async () => {
      const dtoWithJsonSchema: TextGenerationDto = {
        ...validDto,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'person',
            description: 'A person',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
              required: ['name', 'age'],
            },
          },
          strict: true,
        },
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithJsonSchema);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithJsonSchema.model,
        messages: dtoWithJsonSchema.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithJsonSchema.temperature,
        max_tokens: dtoWithJsonSchema.max_tokens,
        top_p: dtoWithJsonSchema.top_p,
        stream: false,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'person',
            description: 'A person',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
              required: ['name', 'age'],
            },
          },
          strict: true,
        },
      }, {});

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle JSON Object mode with streaming', async () => {
      const dtoWithJsonObjectStream: TextGenerationDto = {
        ...validDto,
        response_format: {
          type: 'json_object',
        },
        stream: true,
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: '{"name":' } }],
        };
        yield {
          choices: [{ delta: { content: ' "John"}' } }],
        };
        yield {
          choices: [{ delta: { content: ', "age": 30}' } }],
        };
        yield {
          choices: [{ delta: { content: '}' } }],
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithJsonObjectStream);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithJsonObjectStream.model,
        messages: dtoWithJsonObjectStream.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithJsonObjectStream.temperature,
        max_tokens: dtoWithJsonObjectStream.max_tokens,
        top_p: dtoWithJsonObjectStream.top_p,
        stream: true,
        response_format: {
          type: 'json_object',
        },
      }, {});

      expect(result).toBe(mockStream);
    });

    it('should handle JSON Schema mode with enable_thinking', async () => {
      const dtoWithJsonSchemaThinking: TextGenerationDto = {
        ...validDto,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'product',
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                price: { type: 'number' },
              },
            },
          },
          strict: true,
        },
        enable_thinking: true,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithJsonSchemaThinking);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithJsonSchemaThinking.model,
        messages: dtoWithJsonSchemaThinking.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithJsonSchemaThinking.temperature,
        max_tokens: dtoWithJsonSchemaThinking.max_tokens,
        top_p: dtoWithJsonSchemaThinking.top_p,
        stream: false,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'product',
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                price: { type: 'number' },
              },
            },
          },
          strict: true,
        },
      }, { enable_thinking: true });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle partial completion mode', async () => {
      const dtoWithPartial: TextGenerationDto = {
        ...validDto,
        messages: [
          {
            role: MessageRole.USER,
            content: '请补全这个斐波那契函数，勿添加其它内容',
          },
          {
            role: MessageRole.ASSISTANT,
            content: 'def calculate_fibonacci(n):\n    if n <= 1:\n        return n\n    else:\n',
            partial: true,
          },
        ],
      };

      mockCreate.mockResolvedValue({
        ...mockCompletionResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '        return calculate_fibonacci(n - 1) + calculate_fibonacci(n - 2)',
            },
            finish_reason: 'stop',
          },
        ],
      });

      const result = await service.textGeneration(dtoWithPartial);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithPartial.model,
        messages: [
          {
            role: MessageRole.USER,
            content: '请补全这个斐波那契函数，勿添加其它内容',
          },
          {
            role: MessageRole.ASSISTANT,
            content: 'def calculate_fibonacci(n):\n    if n <= 1:\n        return n\n    else:\n',
            partial: true,
          },
        ],
        temperature: dtoWithPartial.temperature,
        max_tokens: dtoWithPartial.max_tokens,
        top_p: dtoWithPartial.top_p,
        stream: false,
      }, {});

      expect(result).toBeDefined();
    });

    it('should handle partial completion with streaming', async () => {
      const dtoWithPartialStream: TextGenerationDto = {
        ...validDto,
        messages: [
          {
            role: MessageRole.USER,
            content: '请补全这个函数',
          },
          {
            role: MessageRole.ASSISTANT,
            content: 'function hello() {',
            partial: true,
          },
        ],
        stream: true,
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: '\n    console.log("Hello, World!");' } }],
        };
        yield {
          choices: [{ delta: { content: '\n}' } }],
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithPartialStream);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithPartialStream.model,
        messages: [
          {
            role: MessageRole.USER,
            content: '请补全这个函数',
          },
          {
            role: MessageRole.ASSISTANT,
            content: 'function hello() {',
            partial: true,
          },
        ],
        temperature: dtoWithPartialStream.temperature,
        max_tokens: dtoWithPartialStream.max_tokens,
        top_p: dtoWithPartialStream.top_p,
        stream: true,
      }, {});

      expect(result).toBe(mockStream);
    });

    it('should handle partial completion with enable_thinking', async () => {
      const dtoWithPartialThinking: TextGenerationDto = {
        ...validDto,
        messages: [
          {
            role: MessageRole.USER,
            content: '请补全这个算法',
          },
          {
            role: MessageRole.ASSISTANT,
            content: 'for (let i = 0;',
            partial: true,
          },
        ],
        enable_thinking: true,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithPartialThinking);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithPartialThinking.model,
        messages: [
          {
            role: MessageRole.USER,
            content: '请补全这个算法',
          },
          {
            role: MessageRole.ASSISTANT,
            content: 'for (let i = 0;',
            partial: true,
          },
        ],
        temperature: dtoWithPartialThinking.temperature,
        max_tokens: dtoWithPartialThinking.max_tokens,
        top_p: dtoWithPartialThinking.top_p,
        stream: false,
      }, { enable_thinking: true });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle partial completion with JSON Schema mode', async () => {
      const dtoWithPartialJsonSchema: TextGenerationDto = {
        ...validDto,
        messages: [
          {
            role: MessageRole.USER,
            content: '请补全这个 JSON',
          },
          {
            role: MessageRole.ASSISTANT,
            content: '{"name": "John", "age":',
            partial: true,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'person',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
            },
          },
          strict: true,
        },
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithPartialJsonSchema);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithPartialJsonSchema.model,
        messages: [
          {
            role: MessageRole.USER,
            content: '请补全这个 JSON',
          },
          {
            role: MessageRole.ASSISTANT,
            content: '{"name": "John", "age":',
            partial: true,
          },
        ],
        temperature: dtoWithPartialJsonSchema.temperature,
        max_tokens: dtoWithPartialJsonSchema.max_tokens,
        top_p: dtoWithPartialJsonSchema.top_p,
        stream: false,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'person',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
            },
          },
          strict: true,
        },
      }, {});

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle enable_search parameter', async () => {
      const dtoWithSearch: TextGenerationDto = {
        ...validDto,
        enable_search: true,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithSearch);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithSearch.model,
        messages: dtoWithSearch.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithSearch.temperature,
        max_tokens: dtoWithSearch.max_tokens,
        top_p: dtoWithSearch.top_p,
        stream: false,
      }, { enable_search: true });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle enable_search with false value', async () => {
      const dtoWithSearchFalse: TextGenerationDto = {
        ...validDto,
        enable_search: false,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithSearchFalse);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithSearchFalse.model,
        messages: dtoWithSearchFalse.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithSearchFalse.temperature,
        max_tokens: dtoWithSearchFalse.max_tokens,
        top_p: dtoWithSearchFalse.top_p,
        stream: false,
      }, { enable_search: false });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle enable_search with streaming', async () => {
      const dtoWithSearchStream: TextGenerationDto = {
        ...validDto,
        enable_search: true,
        stream: true,
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: '根据搜索结果，' } }],
        };
        yield {
          choices: [{ delta: { content: '这是相关信息。' } }],
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithSearchStream);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithSearchStream.model,
        messages: dtoWithSearchStream.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithSearchStream.temperature,
        max_tokens: dtoWithSearchStream.max_tokens,
        top_p: dtoWithSearchStream.top_p,
        stream: true,
      }, { enable_search: true });

      expect(result).toBe(mockStream);
    });

    it('should handle enable_search with enable_thinking', async () => {
      const dtoWithSearchThinking: TextGenerationDto = {
        ...validDto,
        enable_search: true,
        enable_thinking: true,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithSearchThinking);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithSearchThinking.model,
        messages: dtoWithSearchThinking.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithSearchThinking.temperature,
        max_tokens: dtoWithSearchThinking.max_tokens,
        top_p: dtoWithSearchThinking.top_p,
        stream: false,
      }, { enable_thinking: true, enable_search: true });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle enable_search with JSON Object mode', async () => {
      const dtoWithSearchJson: TextGenerationDto = {
        ...validDto,
        enable_search: true,
        response_format: {
          type: 'json_object',
        },
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithSearchJson);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithSearchJson.model,
        messages: dtoWithSearchJson.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithSearchJson.temperature,
        max_tokens: dtoWithSearchJson.max_tokens,
        top_p: dtoWithSearchJson.top_p,
        stream: false,
        response_format: {
          type: 'json_object',
        },
      }, { enable_search: true });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle all advanced features together', async () => {
      const dtoWithAllFeatures: TextGenerationDto = {
        ...validDto,
        enable_search: true,
        enable_thinking: true,
        stream: true,
        stream_options: {
          include_usage: true,
        },
        response_format: {
          type: 'json_object',
        },
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: '{"result":' } }],
        };
        yield {
          choices: [{ delta: { content: ' "data"}' } }],
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithAllFeatures);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithAllFeatures.model,
        messages: dtoWithAllFeatures.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithAllFeatures.temperature,
        max_tokens: dtoWithAllFeatures.max_tokens,
        top_p: dtoWithAllFeatures.top_p,
        stream: true,
        stream_options: {
          include_usage: true,
        },
        response_format: {
          type: 'json_object',
        },
      }, { enable_thinking: true, enable_search: true });

      expect(result).toBe(mockStream);
    });

    it('should handle enable_code_interpreter parameter', async () => {
      const dtoWithCodeInterpreter: TextGenerationDto = {
        ...validDto,
        enable_code_interpreter: true,
        enable_thinking: true,
        stream: true,
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: '我需要计算 123 的 21 次方。' } }],
        };
        yield {
          choices: [{ delta: { content: '让我使用代码来计算：' } }],
        };
        yield {
          choices: [{ delta: { content: '```python\nprint(123 ** 21)\n```' } }],
        };
        yield {
          choices: [{ delta: { content: '\n结果是：' } }],
        };
        yield {
          choices: [{ delta: { content: '123 的 21 次方是 123^21 = 123^21' } }],
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithCodeInterpreter);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithCodeInterpreter.model,
        messages: dtoWithCodeInterpreter.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithCodeInterpreter.temperature,
        max_tokens: dtoWithCodeInterpreter.max_tokens,
        top_p: dtoWithCodeInterpreter.top_p,
        stream: true,
      }, { enable_thinking: true, enable_code_interpreter: true });

      expect(result).toBe(mockStream);
    });

    it('should handle enable_code_interpreter with false value', async () => {
      const dtoWithCodeInterpreterFalse: TextGenerationDto = {
        ...validDto,
        enable_code_interpreter: false,
      };

      mockCreate.mockResolvedValue(mockCompletionResponse);

      const result = await service.textGeneration(dtoWithCodeInterpreterFalse);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithCodeInterpreterFalse.model,
        messages: dtoWithCodeInterpreterFalse.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithCodeInterpreterFalse.temperature,
        max_tokens: dtoWithCodeInterpreterFalse.max_tokens,
        top_p: dtoWithCodeInterpreterFalse.top_p,
        stream: false,
      }, { enable_code_interpreter: false });

      expect(result).toEqual(mockCompletionResponse);
    });

    it('should handle enable_code_interpreter with enable_search', async () => {
      const dtoWithCodeSearch: TextGenerationDto = {
        ...validDto,
        enable_code_interpreter: true,
        enable_search: true,
        enable_thinking: true,
        stream: true,
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: '让我搜索并计算。' } }],
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithCodeSearch);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithCodeSearch.model,
        messages: dtoWithCodeSearch.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithCodeSearch.temperature,
        max_tokens: dtoWithCodeSearch.max_tokens,
        top_p: dtoWithCodeSearch.top_p,
        stream: true,
      }, { enable_thinking: true, enable_search: true, enable_code_interpreter: true });

      expect(result).toBe(mockStream);
    });

    it('should handle enable_code_interpreter with stream_options', async () => {
      const dtoWithCodeOptions: TextGenerationDto = {
        ...validDto,
        enable_code_interpreter: true,
        enable_thinking: true,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: '计算中...' } }],
        };
        yield {
          choices: [{ delta: { content: '完成' } }],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 30,
            total_tokens: 50,
          },
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithCodeOptions);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithCodeOptions.model,
        messages: dtoWithCodeOptions.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithCodeOptions.temperature,
        max_tokens: dtoWithCodeOptions.max_tokens,
        top_p: dtoWithCodeOptions.top_p,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      }, { enable_thinking: true, enable_code_interpreter: true });

      expect(result).toBe(mockStream);
    });

    it('should handle all features including enable_code_interpreter', async () => {
      const dtoWithAllIncludingCode: TextGenerationDto = {
        ...validDto,
        enable_code_interpreter: true,
        enable_search: true,
        enable_thinking: true,
        stream: true,
        stream_options: {
          include_usage: true,
        },
        response_format: {
          type: 'json_object',
        },
      };

      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: '{"result":' } }],
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const result = await service.textGeneration(dtoWithAllIncludingCode);

      expect(mockCreate).toHaveBeenCalledWith({
        model: dtoWithAllIncludingCode.model,
        messages: dtoWithAllIncludingCode.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: dtoWithAllIncludingCode.temperature,
        max_tokens: dtoWithAllIncludingCode.max_tokens,
        top_p: dtoWithAllIncludingCode.top_p,
        stream: true,
        stream_options: {
          include_usage: true,
        },
        response_format: {
          type: 'json_object',
        },
      }, { enable_thinking: true, enable_search: true, enable_code_interpreter: true });

      expect(result).toBe(mockStream);
    });
  });
});
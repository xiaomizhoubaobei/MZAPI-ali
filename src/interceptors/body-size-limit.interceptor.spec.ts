import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import { BodySizeLimitInterceptor } from './body-size-limit.interceptor';

describe('BodySizeLimitInterceptor', () => {
  let interceptor: BodySizeLimitInterceptor;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    // 设置默认最大请求体大小为 1MB 用于测试
    process.env.MAX_BODY_SIZE_MB = '1';

    const module: TestingModule = await Test.createTestingModule({
      providers: [BodySizeLimitInterceptor],
    }).compile();

    interceptor = module.get<BodySizeLimitInterceptor>(BodySizeLimitInterceptor);

    // Mock Logger 方法
    loggerWarnSpy = jest
      .spyOn(interceptor['logger'], 'warn')
      .mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.MAX_BODY_SIZE_MB;
  });

  // 辅助函数：创建测试上下文
  const createMockContext = (
    method: string,
    url: string,
    contentLength?: string,
  ): { context: ExecutionContext; response: any } => {
    const request = {
      method,
      url,
      headers: contentLength !== undefined ? { 'content-length': contentLength } : {},
    };
    const response = {
      setHeader: jest.fn(),
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    return { context, response };
  };

  // 辅助函数：创建 CallHandler
  const createMockCallHandler = (data: any): CallHandler => {
    return {
      handle: () => of(data),
    } as CallHandler;
  };

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should use default limit of 10MB when env var is not set', () => {
    delete process.env.MAX_BODY_SIZE_MB;
    const newInterceptor = new BodySizeLimitInterceptor();
    expect(newInterceptor['maxBodySize']).toBe(10 * 1024 * 1024);
  });

  it('should use custom limit from environment variable', () => {
    process.env.MAX_BODY_SIZE_MB = '5';
    const newInterceptor = new BodySizeLimitInterceptor();
    expect(newInterceptor['maxBodySize']).toBe(5 * 1024 * 1024);
  });

  it('should pass through requests with body size under limit', (done) => {
    const { context, response } = createMockContext('POST', '/api/upload', '1024');
    const next = createMockCallHandler({ data: 'test' });

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(data).toEqual({ data: 'test' });
        expect(loggerWarnSpy).not.toHaveBeenCalled();
        expect(response.setHeader).toHaveBeenCalledWith(
          'X-Max-Body-Size',
          '1 MB',
        );
        done();
      },
    });
  });

  it('should reject requests with body size over limit', (done) => {
    const { context } = createMockContext(
      'POST',
      '/api/upload',
      (2 * 1024 * 1024).toString(),
    );
    const next = createMockCallHandler({ data: 'test' });

    try {
      interceptor.intercept(context, next).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
          expect(error.message).toContain('Payload Too Large');
          expect(error.message).toContain('exceeds limit');
          expect(loggerWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('exceeds limit'),
          );
          done();
        },
      });
    } catch (error) {
      // 拦截器在同步阶段就会抛出异常
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(loggerWarnSpy).toHaveBeenCalled();
      done();
    }
  });

  it('should allow requests without Content-Length header', (done) => {
    const { context } = createMockContext('POST', '/api/upload');
    const next = createMockCallHandler({ data: 'test' });

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(data).toEqual({ data: 'test' });
        expect(loggerWarnSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should handle GET requests without body', (done) => {
    const { context } = createMockContext('GET', '/api/data');
    const next = createMockCallHandler({ data: 'test' });

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(data).toEqual({ data: 'test' });
        expect(loggerWarnSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should format bytes correctly', () => {
    expect(interceptor['formatBytes'](0)).toBe('0 Bytes');
    expect(interceptor['formatBytes'](1024)).toBe('1 KB');
    expect(interceptor['formatBytes'](1024 * 1024)).toBe('1 MB');
    expect(interceptor['formatBytes'](1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should log warning with request details when limit exceeded', (done) => {
    const { context } = createMockContext(
      'PUT',
      '/api/upload',
      (2 * 1024 * 1024).toString(),
    );
    const next = createMockCallHandler({ data: 'test' });

    try {
      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(loggerWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('PUT /api/upload'),
          );
          expect(loggerWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('exceeds limit'),
          );
          done();
        },
      });
    } catch (error) {
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('PUT /api/upload'),
      );
      done();
    }
  });

  it('should pass through data unchanged', (done) => {
    const { context } = createMockContext('POST', '/api/test', '512');
    const testData = { key: 'value', nested: { item: 1 } };
    const next = createMockCallHandler(testData);

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(data).toEqual(testData);
        done();
      },
    });
  });
});
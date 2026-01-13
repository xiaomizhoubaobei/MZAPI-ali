import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError, timer, take } from 'rxjs';
import { TimeoutInterceptor } from './timeout.interceptor';

describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    // 设置默认超时时间为 100ms 用于测试
    process.env.REQUEST_TIMEOUT_MS = '100';

    const module: TestingModule = await Test.createTestingModule({
      providers: [TimeoutInterceptor],
    }).compile();

    interceptor = module.get<TimeoutInterceptor>(TimeoutInterceptor);

    loggerWarnSpy = jest
      .spyOn(interceptor['logger'], 'warn')
      .mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.REQUEST_TIMEOUT_MS;
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should use default timeout of 30 seconds when env var is not set', () => {
    delete process.env.REQUEST_TIMEOUT_MS;
    const newInterceptor = new TimeoutInterceptor();
    expect(newInterceptor['timeoutMs']).toBe(30000);
  });

  it('should use custom timeout from environment variable', () => {
    process.env.REQUEST_TIMEOUT_MS = '5000';
    const newInterceptor = new TimeoutInterceptor();
    expect(newInterceptor['timeoutMs']).toBe(5000);
  });

  it('should pass through successful requests', (done) => {
    const request = {
      method: 'GET',
      url: '/api/test',
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(data).toEqual({ data: 'test' });
        expect(loggerWarnSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should timeout slow requests with 504 status', (done) => {
    const request = {
      method: 'POST',
      url: '/api/slow',
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    // 创建一个需要 200ms 的请求（超过 100ms 超时）
    const next = {
      handle: () => timer(200).pipe(take(1)),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      error: (error) => {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
        expect(error.message).toContain('Gateway Timeout');
        expect(error.message).toContain('100ms');
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Request timeout'),
        );
        done();
      },
    });
  });

  it('should pass through other errors unchanged', (done) => {
    const request = {
      method: 'GET',
      url: '/api/error',
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const error = new Error('Some other error');
    const next = {
      handle: () => throwError(() => error),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        expect(err.message).toBe('Some other error');
        expect(loggerWarnSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should log timeout warnings with request details', (done) => {
    const request = {
      method: 'PUT',
      url: '/api/timeout',
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => timer(200).pipe(take(1)),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      error: () => {
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('PUT /api/timeout'),
        );
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('exceeded 100ms'),
        );
        done();
      },
    });
  });

  it('should handle requests that complete within timeout', (done) => {
    const request = {
      method: 'GET',
      url: '/api/fast',
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    // 创建一个需要 50ms 的请求（在 100ms 超时内）
    const next = {
      handle: () => timer(50).pipe(take(1)),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(loggerWarnSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

interface MockRequest {
  method: string;
  url: string;
  requestId?: string;
  headers: Record<string, string>;
}

interface MockResponse {
  statusCode: number;
}

const createMockContext = (
  request: MockRequest,
  response: MockResponse,
): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
};

const createMockCallHandler = (data: any, shouldError = false): CallHandler => {
  return {
    handle: () => (shouldError ? throwError(() => data) : of(data)),
  } as CallHandler;
};

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);

    // Mock Logger methods
    loggerLogSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation();
    loggerErrorSpy = jest
      .spyOn(interceptor['logger'], 'error')
      .mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log request and response on success', (done) => {
    const request: MockRequest = {
      method: 'GET',
      url: '/api/test',
      requestId: 'test-request-id',
      headers: {
        'user-agent': 'Mozilla/5.0 Test Browser',
      },
    };
    const response: MockResponse = {
      statusCode: 200,
    };
    const context = createMockContext(request, response);
    const next = createMockCallHandler({ data: 'test' });

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(loggerLogSpy).toHaveBeenCalledTimes(2);

        // First log: incoming request
        const firstLogCall = loggerLogSpy.mock.calls[0][0];
        expect(firstLogCall).toContain('[test-request-id]');
        expect(firstLogCall).toContain('GET');
        expect(firstLogCall).toContain('/api/test');
        expect(firstLogCall).toContain('Mozilla/5.0 Test Browser');

        // Second log: successful response
        const secondLogCall = loggerLogSpy.mock.calls[1][0];
        expect(secondLogCall).toContain('[test-request-id]');
        expect(secondLogCall).toContain('GET');
        expect(secondLogCall).toContain('/api/test');
        expect(secondLogCall).toContain('200');
        expect(secondLogCall).toMatch(/\d+ms/);

        expect(data).toEqual({ data: 'test' });
        done();
      },
    });
  });

  it('should log request with dash when requestId is missing', (done) => {
    const request: MockRequest = {
      method: 'POST',
      url: '/api/create',
      headers: {},
    };
    const response: MockResponse = {
      statusCode: 201,
    };
    const context = createMockContext(request, response);
    const next = createMockCallHandler({ id: 1 });

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        const firstLogCall = loggerLogSpy.mock.calls[0][0];
        expect(firstLogCall).toContain('[-]');
        expect(firstLogCall).toContain('POST');
        expect(firstLogCall).toContain('/api/create');

        const secondLogCall = loggerLogSpy.mock.calls[1][0];
        expect(secondLogCall).toContain('[-]');
        expect(secondLogCall).toContain('POST');
        expect(secondLogCall).toContain('/api/create');
        expect(secondLogCall).toContain('201');

        expect(data).toEqual({ id: 1 });
        done();
      },
    });
  });

  it('should log request and response with truncated user-agent', (done) => {
    const longUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    const request: MockRequest = {
      method: 'GET',
      url: '/api/long',
      requestId: 'req-123',
      headers: {
        'user-agent': longUserAgent,
      },
    };
    const response: MockResponse = {
      statusCode: 200,
    };
    const context = createMockContext(request, response);
    const next = createMockCallHandler({ data: 'test' });

    interceptor.intercept(context, next).subscribe({
      next: () => {
        const firstLogCall = loggerLogSpy.mock.calls[0][0];
        expect(firstLogCall).toContain('[req-123]');
        expect(firstLogCall).toContain('...');
        expect(firstLogCall.length).toBeLessThan(longUserAgent.length + 50);
        done();
      },
    });
  });

  it('should log error on failure', (done) => {
    const request: MockRequest = {
      method: 'GET',
      url: '/api/error',
      requestId: 'error-req',
      headers: {},
    };
    const response: MockResponse = {
      statusCode: 500,
    };
    const context = createMockContext(request, response);
    const error = { status: 500, message: 'Internal Server Error' };
    const next = createMockCallHandler(error, true);

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(loggerLogSpy).toHaveBeenCalledTimes(1);
        expect(loggerErrorSpy).toHaveBeenCalledTimes(1);

        const errorLogCall = loggerErrorSpy.mock.calls[0][0];
        expect(errorLogCall).toContain('[error-req]');
        expect(errorLogCall).toContain('GET');
        expect(errorLogCall).toContain('/api/error');
        expect(errorLogCall).toContain('500');
        expect(errorLogCall).toMatch(/\d+ms/);
        expect(errorLogCall).toContain('Internal Server Error');

        done();
      },
    });
  });

  it('should log error with default status code if not provided', (done) => {
    const request: MockRequest = {
      method: 'DELETE',
      url: '/api/delete',
      requestId: 'del-req',
      headers: {},
    };
    const response: MockResponse = {
      statusCode: 200,
    };
    const context = createMockContext(request, response);
    const error = { message: 'Not Found' };
    const next = createMockCallHandler(error, true);

    interceptor.intercept(context, next).subscribe({
      error: () => {
        const errorLogCall = loggerErrorSpy.mock.calls[0][0];
        expect(errorLogCall).toContain('[del-req]');
        expect(errorLogCall).toContain('DELETE');
        expect(errorLogCall).toContain('/api/delete');
        expect(errorLogCall).toContain('500'); // Default status code
        expect(errorLogCall).toContain('Not Found');

        done();
      },
    });
  });

  it('should pass through data unchanged', (done) => {
    const request: MockRequest = {
      method: 'GET',
      url: '/api/test',
      requestId: 'test-id',
      headers: {},
    };
    const response: MockResponse = {
      statusCode: 200,
    };
    const context = createMockContext(request, response);
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
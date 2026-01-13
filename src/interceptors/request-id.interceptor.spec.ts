import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { RequestIdInterceptor } from './request-id.interceptor';

interface MockRequest {
  headers: Record<string, string>;
  requestId?: string;
}

interface MockResponse {
  setHeader: jest.Mock;
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

const createMockCallHandler = (data: any): CallHandler => {
  return {
    handle: () => of(data),
  } as CallHandler;
};

describe('RequestIdInterceptor', () => {
  let interceptor: RequestIdInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestIdInterceptor],
    }).compile();

    interceptor = module.get<RequestIdInterceptor>(RequestIdInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should generate a new request ID if not present in headers', (done) => {
    const request: MockRequest = {
      headers: {},
    };
    const response: MockResponse = {
      setHeader: jest.fn(),
    };
    const context = createMockContext(request, response);
    const next = createMockCallHandler({ data: 'test' });

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(request.requestId).toBeDefined();
        expect(typeof request.requestId).toBe('string');
        expect(request.requestId && request.requestId.length).toBeGreaterThan(0);
        expect(response.setHeader).toHaveBeenCalledWith(
          'X-Request-Id',
          request.requestId,
        );
        expect(data).toEqual({ data: 'test' });
        done();
      },
    });
  });

  it('should use existing request ID from headers', (done) => {
    const existingRequestId = 'existing-request-id-123';
    const request: MockRequest = {
      headers: {
        'x-request-id': existingRequestId,
      },
    };
    const response: MockResponse = {
      setHeader: jest.fn(),
    };
    const context = createMockContext(request, response);
    const next = createMockCallHandler({ data: 'test' });

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(request.requestId).toBe(existingRequestId);
        expect(response.setHeader).toHaveBeenCalledWith(
          'X-Request-Id',
          existingRequestId,
        );
        expect(data).toEqual({ data: 'test' });
        done();
      },
    });
  });

  it('should pass through data unchanged', (done) => {
    const request: MockRequest = {
      headers: {},
    };
    const response: MockResponse = {
      setHeader: jest.fn(),
    };
    const context = createMockContext(request, response);
    const testData = { key: 'value' };
    const next = createMockCallHandler(testData);

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(data).toEqual(testData);
        done();
      },
    });
  });

  it('should generate unique request IDs for multiple requests', (done) => {
    const request1: MockRequest = { headers: {} };
    const request2: MockRequest = { headers: {} };
    const response1: MockResponse = { setHeader: jest.fn() };
    const response2: MockResponse = { setHeader: jest.fn() };

    const context1 = createMockContext(request1, response1);
    const context2 = createMockContext(request2, response2);
    const next = createMockCallHandler({ data: 'test' });

    interceptor.intercept(context1, next).subscribe({
      next: () => {
        interceptor.intercept(context2, next).subscribe({
          next: () => {
            expect(request1.requestId).toBeDefined();
            expect(request2.requestId).toBeDefined();
            expect(request1.requestId).not.toBe(request2.requestId);
            done();
          },
        });
      },
    });
  });

  describe('official API RequestId handling', () => {
    const testOfficialRequestId = (
      requestHeaders: Record<string, string>,
      responseData: any,
      expectedRequestId: string,
      done: jest.DoneCallback,
    ) => {
      const request: MockRequest = {
        headers: requestHeaders,
      };
      const response: MockResponse = {
        setHeader: jest.fn(),
      };
      const context = createMockContext(request, response);
      const next = createMockCallHandler(responseData);

      interceptor.intercept(context, next).subscribe({
        next: (data) => {
          expect(request.requestId).toBe(expectedRequestId);
          expect(response.setHeader).toHaveBeenCalledWith(
            'X-Request-Id',
            expectedRequestId,
          );
          expect(data).toEqual(responseData);
          done();
        },
      });
    };

    it('should use official RequestId from API response', (done) => {
      const officialRequestId = 'official-api-request-id-456';
      testOfficialRequestId(
        {},
        { RequestId: officialRequestId, data: 'test' },
        officialRequestId,
        done,
      );
    });

    it('should update request ID when official API returns RequestId', (done) => {
      const initialRequestId = 'initial-request-id';
      const officialRequestId = 'official-api-request-id-789';
      testOfficialRequestId(
        { 'x-request-id': initialRequestId },
        { RequestId: officialRequestId, data: 'test' },
        officialRequestId,
        done,
      );
    });

    it('should not modify response if RequestId is not in API response', (done) => {
      const initialRequestId = 'initial-request-id';
      testOfficialRequestId(
        { 'x-request-id': initialRequestId },
        { data: 'test' },
        initialRequestId,
        done,
      );
    });
  });
});
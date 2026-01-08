import { Test, TestingModule } from '@nestjs/testing';
import { CorsInterceptor } from './cors.interceptor';
import { TestInterceptorUtils } from './test-utils';

describe('CorsInterceptor', () => {
  let interceptor: CorsInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorsInterceptor],
    }).compile();

    interceptor = module.get<CorsInterceptor>(CorsInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set CORS headers for regular requests', async () => {
    const setHeaderMock = jest.fn();
    const responseMock = {
      setHeader: setHeaderMock,
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const requestMock = { method: 'POST' };
    const context = TestInterceptorUtils.createMockContext(requestMock, responseMock);
    const testData = { key: 'value' };
    const next = TestInterceptorUtils.createMockNext(testData);

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Max-Age', '3600');
      expect(data).toEqual(testData);
    });
  });

  it('should handle OPTIONS preflight request', async () => {
    const setHeaderMock = jest.fn();
    const statusMock = jest.fn().mockReturnThis();
    const sendMock = jest.fn();
    const responseMock = {
      setHeader: setHeaderMock,
      status: statusMock,
      send: sendMock,
    };
    const requestMock = { method: 'OPTIONS' };
    const context = TestInterceptorUtils.createMockContext(requestMock, responseMock);
    const next = TestInterceptorUtils.createMockNext({ data: 'test' });

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST');
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Max-Age', '3600');
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });
  });

  it('should pass through data unchanged for POST requests', async () => {
    const responseMock = {
      setHeader: jest.fn(),
    };
    const requestMock = { method: 'POST' };
    const context = TestInterceptorUtils.createMockContext(requestMock, responseMock);
    const testData = { message: 'success' };
    const next = TestInterceptorUtils.createMockNext(testData);

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(data).toEqual(testData);
    });
  });

  it('should set Access-Control-Allow-Origin to * for any request', async () => {
    const setHeaderMock = jest.fn();
    const responseMock = { setHeader: setHeaderMock };
    const requestMock = { method: 'POST' };
    const context = TestInterceptorUtils.createMockContext(requestMock, responseMock);
    const next = TestInterceptorUtils.createMockNext({});

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, () => {
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });
  });
});
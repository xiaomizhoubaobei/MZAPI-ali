import { Test, TestingModule } from '@nestjs/testing';
import { SecurityHeadersInterceptor } from './security-headers.interceptor';
import { TestInterceptorUtils } from './test-utils';

describe('SecurityHeadersInterceptor', () => {
  let interceptor: SecurityHeadersInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityHeadersInterceptor],
    }).compile();

    interceptor = module.get<SecurityHeadersInterceptor>(SecurityHeadersInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set all security headers', async () => {
    const setHeaderMock = jest.fn();
    const responseMock = {
      setHeader: setHeaderMock,
    };
    const context = TestInterceptorUtils.createMockContextWithResponse(responseMock);
    const testData = { key: 'value' };
    const next = TestInterceptorUtils.createMockNext(testData);

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(setHeaderMock).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(setHeaderMock).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block',
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin',
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self' *.mizhoubaobei.top; script-src 'self' *.mizhoubaobei.top 'unsafe-inline' 'unsafe-eval'; style-src 'self' *.mizhoubaobei.top 'unsafe-inline'; img-src 'self' *.mizhoubaobei.top data: https:; font-src 'self'*.mizhoubaobei.top data:; connect-src 'self' *.mizhoubaobei.top https:; frame-ancestors 'none';",
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()',
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
      expect(data).toEqual(testData);
    });
  });

  it('should pass through data unchanged', async () => {
    const context = TestInterceptorUtils.createMockContextWithResponse();
    const testData = { message: 'success' };
    const next = TestInterceptorUtils.createMockNext(testData);

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(data).toEqual(testData);
    });
  });

  it('should set X-Frame-Options to DENY', async () => {
    const setHeaderMock = jest.fn();
    const responseMock = {
      setHeader: setHeaderMock,
    };
    const context = TestInterceptorUtils.createMockContextWithResponse(responseMock);
    const next = TestInterceptorUtils.createMockNext({});

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, () => {
      expect(setHeaderMock).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });
  });

  it('should set X-Content-Type-Options to nosniff', async () => {
    const setHeaderMock = jest.fn();
    const responseMock = {
      setHeader: setHeaderMock,
    };
    const context = TestInterceptorUtils.createMockContextWithResponse(responseMock);
    const next = TestInterceptorUtils.createMockNext({});

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, () => {
      expect(setHeaderMock).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
    });
  });

  it('should set X-XSS-Protection correctly', async () => {
    const setHeaderMock = jest.fn();
    const responseMock = {
      setHeader: setHeaderMock,
    };
    const context = TestInterceptorUtils.createMockContextWithResponse(responseMock);
    const next = TestInterceptorUtils.createMockNext({});

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, () => {
      expect(setHeaderMock).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block',
      );
    });
  });
});
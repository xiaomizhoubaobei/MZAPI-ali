import { Test, TestingModule } from '@nestjs/testing';
import { GzipInterceptor } from './gzip.interceptor';
import { TestInterceptorUtils } from './test-utils';

describe('GzipInterceptor', () => {
  let interceptor: GzipInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GzipInterceptor],
    }).compile();

    interceptor = module.get<GzipInterceptor>(GzipInterceptor);
  });

  const createGzipTestContext = (acceptEncoding: string | string[] | {}) => {
    const setHeaderMock = jest.fn();
    const requestMock = {
      headers: acceptEncoding ? { 'accept-encoding': acceptEncoding } : {},
    };
    const responseMock = {
      setHeader: setHeaderMock,
    };
    const context = TestInterceptorUtils.createMockContext(requestMock, responseMock);
    return { context, setHeaderMock };
  };

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set Content-Encoding header when client accepts gzip', async () => {
    const { context, setHeaderMock } = createGzipTestContext('gzip');
    const next = TestInterceptorUtils.createMockNext({ data: 'test' });

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, () => {
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Encoding',
        'gzip',
      );
    });
  });

  it('should compress string data', async () => {
    const { context } = createGzipTestContext('gzip');
    const testData = 'test data '.repeat(100);
    const next = TestInterceptorUtils.createMockNext(testData);

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(Buffer.isBuffer(data)).toBe(true);
      expect(data.length).toBeLessThan(testData.length);
    });
  });

  it('should compress object data', async () => {
    const { context } = createGzipTestContext('gzip');
    const testData = { key: 'value' };
    const next = TestInterceptorUtils.createMockNext(testData);

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(Buffer.isBuffer(data)).toBe(true);
    });
  });

  it('should not compress when client does not accept gzip', async () => {
    const { context, setHeaderMock } = createGzipTestContext('deflate');
    const testData = { data: 'test' };
    const next = TestInterceptorUtils.createMockNext(testData);

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(setHeaderMock).not.toHaveBeenCalledWith(
        'Content-Encoding',
        'gzip',
      );
      expect(data).toEqual(testData);
    });
  });

  it('should not compress when accept-encoding header is missing', async () => {
    const { context, setHeaderMock } = createGzipTestContext({});
    const testData = { data: 'test' };
    const next = TestInterceptorUtils.createMockNext(testData);

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(setHeaderMock).not.toHaveBeenCalledWith(
        'Content-Encoding',
        'gzip',
      );
      expect(data).toEqual(testData);
    });
  });

  it('should handle gzip in any case', async () => {
    const { context, setHeaderMock } = createGzipTestContext('GZIP');
    const next = TestInterceptorUtils.createMockNext({ data: 'test' });

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, () => {
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Encoding',
        'gzip',
      );
    });
  });

  it('should handle gzip in mixed case', async () => {
    const { context, setHeaderMock } = createGzipTestContext('deflate, Gzip, br');
    const next = TestInterceptorUtils.createMockNext({ data: 'test' });

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, () => {
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Encoding',
        'gzip',
      );
    });
  });

  it('should handle array accept-encoding header', async () => {
    const { context, setHeaderMock } = createGzipTestContext(['deflate', 'gzip']);
    const next = TestInterceptorUtils.createMockNext({ data: 'test' });

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, () => {
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Encoding',
        'gzip',
      );
    });
  });
});
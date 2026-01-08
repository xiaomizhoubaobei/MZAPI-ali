import { Test, TestingModule } from '@nestjs/testing';
import { NoCacheInterceptor } from './no-cache.interceptor';
import { TestInterceptorUtils } from './test-utils';

describe('NoCacheInterceptor', () => {
  let interceptor: NoCacheInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NoCacheInterceptor],
    }).compile();

    interceptor = module.get<NoCacheInterceptor>(NoCacheInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set Cache-Control, Pragma, and Expires headers', async () => {
    const setHeaderMock = jest.fn();
    const responseMock = {
      setHeader: setHeaderMock,
    };
    const context = TestInterceptorUtils.createMockContextWithResponse(responseMock);
    const next = TestInterceptorUtils.createMockNext({ data: 'test' });

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate',
      );
      expect(setHeaderMock).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(setHeaderMock).toHaveBeenCalledWith('Expires', '0');
      expect(data).toEqual({ data: 'test' });
    });
  });

  it('should pass through data unchanged', async () => {
    const context = TestInterceptorUtils.createMockContextWithResponse();
    const testData = { key: 'value' };
    const next = TestInterceptorUtils.createMockNext(testData);

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(data).toEqual(testData);
    });
  });
});
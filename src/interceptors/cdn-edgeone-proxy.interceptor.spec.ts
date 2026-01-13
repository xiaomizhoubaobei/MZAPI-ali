import { Test, TestingModule } from '@nestjs/testing';
import { CdnEdgeoneProxyInterceptor } from './cdn-edgeone-proxy.interceptor';
import { TestInterceptorUtils } from './test-utils';

describe('CdnEdgeoneProxyInterceptor', () => {
  let interceptor: CdnEdgeoneProxyInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CdnEdgeoneProxyInterceptor],
    }).compile();

    interceptor = module.get<CdnEdgeoneProxyInterceptor>(
      CdnEdgeoneProxyInterceptor,
    );
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set Service header', async () => {
    const setHeaderMock = jest.fn();
    const responseMock = {
      setHeader: setHeaderMock,
    };
    const context = TestInterceptorUtils.createMockContextWithResponse(responseMock);
    const next = TestInterceptorUtils.createMockNext({ data: 'test' });

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Service',
        'MZAPI/EdgeOne-Proxy',
      );
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
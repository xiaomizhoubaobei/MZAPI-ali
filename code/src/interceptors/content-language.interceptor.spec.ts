import { Test, TestingModule } from '@nestjs/testing';
import { ContentLanguageInterceptor } from './content-language.interceptor';
import { TestInterceptorUtils } from './test-utils';

describe('ContentLanguageInterceptor', () => {
  let interceptor: ContentLanguageInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentLanguageInterceptor],
    }).compile();

    interceptor = module.get<ContentLanguageInterceptor>(
      ContentLanguageInterceptor,
    );
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set Content-Language header to zh-CN', async () => {
    const setHeaderMock = jest.fn();
    const responseMock = {
      setHeader: setHeaderMock,
    };
    const context = TestInterceptorUtils.createMockContextWithResponse(responseMock);
    const next = TestInterceptorUtils.createMockNext({ data: 'test' });

    await TestInterceptorUtils.executeIntercept(interceptor, context, next, (data) => {
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Language',
        'zh-CN',
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
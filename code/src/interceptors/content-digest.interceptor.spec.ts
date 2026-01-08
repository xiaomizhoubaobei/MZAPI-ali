import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ContentDigestInterceptor } from './content-digest.interceptor';

describe('ContentDigestInterceptor', () => {
  let interceptor: ContentDigestInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentDigestInterceptor],
    }).compile();

    interceptor = module.get<ContentDigestInterceptor>(
      ContentDigestInterceptor,
    );
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set Content-Digest header for string data', (done) => {
    const setHeaderMock = jest.fn();
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: setHeaderMock,
        }),
      }),
    } as unknown as ExecutionContext;

    const testData = 'test data';
    const next = {
      handle: () => of(testData),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(setHeaderMock).toHaveBeenCalledWith(
          'Content-Digest',
          expect.stringMatching(/^sha-512=[A-Za-z0-9+/]+={0,2}$/),
        );
        expect(data).toEqual(testData);
        done();
      },
    });
  });

  it('should set Content-Digest header for object data', (done) => {
    const setHeaderMock = jest.fn();
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: setHeaderMock,
        }),
      }),
    } as unknown as ExecutionContext;

    const testData = { key: 'value' };
    const next = {
      handle: () => of(testData),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(setHeaderMock).toHaveBeenCalledWith(
          'Content-Digest',
          expect.stringMatching(/^sha-512=[A-Za-z0-9+/]+={0,2}$/),
        );
        expect(data).toEqual(testData);
        done();
      },
    });
  });

  it('should generate consistent digest for same data', (done) => {
    const setHeaderMock = jest.fn();
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: setHeaderMock,
        }),
      }),
    } as unknown as ExecutionContext;

    const testData = 'consistent data';
    const next = {
      handle: () => of(testData),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: () => {
        const firstCall = setHeaderMock.mock.calls[0][1];

        setHeaderMock.mockClear();
        interceptor.intercept(context, next).subscribe({
          next: () => {
            const secondCall = setHeaderMock.mock.calls[0][1];
            expect(firstCall).toBe(secondCall);
            done();
          },
        });
      },
    });
  });

  it('should generate different digests for different data', (done) => {
    const setHeaderMock = jest.fn();
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: setHeaderMock,
        }),
      }),
    } as unknown as ExecutionContext;

    const testData1 = 'data 1';
    const testData2 = 'data 2';
    const next1 = {
      handle: () => of(testData1),
    } as CallHandler;
    const next2 = {
      handle: () => of(testData2),
    } as CallHandler;

    interceptor.intercept(context, next1).subscribe({
      next: () => {
        const firstCall = setHeaderMock.mock.calls[0][1];

        setHeaderMock.mockClear();
        interceptor.intercept(context, next2).subscribe({
          next: () => {
            const secondCall = setHeaderMock.mock.calls[0][1];
            expect(firstCall).not.toBe(secondCall);
            done();
          },
        });
      },
    });
  });
});
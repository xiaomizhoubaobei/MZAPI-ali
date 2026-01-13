import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ServerTimingInterceptor } from './server-timing.interceptor';

describe('ServerTimingInterceptor', () => {
  let interceptor: ServerTimingInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServerTimingInterceptor],
    }).compile();

    interceptor = module.get<ServerTimingInterceptor>(
      ServerTimingInterceptor,
    );
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set Server-Timing header with duration', (done) => {
    const setHeaderMock = jest.fn();
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: setHeaderMock,
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(setHeaderMock).toHaveBeenCalledWith(
          'Server-Timing',
          expect.stringMatching(/^total;dur=\d+\.\d{3}$/),
        );
        expect(data).toEqual({ data: 'test' });
        done();
      },
    });
  });

  it('should pass through data unchanged', (done) => {
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: jest.fn(),
        }),
      }),
    } as unknown as ExecutionContext;

    const testData = { key: 'value' };
    const next = {
      handle: () => of(testData),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(data).toEqual(testData);
        done();
      },
    });
  });

  it('should measure time in milliseconds', (done) => {
    const setHeaderMock = jest.fn();
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: setHeaderMock,
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: () => {
        const timingHeader = setHeaderMock.mock.calls[0][1];
        const match = timingHeader.match(/total;dur=(\d+\.\d{3})/);
        expect(match).toBeTruthy();
        const duration = parseFloat(match[1]);
        expect(duration).toBeGreaterThanOrEqual(0);
        done();
      },
    });
  });
});
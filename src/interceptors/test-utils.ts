import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

export class TestInterceptorUtils {
  static createMockContext(
    requestMock?: any,
    responseMock?: any,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => requestMock || { headers: {} },
        getResponse: () => responseMock || { setHeader: jest.fn() },
      }),
    } as unknown as ExecutionContext;
  }

  static createMockContextWithResponse(
    responseMock?: any,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getResponse: () => responseMock || { setHeader: jest.fn() },
      }),
    } as unknown as ExecutionContext;
  }

  static createMockContextWithRequest(
    requestMock?: any,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => requestMock || { headers: {} },
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as unknown as ExecutionContext;
  }

  static createMockNext(data: any): CallHandler {
    return {
      handle: () => of(data),
    } as CallHandler;
  }

  static executeIntercept(
    interceptor: any,
    context: ExecutionContext,
    next: CallHandler,
    assertions: (data: any) => void,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      interceptor.intercept(context, next).subscribe({
        next: (data: any) => {
          assertions(data);
          resolve();
        },
        complete: () => {
          resolve();
        },
        error: (error: any) => {
          throw error;
        },
      });
    });
  }
}
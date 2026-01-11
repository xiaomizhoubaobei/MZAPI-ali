import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { PostOnlyInterceptor } from './post-only.interceptor';

describe('PostOnlyInterceptor', () => {
  let interceptor: PostOnlyInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostOnlyInterceptor],
    }).compile();

    interceptor = module.get<PostOnlyInterceptor>(PostOnlyInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    let mockContext: ExecutionContext;
    let mockCallHandler: CallHandler;
    let mockRequest: any;

    beforeEach(() => {
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
      };

      mockRequest = {
        method: 'POST',
        path: '/test',
        url: '/test',
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
        }),
      } as any;
    });

    it('should allow POST requests', (done) => {
      mockRequest.method = 'POST';

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should allow GET requests on root path', (done) => {
      mockRequest.method = 'GET';
      mockRequest.path = '/';

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should allow GET requests on empty path', (done) => {
      mockRequest.method = 'GET';
      mockRequest.path = '';
      mockRequest.url = '';

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should reject GET requests on non-root paths', (done) => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/test';

      const observable = interceptor.intercept(mockContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          done.fail('Expected error to be thrown');
        },
        error: (error) => {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.status).toBe(HttpStatus.METHOD_NOT_ALLOWED);
          expect(error.message).toBe('Method Not Allowed');
          expect(mockCallHandler.handle).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should reject PUT requests', (done) => {
      mockRequest.method = 'PUT';

      const observable = interceptor.intercept(mockContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          done.fail('Expected error to be thrown');
        },
        error: (error) => {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.status).toBe(HttpStatus.METHOD_NOT_ALLOWED);
          expect(error.message).toBe('Method Not Allowed');
          expect(mockCallHandler.handle).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should reject DELETE requests', (done) => {
      mockRequest.method = 'DELETE';

      const observable = interceptor.intercept(mockContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          done.fail('Expected error to be thrown');
        },
        error: (error) => {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.status).toBe(HttpStatus.METHOD_NOT_ALLOWED);
          expect(error.message).toBe('Method Not Allowed');
          expect(mockCallHandler.handle).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should reject PATCH requests', (done) => {
      mockRequest.method = 'PATCH';

      const observable = interceptor.intercept(mockContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          done.fail('Expected error to be thrown');
        },
        error: (error) => {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.status).toBe(HttpStatus.METHOD_NOT_ALLOWED);
          expect(error.message).toBe('Method Not Allowed');
          expect(mockCallHandler.handle).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should use url when path is undefined', (done) => {
      mockRequest.method = 'GET';
      mockRequest.path = undefined;
      mockRequest.url = '/';

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle both path and url being undefined', (done) => {
      mockRequest.method = 'GET';
      mockRequest.path = undefined;
      mockRequest.url = undefined;

      const observable = interceptor.intercept(mockContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          done.fail('Expected error to be thrown');
        },
        error: (error) => {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.status).toBe(HttpStatus.METHOD_NOT_ALLOWED);
          expect(error.message).toBe('Method Not Allowed');
          done();
        },
      });
    });
  });
});
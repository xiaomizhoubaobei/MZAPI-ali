import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { CorsInterceptor } from './cors.interceptor';

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

  describe('intercept', () => {
    let mockContext: ExecutionContext;
    let mockCallHandler: CallHandler;
    let mockResponse: any;
    let mockRequest: any;

    beforeEach(() => {
      mockResponse = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      mockRequest = {
        method: 'GET',
        path: '/test',
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as any;

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
      };
    });

    it('should set CORS headers correctly', (done) => {
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Access-Control-Allow-Origin',
            '*',
          );
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Access-Control-Allow-Methods',
            'GET, POST',
          );
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Access-Control-Max-Age',
            '3600',
          );
          done();
        },
      });
    });

    it('should handle OPTIONS preflight request', (done) => {
      mockRequest.method = 'OPTIONS';

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockResponse.status).toHaveBeenCalledWith(204);
          expect(mockResponse.send).toHaveBeenCalled();
          expect(mockCallHandler.handle).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle GET request', (done) => {
      mockRequest.method = 'GET';

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle POST request', (done) => {
      mockRequest.method = 'POST';

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle PUT request', (done) => {
      mockRequest.method = 'PUT';

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle DELETE request', (done) => {
      mockRequest.method = 'DELETE';

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ data: 'test' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
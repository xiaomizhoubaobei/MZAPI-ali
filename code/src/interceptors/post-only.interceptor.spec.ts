import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  CallHandler,
  HttpException
} from '@nestjs/common';
import { of } from 'rxjs';
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

  it('should allow POST requests', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: (data) => {
        expect(data).toEqual({ data: 'test' });
        done();
      },
    });
  });

  it('should throw Method Not Allowed for GET requests', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    expect(() => {
      interceptor.intercept(context, next);
    }).toThrow(HttpException);
  });

  it('should throw Method Not Allowed for PUT requests', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'PUT',
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    expect(() => {
      interceptor.intercept(context, next);
    }).toThrow(HttpException);
  });

  it('should throw Method Not Allowed for DELETE requests', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'DELETE',
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    expect(() => {
      interceptor.intercept(context, next);
    }).toThrow(HttpException);
  });

  it('should throw Method Not Allowed for PATCH requests', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'PATCH',
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    expect(() => {
      interceptor.intercept(context, next);
    }).toThrow(HttpException);
  });
});
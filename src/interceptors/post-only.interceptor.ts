import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';

@Injectable()
export class PostOnlyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url;

    // 允许根路径的 GET 请求
    if ((path === '/' || path === '') && request.method === 'GET') {
      return next.handle();
    }

    if (request.method !== 'POST') {
      return throwError(
        () =>
          new HttpException(
            'Method Not Allowed',
            HttpStatus.METHOD_NOT_ALLOWED,
          ),
      );
    }

    return next.handle();
  }
}
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class CorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();

    // 设置允许所有来源
    response.setHeader('Access-Control-Allow-Origin', '*');

    // 设置允许的方法（包括 GET 和 POST）
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST');

    // 设置允许的请求头
    // response.setHeader(
    //   'Access-Control-Allow-Headers',
    //   'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    // );

    // 设置预检请求缓存时间
    response.setHeader('Access-Control-Max-Age', '3600');

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      response.status(204).send();
      return new Observable((observer) => {
        observer.complete();
      });
    }

    return next.handle();
  }
}
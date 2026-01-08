import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);

@Injectable()
export class GzipInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 检查客户端是否接受gzip编码（不区分大小写，支持多种编码）
    let acceptEncoding = request.headers['accept-encoding'];
    if (Array.isArray(acceptEncoding)) {
      acceptEncoding = acceptEncoding.join(', ');
    }
    acceptEncoding = (acceptEncoding || '').toLowerCase();
    if (!/\bgzip\b/i.test(acceptEncoding)) {
      return next.handle();
    }

    response.setHeader('Content-Encoding', 'gzip');

    return next.handle().pipe(
      switchMap((data) => {
        if (typeof data === 'string' || Buffer.isBuffer(data)) {
          return from(gzipAsync(data));
        }
        return from(gzipAsync(JSON.stringify(data)));
      }),
    );
  }
}

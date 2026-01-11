import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SERVICE_HEADER = 'MZAPI/EdgeOne-Proxy';

@Injectable()
export class CdnEdgeoneProxyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();

        // 跳过流式响应
        if (data === undefined && response.headersSent) {
          return data;
        }

        // 设置Service头部（仅在响应未发送时）
        if (!response.headersSent) {
          response.setHeader('Service', SERVICE_HEADER);
        }
        return data;
      }),
    );
  }
}

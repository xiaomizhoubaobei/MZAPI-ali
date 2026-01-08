import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 检查请求头中是否已有 requestId，如果没有则生成新的
    const requestId = request.headers['x-request-id'] || uuidv4();

    // 将 requestId 附加到 request 对象上，便于后续使用
    request.requestId = requestId;

    // 在响应头中返回 requestId
    response.setHeader('X-Request-Id', requestId);

    return next.handle().pipe(
      map((data) => {
        // 如果官方 API 响应中包含 RequestId，优先使用官方的 ID
        if (data && typeof data === 'object' && 'RequestId' in data) {
          const officialRequestId = data.RequestId;
          // 更新响应头中的 X-Request-Id 为官方返回的 ID
          response.setHeader('X-Request-Id', officialRequestId);
          // 同时更新 request 对象上的 requestId
          request.requestId = officialRequestId;
        }

        return data;
      }),
    );
  }
}
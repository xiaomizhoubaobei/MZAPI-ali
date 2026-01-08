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
        response.setHeader('Service', SERVICE_HEADER);
        return data;
      }),
    );
  }
}

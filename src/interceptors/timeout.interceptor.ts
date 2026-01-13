import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly timeoutMs: number;

  constructor() {
    // 从环境变量读取超时时间，默认 30 秒
    this.timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          this.logger.warn(
            `Request timeout: ${method} ${url} exceeded ${this.timeoutMs}ms`,
          );
          return throwError(
            () =>
              new HttpException(
                `Gateway Timeout: Request processing exceeded ${this.timeoutMs}ms`,
                HttpStatus.GATEWAY_TIMEOUT,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
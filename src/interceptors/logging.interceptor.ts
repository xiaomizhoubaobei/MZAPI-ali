import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url } = request;
    const requestId = request.requestId || '-';
    const userAgent = request.headers['user-agent'] || '-';

    const start = Date.now();

    this.logger.log(
      `[${requestId}] ${method} ${url} - ${userAgent.substring(0, 50)}...`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - start;
          const statusCode = response.statusCode;

          this.logger.log(
            `[${requestId}] ${method} ${url} ${statusCode} ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - start;
          const statusCode = error.status || 500;

          this.logger.error(
            `[${requestId}] ${method} ${url} ${statusCode} ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
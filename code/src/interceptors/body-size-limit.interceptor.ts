import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BodySizeLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BodySizeLimitInterceptor.name);
  private readonly maxBodySize: number;

  constructor() {
    // 从环境变量读取最大请求体大小，默认 10MB
    const maxSizeInMB = parseInt(process.env.MAX_BODY_SIZE_MB || '10', 10);
    this.maxBodySize = maxSizeInMB * 1024 * 1024; // 转换为字节
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 检查 Content-Length 头部
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);

    if (contentLength > this.maxBodySize) {
      this.logger.warn(
        `Request body size ${contentLength} bytes exceeds limit ${this.maxBodySize} bytes for ${request.method} ${request.url}`,
      );

      throw new HttpException(
        `Payload Too Large: Request body size (${this.formatBytes(contentLength)}) exceeds limit (${this.formatBytes(this.maxBodySize)})`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    // 继续处理请求
    return next.handle().pipe(
      map((data) => {
        // 在响应头中添加最大请求体大小信息
        response.setHeader('X-Max-Body-Size', this.formatBytes(this.maxBodySize));
        return data;
      }),
    );
  }

  /**
   * 格式化字节数为可读格式
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
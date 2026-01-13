import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    // 防止点击劫持攻击
    response.setHeader('X-Frame-Options', 'DENY');

    // 防止 MIME 类型嗅探
    response.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS 保护
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // 引用策略
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 内容安全策略
    response.setHeader(
        'Content-Security-Policy',
      "default-src 'self' *.mizhoubaobei.top; script-src 'self' *.mizhoubaobei.top 'unsafe-inline' 'unsafe-eval'; style-src 'self' *.mizhoubaobei.top 'unsafe-inline'; img-src 'self' *.mizhoubaobei.top data: https:; font-src 'self' *.mizhoubaobei.top data:; connect-src 'self' *.mizhoubaobei.top https:; frame-ancestors 'none';",
    );

    // 权限策略
    response.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );

    // HSTS (HTTPS 环境下启用)
    response.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );

    return next.handle();
  }
}
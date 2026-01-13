import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/aliyun/image-moderation (POST)', () => {
    const validRequest = {
      service: 'baselineCheck',
      accessKeyId: 'test-key-id',
      accessKeySecret: 'test-key-secret',
      endpoint: 'green-cip.cn-shanghai.aliyuncs.com',
      imageUrl: 'https://example.com/image.jpg',
    };

    it('should accept POST method', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send(validRequest)
        .expect(401); // Will fail due to invalid credentials, but method is accepted
    });

    it('should reject GET method', () => {
      return request(app.getHttpServer())
        .get('/aliyun/image-moderation')
        .expect(405);
    });

    it('should reject PUT method', () => {
      return request(app.getHttpServer())
        .put('/aliyun/image-moderation')
        .send(validRequest)
        .expect(405);
    });

    it('should reject DELETE method', () => {
      return request(app.getHttpServer())
        .delete('/aliyun/image-moderation')
        .expect(405);
    });

    it('should set Service header', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send(validRequest)
        .expect(401)
        .expect('Service', 'api.mizhoubaobei.top-CDN-EdgeOne-Proxy');
    });

    it('should set Cache-Control header', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send(validRequest)
        .expect(401)
        .expect('Cache-Control', 'no-store, no-cache, must-revalidate');
    });

    it('should set Pragma header', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send(validRequest)
        .expect(401)
        .expect('Pragma', 'no-cache');
    });

    it('should set Expires header', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send(validRequest)
        .expect(401)
        .expect('Expires', '0');
    });

    it('should set Content-Language header', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send(validRequest)
        .expect(401)
        .expect('Content-Language', 'zh-CN');
    });

    it('should set Server-Timing header', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send(validRequest)
        .expect(401)
        .expect('Server-Timing', /total;dur=\d+\.\d{3}/);
    });

    it('should set Content-Digest header', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send(validRequest)
        .expect(401)
        .expect('Content-Digest', /sha-512=[A-Za-z0-9+/]+={0,2}/);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send({
          service: 'baselineCheck',
          // Missing required fields
        })
        .expect(400);
    });

    it('should validate service type', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send({
          ...validRequest,
          service: 'invalidService',
        })
        .expect(400);
    });

    it('should validate imageUrl format', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send({
          ...validRequest,
          imageUrl: 'not-a-valid-url',
        })
        .expect(400);
    });

    it('should reject non-whitelisted fields', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .send({
          ...validRequest,
          extraField: 'should be rejected',
        })
        .expect(400);
    });

    it('should apply gzip compression when accept-encoding is gzip', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .set('Accept-Encoding', 'gzip')
        .send(validRequest)
        .expect(401)
        .expect('Content-Encoding', 'gzip');
    });

    it('should not apply gzip compression when accept-encoding is not gzip', () => {
      return request(app.getHttpServer())
        .post('/aliyun/image-moderation')
        .set('Accept-Encoding', 'deflate')
        .send(validRequest)
        .expect(401)
        .expect((res) => {
          expect(res.headers['content-encoding']).toBeUndefined();
        });
    });
  });
});
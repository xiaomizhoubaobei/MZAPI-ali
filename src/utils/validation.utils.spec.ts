import { BadRequestException } from '@nestjs/common';
import { AliyunValidationUtils } from './validation.utils';

describe('AliyunValidationUtils', () => {
  describe('validateRequiredParams', () => {
    it('should not throw when all required params are present', () => {
      const params = {
        accessKeyId: 'test-key-id',
        accessKeySecret: 'test-key-secret',
        endpoint: 'test-endpoint',
      };

      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).not.toThrow();
    });

    it('should throw BadRequestException when accessKeyId is missing', () => {
      const params = {
        accessKeySecret: 'test-key-secret',
        endpoint: 'test-endpoint',
      };

      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow(BadRequestException);
      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow('缺少必填参数: accessKeyId');
    });

    it('should throw BadRequestException when accessKeySecret is missing', () => {
      const params = {
        accessKeyId: 'test-key-id',
        endpoint: 'test-endpoint',
      };

      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow(BadRequestException);
      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow('缺少必填参数: accessKeySecret');
    });

    it('should throw BadRequestException when endpoint is missing', () => {
      const params = {
        accessKeyId: 'test-key-id',
        accessKeySecret: 'test-key-secret',
      };

      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow(BadRequestException);
      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow('缺少必填参数: endpoint');
    });

    it('should throw BadRequestException when multiple params are missing', () => {
      const params = {
        accessKeyId: 'test-key-id',
      };

      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow(BadRequestException);
      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow('缺少必填参数: accessKeySecret, endpoint');
    });

    it('should throw BadRequestException when all params are missing', () => {
      const params = {};

      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow(BadRequestException);
      expect(() => {
        AliyunValidationUtils.validateRequiredParams(params);
      }).toThrow('缺少必填参数: accessKeyId, accessKeySecret, endpoint');
    });
  });

  describe('validateServiceType', () => {
    it('should not throw for valid service types', () => {
      const validServices = [
        'baselineCheck',
        'baselineCheck_pro',
        'baselineCheck_cb',
        'tonalityImprove',
        'tonalityImprove_cb',
        'aigcCheck',
        'aigcCheck_cb',
        'profilePhotoCheck',
        'postImageCheck',
        'advertisingCheck',
        'liveStreamCheck',
        'riskDetection',
        'riskDetection_cb',
      ];

      validServices.forEach((service) => {
        expect(() => {
          AliyunValidationUtils.validateServiceType(service);
        }).not.toThrow();
      });
    });

    it('should throw BadRequestException for invalid service type', () => {
      expect(() => {
        AliyunValidationUtils.validateServiceType('invalidService');
      }).toThrow(BadRequestException);
      expect(() => {
        AliyunValidationUtils.validateServiceType('invalidService');
      }).toThrow('不支持的service类型: invalidService');
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => {
        AliyunValidationUtils.validateServiceType('');
      }).toThrow(BadRequestException);
    });
  });

  describe('validateImageUrl', () => {
    it('should not throw when imageUrl is provided', () => {
      expect(() => {
        AliyunValidationUtils.validateImageUrl('https://example.com/image.jpg');
      }).not.toThrow();
    });

    it('should throw BadRequestException when imageUrl is undefined', () => {
      expect(() => {
        AliyunValidationUtils.validateImageUrl(undefined);
      }).toThrow(BadRequestException);
      expect(() => {
        AliyunValidationUtils.validateImageUrl(undefined);
      }).toThrow('参数中必须包含imageUrl');
    });

    it('should throw BadRequestException when imageUrl is empty string', () => {
      expect(() => {
        AliyunValidationUtils.validateImageUrl('');
      }).toThrow(BadRequestException);
      expect(() => {
        AliyunValidationUtils.validateImageUrl('');
      }).toThrow('参数中必须包含imageUrl');
    });

    it('should throw BadRequestException when imageUrl is null', () => {
      expect(() => {
        AliyunValidationUtils.validateImageUrl(null as any);
      }).toThrow(BadRequestException);
    });
  });
});
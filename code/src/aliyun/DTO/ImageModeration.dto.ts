import {
  IsString,
  IsUrl,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

/**
 * 阿里云图片审核数据传输对象
 */
export class ImageModerationDto {
  /**
   * 服务类型
   * @enum {string}
   * @example 'baselineCheck' - 基础检测
   * @example 'baselineCheck_pro' - 专业版基础检测
   * @example 'aigcCheck' - AIGC内容检测
   */
  @IsString()
  @IsIn([
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
  ])
  @IsNotEmpty()
  service:
    | 'baselineCheck'
    | 'baselineCheck_pro'
    | 'baselineCheck_cb'
    | 'tonalityImprove'
    | 'tonalityImprove_cb'
    | 'aigcCheck'
    | 'aigcCheck_cb'
    | 'profilePhotoCheck'
    | 'postImageCheck'
    | 'advertisingCheck'
    | 'liveStreamCheck'
    | 'riskDetection'
    | 'riskDetection_cb';

  /**
   * 阿里云访问密钥ID
   */
  @IsString()
  @IsNotEmpty()
  accessKeyId: string;

  /**
   * 阿里云访问密钥
   */
  @IsString()
  @IsNotEmpty()
  accessKeySecret: string;

  /**
   * 阿里云服务端点
   */
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  /**
   * 要审核的图片URL
   */
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;
}

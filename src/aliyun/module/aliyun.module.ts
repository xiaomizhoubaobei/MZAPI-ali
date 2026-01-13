import { Module } from '@nestjs/common';
import { ImageModerationController, TextGenerationController } from '../controller';
import { ImageModerationService, TextGenerationService } from '../service';

@Module({
  controllers: [ImageModerationController, TextGenerationController],
  providers: [ImageModerationService, TextGenerationService],
})
export class AliyunModule {}
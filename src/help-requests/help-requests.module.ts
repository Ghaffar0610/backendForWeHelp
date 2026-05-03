import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthenticationModule } from '../authentication/authentication.module';
import { HelpRequestMediaService } from './help-request-media.service';
import { HelpRequestsController } from './help-requests.controller';
import { HelpRequestsService } from './help-requests.service';
import { HelpRequestSchema } from './schemas/help-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'HelpRequest', schema: HelpRequestSchema },
    ]),
    AuthenticationModule,
  ],
  controllers: [HelpRequestsController],
  providers: [HelpRequestsService, HelpRequestMediaService],
  exports: [HelpRequestsService],
})
export class HelpRequestsModule {}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { HelpRequestMediaService } from './help-request-media.service';
import { HelpRequestsService } from './help-requests.service';
import { HelpRequestStatus } from './schemas/help-request.schema';

@Controller('help-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HelpRequestsController {
  constructor(
    private readonly helpRequestsService: HelpRequestsService,
    private readonly mediaService: HelpRequestMediaService,
  ) {}

  @Post()
  create(@CurrentUser() user: any, @Body() body: CreateHelpRequestDto) {
    return this.helpRequestsService.create(user.sub, body);
  }

  @Post('media')
  @UseInterceptors(
    FilesInterceptor('files', 2, {
      limits: { files: 2, fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadMedia(@UploadedFiles() files: any[], @Req() req: Request) {
    const mediaUrls = await this.mediaService.upload(
      files,
      this.resolveBaseUrl(req),
    );
    return {
      success: true,
      data: { mediaUrls },
    };
  }

  @Get('media/:id')
  async getMedia(@Param('id') id: string, @Res() res: Response) {
    const { file, stream } = await this.mediaService.openDownloadStream(id);
    res.setHeader(
      'Content-Type',
      file.contentType || 'application/octet-stream',
    );
    res.setHeader('Cache-Control', 'private, max-age=86400');
    stream.pipe(res);
  }

  @Get('mine')
  mine(@CurrentUser() user: any) {
    return this.helpRequestsService.findMine(user.sub);
  }

  @Get('assigned')
  @Roles('volunteer', 'admin')
  assigned(@CurrentUser() user: any) {
    return this.helpRequestsService.findAssignedToVolunteer(user.sub);
  }

  @Get('open')
  @Roles('volunteer', 'admin')
  open() {
    return this.helpRequestsService.findOpen();
  }

  @Get('nearby')
  @Roles('volunteer', 'admin')
  nearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radiusMeters') radiusMeters?: string,
  ) {
    return this.helpRequestsService.findNearby(
      this.parseNumber(latitude, 'latitude'),
      this.parseNumber(longitude, 'longitude'),
      radiusMeters ? this.parseNumber(radiusMeters, 'radiusMeters') : 10000,
    );
  }

  @Get('admin/all')
  @Roles('admin')
  adminAll(@Query('status') status?: HelpRequestStatus) {
    return this.helpRequestsService.findAllForAdmin(status);
  }

  @Patch(':id/accept')
  @Roles('volunteer', 'admin')
  accept(@CurrentUser() user: any, @Param('id') id: string) {
    return this.helpRequestsService.accept(id, user.sub);
  }

  @Patch(':id/resolve')
  resolve(@CurrentUser() user: any, @Param('id') id: string) {
    return this.helpRequestsService.resolve(id, user.sub, user.role);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.helpRequestsService.cancel(id, user.sub, user.role);
  }

  private resolveBaseUrl(req: Request) {
    const configured = process.env.PUBLIC_BASE_URL?.trim();
    if (configured) {
      return configured.replace(/\/$/, '');
    }

    const protocol =
      req.headers['x-forwarded-proto']?.toString() ?? req.protocol;
    return `${protocol}://${req.get('host')}`;
  }

  private parseNumber(value: string | undefined, field: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`${field} must be a valid number`);
    }
    return parsed;
  }
}

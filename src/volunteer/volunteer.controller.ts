import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Post,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApplyVolunteerDto } from './dto/apply-volunteer.dto';
import { VolunteerMediaService } from './volunteer-media.service';
import { VolunteerService } from './volunteer.service';

@Controller('volunteer')
@UseGuards(JwtAuthGuard)
export class VolunteerController {
    constructor(
        private readonly volunteerService: VolunteerService,
        private readonly mediaService: VolunteerMediaService,
    ) { }

    @Post('media')
    @UseInterceptors(
        FilesInterceptor('files', 3, {
            limits: { files: 3, fileSize: 5 * 1024 * 1024 },
        }),
    )
    async uploadMedia(
        @UploadedFiles() files: any[],
        @Req() req: any,
    ) {
        if (!files?.length) {
            throw new BadRequestException('At least one media file is required');
        }

        const mediaUrls = await this.mediaService.upload(
            files,
            this.resolveBaseUrl(req),
        );

        return {
            success: true,
            message: 'Volunteer documents uploaded',
            data: { mediaUrls },
        };
    }

    @Post('apply')
    async apply(@CurrentUser() payload: any, @Body() body: ApplyVolunteerDto) {
        const userId = payload.sub;
        // require necessary fields
        const {
            name,
            city,
            location,
            expertise,
            reason,
            cnic,
            cnicFrontImage,
            cnicBackImage,
            profileImage,
        } = body;
        if (!name || !city || !location || !expertise || !reason || !cnic || !cnicFrontImage || !cnicBackImage) {
            throw new BadRequestException('Missing required application fields');
        }
        const application = await this.volunteerService.createApplication(userId, {
            name,
            city,
            location,
            expertise,
            reason,
            cnic,
            cnicFrontImage,
            cnicBackImage,
            profileImage,
        });
        return {
            success: true,
            message: 'Application submitted successfully',
            data: application,
        };
    }

    @Get('my-application')
    async myApplications(@CurrentUser() payload: any) {
        const userId = payload.sub;
        const applications = await this.volunteerService.findByUser(userId);
        return {
            success: true,
            data: applications,
        };
    }

    @Get('status')
    async getVolunteerStatus(@CurrentUser() payload: any) {
        const userId = payload.sub;

        // Find the volunteer verification record for this user
        const verification = await this.volunteerService.findByUserId(userId);

        // If no record exists, return pending status
        if (!verification) {
            return {
                status: 'success',
                data: {
                    status: 'pending',
                    message: 'No application found. User can submit a new application.',
                },
            };
        }

        // Return the full verification record with status
        return {
            status: 'success',
            data: verification,
        };
    }

    @Get('media/:id')
    async getMedia(
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        const media = await this.mediaService.openDownloadStream(id);

        res.setHeader('Content-Type', media.contentType);
        res.setHeader('Cache-Control', 'private, max-age=86400');
        media.stream.pipe(res);
    }

    private resolveBaseUrl(req: any) {
        const configuredBaseUrl = process.env.PUBLIC_BASE_URL?.trim();
        if (configuredBaseUrl) {
            return configuredBaseUrl.replace(/\/$/, '');
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        return `${protocol}://${host}`;
    }
}

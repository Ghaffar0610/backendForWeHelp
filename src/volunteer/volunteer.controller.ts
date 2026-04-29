import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApplyVolunteerDto } from './dto/apply-volunteer.dto';
import { VolunteerService } from './volunteer.service';

@Controller('volunteer')
@UseGuards(JwtAuthGuard)
export class VolunteerController {
    constructor(
        private readonly volunteerService: VolunteerService,
    ) { }

    @Post('apply')
    async apply(@CurrentUser() payload: any, @Body() body: ApplyVolunteerDto) {
        const userId = payload.sub;
        // require necessary fields
        const { name, city, location, expertise, reason, image, cnic } = body;
        if (!name || !city || !location || !expertise || !reason || !cnic) {
            throw new BadRequestException('Missing required application fields');
        }
        const application = await this.volunteerService.createApplication(userId, { name, city, location, expertise, reason, image, cnic });
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
}

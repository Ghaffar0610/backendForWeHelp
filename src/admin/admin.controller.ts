import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
    ) { }

    /**
     * GET /admin/volunteer-applications
     * Retrieve all volunteer applications (optionally filtered by status)
     * Query params: status (optional) - "pending", "approved", "rejected"
     */
    @Get('volunteer-applications')
    async getApplications(
        @Query('status') status?: string,
    ) {
        let applications;
        if (status) {
            applications = await this.adminService.getAllApplications(status);
        } else {
            applications = await this.adminService.getAllPendingApplications();
        }

        return {
            success: true,
            message: `Found ${applications.length} applications`,
            data: applications,
        };
    }

    /**
     * GET /admin/volunteer-applications/:id
     * Retrieve a specific volunteer application
     */
    @Get('volunteer-applications/:id')
    async getApplicationById(
        @Param('id') id: string,
    ) {
        const application = await this.adminService.getApplicationById(id);
        return {
            success: true,
            data: application,
        };
    }

    /**
     * POST /admin/volunteer-applications/:id/approve
     * Approve a volunteer application and update user role to 'volunteer'
     */
    @Post('volunteer-applications/:id/approve')
    async approveApplication(
        @Param('id') id: string,
    ) {
        const application = await this.adminService.approveApplication(id);
        return {
            success: true,
            message: 'Application approved and user role updated to volunteer',
            data: application,
        };
    }

    /**
     * POST /admin/volunteer-applications/:id/reject
     * Reject a volunteer application and reset user role to 'user'
     */
    @Post('volunteer-applications/:id/reject')
    async rejectApplication(
        @Param('id') id: string,
    ) {
        const application = await this.adminService.rejectApplication(id);
        return {
            success: true,
            message: 'Application rejected and user role reset to user',
            data: application,
        };
    }
}

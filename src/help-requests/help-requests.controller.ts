import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { HelpRequestsService } from './help-requests.service';
import { HelpRequestStatus } from './schemas/help-request.schema';

@Controller('help-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HelpRequestsController {
    constructor(private readonly helpRequestsService: HelpRequestsService) { }

    @Post()
    create(@CurrentUser() user: any, @Body() body: CreateHelpRequestDto) {
        return this.helpRequestsService.create(user.sub, body);
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

    private parseNumber(value: string | undefined, field: string) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            throw new BadRequestException(`${field} must be a valid number`);
        }
        return parsed;
    }
}

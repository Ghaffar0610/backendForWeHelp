import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserService } from './user.service';


@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get()
    findAllUsers() {
        return this.userService.findAllUsers();
    }

    @Get(':role')
    findByRole(@Param('role') role: string) {
        return this.userService.findByRole(role);
    }

}

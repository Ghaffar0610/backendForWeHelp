import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('Authorization header required');
        }

        const token = authHeader.replace(/^Bearer\s+/i, '');

        try {
            request.user = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET ?? 'dev_secret_key',
            });
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('Authorization header required');
        }

        const token = authHeader.replace(/^Bearer\s+/i, '');

        try {
            const payload = jwt.verify(
                token,
                process.env.JWT_SECRET ?? 'dev_secret_key',
            );
            request.user = payload;
            return true;
        } catch (error: any) {
            console.error('[AUTH] JWT verification failed:', error?.message ?? error);
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}

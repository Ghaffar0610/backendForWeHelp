import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader =
            request.headers?.authorization ??
            request.headers?.Authorization ??
            request.headers?.['x-access-token'];

        console.log('[AUTH] incoming headers keys:', Object.keys(request.headers ?? {}));
        console.log('[AUTH] authorization present:', !!request.headers?.authorization);
        console.log('[AUTH] x-access-token present:', !!request.headers?.['x-access-token']);

        if (!authHeader) {
            throw new UnauthorizedException('Authorization header required');
        }

        const token = authHeader.toString().replace(/^Bearer\s+/i, '');

        console.log('[AUTH] token prefix:', token.slice(0, 16));

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

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticationException } from '../filters/exception';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
  handleRequest(err, user, info, context) {
    if (info && info.name === 'TokenExpiredError') {
      throw new AuthenticationException([
        {
          message: 'Token has expired',
        },
      ]);
    }
    if (err || !user) {
      throw (
        err ||
        new AuthenticationException([
          {
            message: 'Unauthorized access',
          },
        ])
      );
    }
    return user;
  }
}

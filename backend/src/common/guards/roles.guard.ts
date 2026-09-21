import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // No specific roles required
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    // If no user is attached, access denied. JwtAuthGuard should run before RolesGuard.
    if (!user) {
      return false;
    }
    
    return requiredRoles.includes(user.role);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.SUPERADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.SUPERADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/change-password')
  changePassword(
    @Param('id') id: string, 
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: any
  ) {
    // Only the user themselves or a superadmin can change the password
    if (req.user.id !== id && req.user.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('You can only change your own password');
    }
    return this.usersService.changePassword(id, changePasswordDto);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

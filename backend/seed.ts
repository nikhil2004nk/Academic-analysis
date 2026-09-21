import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsersService } from './src/users/users.service';
import * as bcrypt from 'bcrypt';
import { Role } from './src/common/enums/role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  let user = await usersService.findByEmail('nik@gmail.com');
  if (!user) {
    user = await usersService.create({
      email: 'nik@gmail.com',
      name: 'Nikhil Superadmin',
      role: Role.SUPERADMIN,
    });
  }
  
  await usersService.update(user.id, { password: 'Nikhil@123' } as any);

  console.log('Superadmin user created: nik@gmail.com / Nikhil@123');

  await app.close();
}

bootstrap();

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { AcademicModule } from './academic/academic.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', 'password'),
        database: configService.get<string>('DB_DATABASE', 'academics_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Auto-sync DB schema. Note: Don't use this in production.
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    AcademicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', 'super_secret'),
      expiresIn: '15m',
    });
    
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', 'super_refresh_secret'),
      expiresIn: '7d',
    });

    const salt = await bcrypt.genSalt();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);
    await this.usersService.updateLoginStatus(user.id, true, new Date());

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    
    const newAccessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', 'super_secret'),
      expiresIn: '15m',
    });
    
    const newRefreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', 'super_refresh_secret'),
      expiresIn: '7d',
    });

    const salt = await bcrypt.genSalt();
    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, salt);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    await this.usersService.updateLoginStatus(userId, false);
  }
}

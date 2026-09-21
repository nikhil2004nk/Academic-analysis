import { Injectable, ConflictException, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const existingUser = await this.findByEmail('nik@gmail.com');
    if (!existingUser) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash('Nikhil@123', salt);
      
      const superadmin = this.userRepository.create({
        email: 'nik@gmail.com',
        name: 'Nikhil Superadmin',
        role: Role.SUPERADMIN,
        password: hashedPassword,
      });
      
      await this.userRepository.save(superadmin);
      console.log('✅ Auto-seeded Superadmin: nik@gmail.com / Nikhil@123');
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Dynamic password generation based on first name
    let firstName = createUserDto.name.trim().split(' ')[0].toLowerCase();
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    const dynamicPassword = `${firstName}@123`;
    
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dynamicPassword, salt);

    const newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return await this.userRepository.save(newUser);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { email } });
    return user || undefined;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updatedUser = { ...user, ...updateUserDto };
    return await this.userRepository.save(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async updateRefreshToken(id: string, hashedToken: string | null): Promise<void> {
    await this.userRepository.update(id, {
      hashedRefreshToken: hashedToken,
    });
  }

  async updateLoginStatus(id: string, isActive: boolean, lastLoginAt?: Date): Promise<void> {
    const updateData: Partial<User> = { isActive };
    if (lastLoginAt) {
      updateData.lastLoginAt = lastLoginAt;
    }
    await this.userRepository.update(id, updateData);
  }

  async changePassword(id: string, changePasswordDto: import('./dto/change-password.dto').ChangePasswordDto): Promise<void> {
    const user = await this.findOne(id);
    if (!user.password) {
        throw new ConflictException('User does not have a password set');
    }
    const isPasswordValid = await bcrypt.compare(changePasswordDto.oldPassword, user.password);
    
    if (!isPasswordValid) {
      throw new ConflictException('Invalid old password');
    }
    
    const salt = await bcrypt.genSalt();
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, salt);
    
    await this.userRepository.update(id, { password: hashedNewPassword });
  }
}

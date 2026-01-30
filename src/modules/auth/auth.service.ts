import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PrismaService } from 'src/infra/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password, passwordConfirm } = registerDto;

    if (password !== passwordConfirm) {
      return new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const user = await this.prisma.client.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return 'This action adds a new auth';
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}

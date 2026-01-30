import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PrismaService } from 'src/infra/prisma/prisma.service';
import { generateVerificationToken } from './utils/verification-token.util';
import { MailService } from 'src/infra/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/infra/logger/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password, passwordConfirm } = registerDto;

    if (password !== passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const existingUser = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (existingUser) throw new BadRequestException('Email already in use');

    this.loggerService.log(`Registering new user with email: ${email}`);

    const user = await this.prisma.client.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const { plainToken, hashedToken, expiresAt } = generateVerificationToken();

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        verificationTokenHash: hashedToken,
        verificationExpires: expiresAt,
      },
    });

    try {
      await this.mailService.sendMail({
        to: user.email,
        subject: 'Verify your email',
        text:
          this.configService.get<string>('auth.email_verification_mode') ===
          'token'
            ? `Click the link to verify: ${process.env.APP_URL}/verify-email?token=${plainToken}`
            : `Your verification code is ${plainToken}`,
      });

      return 'Please verify your email. Check inbox or spam.';
    } catch (error) {
      // rollback if email fails
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: {
          verificationTokenHash: null,
          verificationExpires: null,
        },
      });

      this.loggerService.error(`Failed to send verification email`, error);

      throw new InternalServerErrorException(
        'There was an error sending the email. Try again later.',
      );
    }
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

import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from 'src/infra/prisma/prisma.service';
import {
  generateVerificationToken,
  hashToken,
} from './utils/verification-token.util';
import { MailService } from 'src/infra/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/infra/logger/logger.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { JwtService } from '@nestjs/jwt';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetDto } from './dto/verify-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly appUrl: string;
  private readonly emailVerificationMode: string | undefined;
  private readonly emailVerificationExpiryMinutes: number | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private readonly jwt: JwtService,
  ) {
    this.appUrl = this.configService.getOrThrow<string>('cors.origin')[0];
    this.emailVerificationMode = configService.get<string>(
      'auth.email_verification_mode',
    );
    this.emailVerificationExpiryMinutes = configService.get<number>(
      'auth.email_verification_expiry_minutes',
    );
  }

  private generateVerificationToken() {
    return generateVerificationToken(
      this.emailVerificationMode,
      this.emailVerificationExpiryMinutes,
    );
  }

  private hashToken(raw: string) {
    return hashToken(raw);
  }

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

    const { plainToken, hashedToken, expiresAt } =
      this.generateVerificationToken();

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
            ? `Click the link to verify: ${this.appUrl}/verify-email?token=${plainToken}`
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

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) throw new BadRequestException('Invalid email or password');

    const passwordValid = await argon2.verify(user.password, password);
    if (!passwordValid)
      throw new BadRequestException('Invalid email or password');

    if (!user.verifiedAt) {
      const { plainToken, hashedToken, expiresAt } =
        generateVerificationToken();

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
            this.emailVerificationMode === 'token'
              ? `Click the link to verify: ${this.appUrl}/verify-email?token=${plainToken}`
              : `Your verification code is ${plainToken}`,
        });
      } catch (error) {
        this.loggerService.error(`Failed to send verification email`, error);
        throw new InternalServerErrorException(
          'Could not send verification email. Try again later.',
        );
      }

      throw new ForbiddenException(
        'Email not verified. We sent you a new verification message.',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = await this.jwt.signAsync(payload);

    return { access_token, user };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token } = verifyEmailDto;

    if (!token?.trim()) {
      throw new BadRequestException('Verification token is required');
    }

    const hashedToken = this.hashToken(token);

    const user = await this.prisma.client.user.findFirst({
      where: {
        verificationTokenHash: hashedToken,
      },
      select: {
        id: true,
        verifiedAt: true,
        verificationExpires: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid verification token');
    }

    if (user.verifiedAt) {
      return { message: 'Email already verified' };
    }

    if (!user.verificationExpires) {
      throw new BadRequestException('Verification token is not active');
    }

    if (user.verificationExpires.getTime() < Date.now()) {
      throw new GoneException('Verification token expired');
    }

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        verifiedAt: new Date(),
        verificationTokenHash: null,
        verificationExpires: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = forgotPasswordDto.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email is required');

    const user = await this.prisma.client.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true, deletedAt: true },
    });

    if (!user || user.deletedAt || !user.isActive) {
      return { message: 'If that email exists, we sent reset instructions.' };
    }

    const { plainToken, hashedToken, expiresAt } =
      this.generateVerificationToken();

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    try {
      await this.mailService.sendMail({
        to: user.email,
        subject: 'Reset your password',
        text:
          this.emailVerificationMode === 'token'
            ? `Click to verify reset request: ${this.appUrl}/reset-password?token=${plainToken}`
            : `Your password reset code is: ${plainToken}`,
      });

      return { message: 'If that email exists, we sent reset instructions.' };
    } catch (error) {
      // rollback
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { passwordResetTokenHash: null, passwordResetExpires: null },
      });

      this.loggerService.error('Failed to send reset email', error);
      throw new InternalServerErrorException(
        'There was an error sending the email. Try again later.',
      );
    }
  }

  async verifyReset(dto: VerifyResetDto) {
    const token = dto.token?.trim();
    if (!token) throw new BadRequestException('Reset token is required');

    const hashedChallenge = this.hashToken(token);

    const user = await this.prisma.client.user.findFirst({
      where: { passwordResetTokenHash: hashedChallenge },
      select: {
        id: true,
        passwordResetExpires: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user) throw new NotFoundException('Invalid reset token');
    if (user.deletedAt || !user.isActive)
      throw new BadRequestException('Account is not active');

    if (!user.passwordResetExpires) {
      throw new BadRequestException('Reset token is not active');
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      throw new GoneException('Reset token expired');
    }

    const { plainToken, hashedToken, expiresAt } =
      this.generateVerificationToken();

    // rotate DB hash from challenge -> session
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    return {
      message: 'Reset verified. You can now set a new password.',
      plainToken,
      expiresAt,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { resetSessionToken, password, passwordConfirm } = dto;

    if (!resetSessionToken?.trim()) {
      throw new BadRequestException('Reset session token is required');
    }

    if (password !== passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedSession = this.hashToken(resetSessionToken);

    const user = await this.prisma.client.user.findFirst({
      where: { passwordResetTokenHash: hashedSession },
      select: {
        id: true,
        passwordResetExpires: true,
        isActive: true,
        deletedAt: true,
        password: true,
      },
    });

    if (!user) throw new NotFoundException('Invalid reset session token');
    if (user.deletedAt || !user.isActive)
      throw new BadRequestException('Account is not active');

    if (!user.passwordResetExpires) {
      throw new BadRequestException('Reset session is not active');
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      throw new GoneException('Reset session expired');
    }

    // optional: block same password reuse
    const sameAsOld = await argon2.verify(user.password, password);
    if (sameAsOld)
      throw new BadRequestException('New password must be different');

    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        passwordResetTokenHash: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
  }
}

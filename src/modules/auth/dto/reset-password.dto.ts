import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  resetSessionToken: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  passwordConfirm: string;
}

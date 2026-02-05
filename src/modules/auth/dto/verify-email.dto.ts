import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @MinLength(4)
  token: string;
}

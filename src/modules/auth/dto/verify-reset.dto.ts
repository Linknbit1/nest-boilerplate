import { IsString } from 'class-validator';

export class VerifyResetDto {
  @IsString()
  token: string;
}

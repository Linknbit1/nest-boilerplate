import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { SmtpMailProvider } from './providers/smtp.provider';
import { ConsoleMailProvider } from './providers/console.provider';

@Module({
  providers: [MailService, SmtpMailProvider, ConsoleMailProvider],
  exports: [MailService],
})
export class MailModule {}

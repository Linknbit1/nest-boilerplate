import { Injectable } from '@nestjs/common';
import { SmtpMailProvider } from './providers/smtp.provider';
import { ConsoleMailProvider } from './providers/console.provider';
import { ConfigService } from '@nestjs/config';

export interface SendMailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  constructor(
    private readonly smtpProvider: SmtpMailProvider,
    private readonly consoleProvider: ConsoleMailProvider,
    private readonly config: ConfigService,
  ) {}

  async sendMail(input: SendMailInput) {
    const provider = this.config.get<string>('smtp.driver') || 'console';

    if (provider === 'smtp') {
      return this.smtpProvider.send(input);
    }

    return this.consoleProvider.send(input);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { SendMailInput } from '../mail.service';

@Injectable()
export class ConsoleMailProvider {
  private readonly logger = new Logger('Mail');

  send({ to, subject, text, html }: SendMailInput) {
    this.logger.log(`📧 Mock Mail Sent`);
    this.logger.log(`To: ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Text: ${text || '-'}`);
    this.logger.log(`HTML: ${html || '-'}`);

    return { success: true };
  }
}

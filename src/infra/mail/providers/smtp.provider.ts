import { Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SendMailInput } from '../mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmtpMailProvider {
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('smtp.host');
    const port = this.config.get<number>('smtp.port');
    const secure = this.config.get<boolean>('smtp.secure');
    const email = this.config.get<string>('smtp.email');
    const password = this.config.get<string>('smtp.pass');
    const service = this.config.get<string>('smtp.service');

    const options: SMTPTransport.Options = {
      host: host,
      port: port,
      secure: secure,
      auth: email && password ? { user: email, pass: password } : undefined,
      service: service,
    };

    this.transporter = createTransport(options);
  }

  async send({ to, subject, html, text }: SendMailInput) {
    const email = this.config.get<string>('smtp.email');
    const name = this.config.get<string>('smtp.name');

    return await this.transporter.sendMail({
      from: `${name} <${email}>`,
      to,
      subject,
      text,
      html,
    });
  }
}

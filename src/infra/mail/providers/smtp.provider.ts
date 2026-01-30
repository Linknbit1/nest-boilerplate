import { Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SendMailInput } from '../mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmtpMailProvider {
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('smtp.host');
    const port = this.config.get<string>('smtp.port');
    const secure = this.config.get<string>('smtp.secure');
    const email = this.config.get<string>('smtp.email');
    const password = this.config.get<string>('smtp.pass');

    const options: SMTPTransport.Options = {
      host: host,
      port: Number(port ?? 587),
      secure: secure === 'true',
      auth: email && password ? { user: email, pass: password } : undefined,
    };

    this.transporter = createTransport(options);
  }

  async send({ to, subject, html, text }: SendMailInput) {
    const name = this.config.get<string>('smtp.name');
    const email = this.config.get<string>('smtp.email');

    return await this.transporter.sendMail({
      from: `${name} <${email}>`,
      to,
      subject,
      text,
      html,
    });
  }
}

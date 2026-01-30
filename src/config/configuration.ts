export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  app: {
    name: process.env.APP_NAME || 'MyApp',
    url: process.env.APP_URL || 'http://localhost:3000',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  auth: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    email_verification_mode: process.env.EMAIL_VERIFICATION_MODE || 'otp',
  },

  cors: {
    origin: process.env.WHITELISTED_URLS?.split(',').map((s) => s.trim()) ?? [
      '*',
    ],
  },

  smtp: {
    driver: process.env.MAIL_DRIVER || 'console',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    name: process.env.SMTP_NAME,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    email: process.env.SMTP_EMAIL,
    service: process.env.SMTP_SERVICE,
  },
});

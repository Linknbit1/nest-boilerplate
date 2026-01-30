export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? ['*'],
  },

  smtp: {
    driver: process.env.MAIL_DRIVER || 'console',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    name: process.env.SMTP_NAME,
    pass: process.env.SMTP_PASS,
    email: process.env.SMTP_EMAIL,
  },
});

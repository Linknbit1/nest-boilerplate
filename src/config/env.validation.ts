import Joi from 'joi';

export const envValidationSchema = Joi.object({
  // General
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // App
  APP_NAME: Joi.string().default('MyApp'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  // CORS
  WHITELISTED_URLS: Joi.string().optional(),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Auth
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  EMAIL_VERIFICATION_MODE: Joi.string().valid('otp', 'token').default('otp'),

  // SMTP
  MAIL_DRIVER: Joi.string().valid('smtp', 'console').default('console'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_SECURE: Joi.boolean().optional(),
  SMTP_NAME: Joi.string().required(),
  SMTP_USER: Joi.string().required(),
  SMTP_EMAIL: Joi.string().email().required(),
  SMTP_PASS: Joi.string().required(),
  SMTP_SERVICE: Joi.string().optional(),
});

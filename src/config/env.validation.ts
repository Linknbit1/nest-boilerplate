import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  APP_NAME: Joi.string().default('MyApp'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  CORS_ORIGIN: Joi.string().optional(),

  MAIL_DRIVER: Joi.string().valid('smtp', 'console').default('console'),
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_NAME: Joi.string().required(),
  SMTP_EMAIL: Joi.string().email().required(),
  SMTP_PASS: Joi.string().required(),
});

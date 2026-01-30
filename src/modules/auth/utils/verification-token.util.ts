import crypto from 'crypto';

export function generateVerificationToken() {
  const mode = process.env.EMAIL_VERIFICATION_MODE ?? 'otp';

  let plainToken: string;

  if (mode === 'token') {
    plainToken = crypto.randomBytes(32).toString('hex');
  } else {
    // default OTP
    plainToken = `${Math.floor(Math.random() * 1_000_000)}`.padStart(6, '0');
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(plainToken)
    .digest('hex');

  const expiresAt = new Date(
    Date.now() +
      Number(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES ?? 15) * 60 * 1000,
  );

  return {
    plainToken,
    hashedToken,
    expiresAt,
  };
}

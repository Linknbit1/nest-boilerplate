import crypto from 'crypto';

export function generateVerificationToken(mode?: string, expiry: number = 15) {
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

  const expiresAt = new Date(Date.now() + expiry * 60 * 1000);

  return {
    plainToken,
    hashedToken,
    expiresAt,
  };
}

export function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw.trim()).digest('hex');
}

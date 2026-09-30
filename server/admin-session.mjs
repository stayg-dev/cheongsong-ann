import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const sessionLifetime = 8 * 60 * 60 * 1000;
export function sessionConfigured(config) {
  return (config.ADMIN_SESSION_SECRET?.length ?? 0) >= 32 && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.ADMIN_PASSWORD_HASH ?? '');
}
function sign(payload, config) {
  return createHmac('sha256', config.ADMIN_SESSION_SECRET)
    .update(`${config.ADMIN_USERNAME || 'admin'}:${config.ADMIN_PASSWORD_HASH}:${payload}`).digest('base64url');
}
export function issueSession(config, now = Date.now()) {
  const payload = `${now + sessionLifetime}.${randomBytes(24).toString('base64url')}`;
  return `${payload}.${sign(payload, config)}`;
}
export function verifySession(token, config, now = Date.now()) {
  if (!sessionConfigured(config) || typeof token !== 'string' || token.length > 200) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d{13}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{32}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return false;
  const expires = Number(parts[0]);
  if (expires <= now || expires > now + sessionLifetime) return false;
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, config));
  return timingSafeEqual(expected, Buffer.from(parts[2]));
}

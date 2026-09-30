import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../server/password.mjs';

const file = new URL('../.env.local', import.meta.url);
const content = existsSync(file) ? readFileSync(file, 'utf8') : readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
const env = parseEnv(content);
let next = content;
for (const [key, value] of Object.entries({
  ADMIN_PASSWORD_HASH: env.ADMIN_PASSWORD_HASH || await hashPassword(process.env.INITIAL_ADMIN_PASSWORD || 'admin123!'),
  ADMIN_SESSION_SECRET: env.ADMIN_SESSION_SECRET || randomBytes(32).toString('hex'),
})) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  next = pattern.test(next) ? next.replace(pattern, `${key}=${value}`) : `${next}\n${key}=${value}\n`;
}
writeFileSync(file, next, { encoding: 'utf8', mode: 0o600 });
console.log('관리자 비밀번호 해시와 세션 서명키를 .env.local에 준비했습니다. 기존 설정값은 유지합니다.');

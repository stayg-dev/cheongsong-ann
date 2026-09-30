import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from './password.mjs';
import { issueSession, verifySession, sessionLifetime } from './admin-session.mjs';
import { runtimeConfig } from './runtime-config.mjs';

test('signed sessions reject tampering, expiry and credential rotation', async () => {
  const config = { ADMIN_PASSWORD_HASH: await hashPassword('admin123!'), ADMIN_SESSION_SECRET: 'test-session-secret-at-least-32-characters' };
  const now = Date.now();
  const token = issueSession(config, now);
  assert.equal(verifySession(token, { ...config }, now), true);
  assert.equal(verifySession(`${token}x`, config, now), false);
  assert.equal(verifySession(token.replace(/^\d+/, String(now + sessionLifetime + 1)), config, now), false);
  assert.equal(verifySession(token, config, now + sessionLifetime), false);
  assert.equal(verifySession(token, { ...config, ADMIN_SESSION_SECRET: 'different-session-secret-with-at-least-32-chars' }, now), false);
  assert.equal(verifySession(token, { ...config, ADMIN_PASSWORD_HASH: await hashPassword('changed') }, now), false);
  assert.equal(verifySession(token, { ...config, ADMIN_USERNAME: 'different' }, now), false);
  assert.equal(verifySession(undefined, config, now), false);
});

test('Vercel preview and production origins use explicit deployment settings', () => {
  assert.equal(runtimeConfig({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL: 'preview.vercel.app', APP_ORIGIN: 'https://ann.example' }).APP_ORIGIN, 'https://ann.example');
  assert.equal(runtimeConfig({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL: 'preview.vercel.app' }).APP_ORIGIN, 'https://preview.vercel.app');
  assert.equal(runtimeConfig({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_URL: 'deployment.vercel.app', APP_ORIGIN: 'https://ann.example' }).APP_ORIGIN, 'https://ann.example');
  assert.equal(runtimeConfig({ VERCEL: '1', VERCEL_PROJECT_PRODUCTION_URL: 'ann.vercel.app' }).APP_ORIGIN, 'https://ann.vercel.app');
  assert.equal(runtimeConfig({ VERCEL: '1' }).NODE_ENV, 'production');
});

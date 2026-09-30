import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { hashPassword } from './password.mjs';

test('Vercel entry handles secure login, PMS CRUD and sessions across function instances', async () => {
  const nativeFetch = globalThis.fetch;
  const env = { VERCEL: '1', VERCEL_ENV: 'production', APP_ORIGIN: 'https://ann.example.com', ADMIN_PASSWORD_HASH: await hashPassword('admin123!'), ADMIN_SESSION_SECRET: 'vercel-test-session-secret-at-least-32-characters', PMS_API_KEY: 'vercel-test-pms-key-at-least-32-characters' };
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    return new Response(JSON.stringify({ code: 200, data: url.endsWith('/admin-login-attempt') ? null : { revision: null, notices: [] } }), { status: 200 });
  };
  const servers = [];
  try {
    for (let i = 0; i < 2; i++) {
      const { default: handler } = await import(`../api/index.js?instance=${i}`);
      const server = createServer(handler);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      servers.push(server);
    }
    const first = `http://127.0.0.1:${servers[0].address().port}`;
    const second = `http://127.0.0.1:${servers[1].address().port}`;
    const headers = { Origin: env.APP_ORIGIN, 'Content-Type': 'application/json' };
    const login = await nativeFetch(`${first}/api/admin/login`, { method: 'POST', headers, body: JSON.stringify({ username: 'admin', password: 'admin123!' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie');
    assert.match(cookie, /^__Host-ann_admin=/); assert.match(cookie, /; Secure;/); assert.match(cookie, /HttpOnly/);
    headers.Cookie = cookie.split(';')[0];
    assert.equal((await nativeFetch(`${second}/api/admin/session`, { headers })).status, 200);
    const created = await nativeFetch(`${second}/api/admin/notices`, { method: 'POST', headers, body: JSON.stringify({ revision: null, notice: { title: '공지', body: '내용', category: '공지' } }) });
    assert.equal(created.status, 201);
    assert.equal(calls.at(-1).url, 'https://pms-api.hio.ai.kr/api/projects/0655428b-84be-4d1e-b194-e679a7e1f3c8/website/admin/notices');
    assert.equal((await nativeFetch(`${first}/api/notices`)).status, 200);
    const unknown = await nativeFetch(`${first}/api/not-a-route`);
    assert.equal(unknown.status, 404); assert.match(unknown.headers.get('content-type'), /application\/json/);
    const rejected = await nativeFetch(`${second}/api/admin/logout`, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: '{}' });
    assert.equal(rejected.status, 403);
  } finally {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
    globalThis.fetch = nativeFetch;
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

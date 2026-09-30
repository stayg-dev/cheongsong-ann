import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from './app.mjs';
import { hashPassword } from './password.mjs';

const origin = 'http://localhost:5173';
const project = '0655428b-84be-4d1e-b194-e679a7e1f3c8';
const id = 'a993c629-3d6a-4d17-afda-40a4b9ba5501';
const revision = '6ac465e2-c4e6-400d-b56e-c5c23f8af2b2';
let server, base, cookie, config, clock = Date.now(), calls = [], upstreamStatus = 200, loginCalls = 0;
let loginWindow = 0;
const fetchImpl = async (url, options) => {
  calls.push({ url, ...options });
  if (url.endsWith('/admin-login-attempt')) {
    const currentWindow = Math.floor(clock / 60000);
    if (currentWindow !== loginWindow) { loginCalls = 0; loginWindow = currentWindow; }
    const status = ++loginCalls > 10 ? 429 : upstreamStatus;
    return new Response(JSON.stringify({ code: 200, data: null }), { status });
  }
  return new Response(JSON.stringify({ code: 200, data: { revision, notices: [{ id, title: '공지', body: '<script>alert(1)</script>\n본문', category: '공지', created_at: '2026-09-30T09:00:00+09:00' }] } }), { status: upstreamStatus });
};
before(async () => {
  config = { APP_ORIGIN: origin, ADMIN_PASSWORD_HASH: await hashPassword('admin123!'), ADMIN_SESSION_SECRET: 'test-session-secret-at-least-32-characters', PMS_API_BASE_URL: 'https://pms.test/api', PMS_API_KEY: 'server-only-secret-key-longer-than-32-chars' };
  server = createServer(createApp(config, {
    now: () => clock,
    fetchImpl,
  }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); });
const send = (path, method = 'GET', body, extra = {}) => fetch(`${base}/api${path}`, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

test('admin APIs reject unauthenticated requests before reaching PMS', async () => {
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    const response = await send(`/admin/notices${['PUT', 'DELETE'].includes(method) ? `/${id}` : ''}`, method, method === 'GET' ? undefined : {});
    assert.equal(response.status, 401);
  }
  assert.equal(calls.length, 0);
});
test('login rejects wrong credentials and cross-origin requests', async () => {
  assert.equal((await send('/admin/login', 'POST', { username: 'admin', password: 'wrong' })).status, 401);
  assert.equal((await send('/admin/login', 'POST', { username: 'admin', password: 'admin123!' }, { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await send('/admin/login', 'POST', { username: 'admin', password: 'admin123!' }, { 'Content-Type': 'text/plain' })).status, 403);
});
test('login creates a signed HttpOnly session; no credentials are returned', async () => {
  const response = await send('/admin/login', 'POST', { username: 'admin', password: 'admin123!' });
  assert.equal(response.status, 200);
  const header = response.headers.get('set-cookie');
  assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/);
  cookie = header.split(';')[0];
  assert.deepEqual(await response.json(), { username: 'admin' });
  assert.equal((await send('/admin/session')).status, 200);
});
test('CRUD is mapped to the fixed PMS project and preserves revision checks', async () => {
  const notice = { title: '  새 소식  ', body: '본문\n다음 줄', category: '안내' };
  assert.equal((await send('/admin/notices', 'POST', { notice, revision: null })).status, 201);
  assert.equal(calls.at(-1).url, `https://pms.test/api/projects/${project}/website/admin/notices`);
  assert.equal(calls.at(-1).redirect, 'error');
  assert.equal(calls.at(-1).headers['X-Website-Key'], 'server-only-secret-key-longer-than-32-chars');
  assert.equal(JSON.parse(calls.at(-1).body).notice.title, '새 소식');
  assert.equal((await send(`/admin/notices/${id}`, 'PUT', { notice, revision })).status, 200);
  assert.equal(JSON.parse(calls.at(-1).body).revision, revision);
  upstreamStatus = 409;
  const stale = await send(`/admin/notices/${id}`, 'DELETE', { revision });
  assert.equal(stale.status, 409); assert.match((await stale.json()).message, /새로고침/);
  upstreamStatus = 200;
  assert.equal((await send(`/admin/notices/${id}`, 'DELETE', { revision })).status, 200);
});
test('invalid notice bodies, IDs, missing revisions and CSRF are rejected before PMS', async () => {
  const count = calls.length;
  for (const body of [{}, { revision: null, notice: { title: ' ', body: '내용', category: '공지' } }, { revision: null, notice: { title: '공지', body: '내용', category: '없는분류' } }]) assert.equal((await send('/admin/notices', 'POST', body)).status, 400);
  assert.equal((await send('/admin/notices/not-a-uuid', 'DELETE', { revision })).status, 400);
  assert.equal((await send(`/admin/notices/${id}`, 'DELETE', { revision }, { Origin: 'https://evil.test' })).status, 403);
  assert.equal(calls.length, count);
});
test('public list uses server-held credentials and sanitizes upstream failures', async () => {
  const response = await send('/notices');
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /server-only-secret/);
  upstreamStatus = 500;
  assert.equal((await send('/notices')).status, 502);
  upstreamStatus = 200;
});
test('sessions survive a cold start and logout clears the browser cookie', async () => {
  const other = createServer(createApp(config, { now: () => clock, fetchImpl }));
  await new Promise((resolve) => other.listen(0, '127.0.0.1', resolve));
  try {
    assert.equal((await fetch(`http://127.0.0.1:${other.address().port}/api/admin/session`, { headers: { Cookie: cookie } })).status, 200);
  } finally { await new Promise((resolve) => other.close(resolve)); }
  const response = await send('/admin/logout', 'POST', {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  cookie = '';
  assert.equal((await send('/admin/session')).status, 401);
});
test('sessions expire after eight hours', async () => {
  const response = await send('/admin/login', 'POST', { username: 'admin', password: 'admin123!' });
  cookie = response.headers.get('set-cookie').split(';')[0];
  clock += 8 * 60 * 60 * 1000 + 1;
  assert.equal((await send('/admin/session')).status, 401);
});
test('shared PMS budget cannot be bypassed with a cold start or spoofed client IP', async () => {
  const other = createServer(createApp(config, { now: () => clock, fetchImpl }));
  await new Promise((resolve) => other.listen(0, '127.0.0.1', resolve));
  try {
    for (let i = 0; i < 10; i++) {
      const host = i % 2 ? base : `http://127.0.0.1:${other.address().port}`;
      assert.equal((await fetch(`${host}/api/admin/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Forwarded-For': `1.2.3.${i}` }, body: JSON.stringify({ username: 'admin', password: 'wrong' }) })).status, 401);
    }
    assert.equal((await send('/admin/login', 'POST', { username: 'admin', password: 'admin123!' })).status, 429);
  } finally { await new Promise((resolve) => other.close(resolve)); }
});
test('unconfigured PMS fails closed instead of substituting browser data', async () => {
  const unconfigured = createServer(createApp({ APP_ORIGIN: origin }));
  await new Promise((resolve) => unconfigured.listen(0, '127.0.0.1', resolve));
  try { assert.equal((await fetch(`http://127.0.0.1:${unconfigured.address().port}/api/notices`)).status, 503); }
  finally { await new Promise((resolve) => unconfigured.close(resolve)); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from './app.mjs';
import { runtimeConfig } from './runtime-config.mjs';

async function withApp(config, run) {
  const server = createServer(createApp(runtimeConfig(config)));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/admin/logout`;
    await run((headers) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' }));
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

test('preview accepts configured and deployment origins even with a local APP_ORIGIN', async () => {
  await withApp({ VERCEL: '1', VERCEL_ENV: 'preview', APP_ORIGIN: 'http://localhost:5173', VERCEL_URL: 'ann-build.vercel.app', VERCEL_BRANCH_URL: 'ann-git-feature.vercel.app' }, async (send) => {
    for (const origin of ['https://ann-build.vercel.app', 'https://ann-git-feature.vercel.app']) {
      assert.equal((await send({ Origin: origin })).status, 200);
    }
    for (const origin of [undefined, 'null', 'https://evil.vercel.app', 'https://ann-build.vercel.app.evil.test', 'http://ann-build.vercel.app', 'https://ann-build.vercel.app:444', 'https://ann-build.vercel.app/path']) {
      const headers = origin === undefined ? {} : { Origin: origin };
      assert.equal((await send({ ...headers, 'X-Forwarded-Host': 'evil.vercel.app' })).status, 403, `reject ${origin}`);
    }
    assert.equal((await send({ Origin: 'https://ann-build.vercel.app', 'Content-Type': 'text/plain' })).status, 403);
  });
});

test('local server ignores deployment metadata and spoofed forwarded headers', async () => {
  await withApp({ APP_ORIGIN: ' http://localhost:5173/ ', VERCEL_URL: 'untrusted.vercel.app' }, async (send) => {
    assert.equal((await send({ Origin: 'http://localhost:5173' })).status, 200);
    assert.equal((await send({ Origin: 'https://untrusted.vercel.app' })).status, 403);
    assert.equal((await send({ Origin: 'https://evil.test', 'X-Forwarded-Host': 'evil.test', 'X-Forwarded-Proto': 'https' })).status, 403);
  });
});

test('invalid configured URLs do not silently grant access to their origin', async () => {
  for (const configured of ['https://ann.example/admin', 'https://user:password@ann.example', 'https://ann.example?redirect=1', 'https://ann.example#fragment', 'null']) {
    await withApp({ APP_ORIGIN: configured }, async (send) => {
      assert.equal((await send({ Origin: 'https://ann.example' })).status, 403);
    });
  }
});

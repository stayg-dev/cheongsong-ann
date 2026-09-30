import { loadEnvFile } from 'node:process';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
import { runtimeConfig } from './runtime-config.mjs';

try { loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const port = Number(process.env.PORT || 3100);
const config = runtimeConfig(process.env);
if (config.NODE_ENV === 'production' && !config.APP_ORIGIN.startsWith('https://')) throw new Error('Production APP_ORIGIN must use HTTPS.');
const app = createApp(config);
const dist = fileURLToPath(new URL('../dist', import.meta.url));
app.use(express.static(dist));
app.get('/{*path}', (_req, res) => res.sendFile(`${dist}/index.html`));
const server = app.listen(port, '127.0.0.1', () => console.log(`청송 홈페이지 API: http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

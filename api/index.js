import { createApp } from '../server/app.mjs';
import { runtimeConfig } from '../server/runtime-config.mjs';

// Vercel invokes this handler; do not open a listening socket here.
export default createApp(runtimeConfig(process.env));

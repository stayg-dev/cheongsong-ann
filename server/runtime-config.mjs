function normalizeOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function allowedRequestOrigins(config) {
  const candidates = [config.APP_ORIGIN];
  // Only use server configuration, never caller-controlled Host/forwarded headers.
  if (config.VERCEL === '1') {
    for (const host of [config.VERCEL_URL, config.VERCEL_BRANCH_URL, config.VERCEL_PROJECT_PRODUCTION_URL]) {
      if (host) candidates.push(`https://${host}`);
    }
  }
  return new Set(candidates.map(normalizeOrigin).filter(Boolean));
}

export function runtimeConfig(env) {
  const previewOrigin = env.VERCEL_ENV === 'preview' && env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '';
  const deploymentOrigin = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  return {
    ...env,
    NODE_ENV: env.VERCEL ? 'production' : env.NODE_ENV,
    APP_ORIGIN: env.APP_ORIGIN || previewOrigin || (deploymentOrigin ? `https://${deploymentOrigin}` : `http://localhost:${env.PORT || 3100}`),
  };
}

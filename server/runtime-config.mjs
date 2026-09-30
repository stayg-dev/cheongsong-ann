export function runtimeConfig(env) {
  const previewOrigin = env.VERCEL_ENV === 'preview' && env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '';
  const deploymentOrigin = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  return {
    ...env,
    NODE_ENV: env.VERCEL ? 'production' : env.NODE_ENV,
    APP_ORIGIN: previewOrigin || env.APP_ORIGIN || (deploymentOrigin ? `https://${deploymentOrigin}` : `http://localhost:${env.PORT || 3100}`),
  };
}

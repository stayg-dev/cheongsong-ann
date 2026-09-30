import express from 'express';
import { verifyPassword } from './password.mjs';
import { PMS_PROJECT_ID } from './pms-config.mjs';
import { issueSession, verifySession, sessionConfigured, sessionLifetime } from './admin-session.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail = (status, message) => Object.assign(new Error(message), { status });

export function createApp(config, { fetchImpl = fetch, now = Date.now } = {}) {
  const app = express();
  const secure = config.NODE_ENV === 'production';
  const cookieName = secure ? '__Host-ann_admin' : 'ann_admin';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'strict', path: '/' };
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    next();
  });
  app.use('/api', (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.headers.origin !== config.APP_ORIGIN || !req.is('application/json')) {
        return next(fail(403, '허용되지 않은 요청입니다. 페이지를 새로고침해 주세요.'));
      }
    }
    next();
  });
  app.use('/api', express.json({ limit: '128kb', strict: true }));

  const getSession = (req) => {
    const token = req.headers.cookie?.split(';').map((v) => v.trim()).find((v) => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    return verifySession(token, config, now()) ? { username: config.ADMIN_USERNAME || 'admin' } : null;
  };
  const auth = (req, _res, next) => {
    req.adminSession = getSession(req);
    if (!req.adminSession) return next(fail(401, '로그인이 필요합니다. 다시 로그인해 주세요.'));
    next();
  };
  const pms = async (path, method = 'GET', body) => {
    if (config.PMS_API_KEY?.length < 32 || !config.PMS_API_KEY) {
      throw fail(503, 'PMS 연결 설정이 필요합니다. 관리자에게 문의해 주세요.');
    }
    let base;
    try {
      base = new URL(config.PMS_API_BASE_URL || 'https://pms-api.hio.ai.kr/api');
      if (base.username || base.password || base.search || base.hash || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) throw new Error();
    } catch { throw fail(503, 'PMS API 주소 설정을 확인해 주세요.'); }
    let response;
    try {
      response = await fetchImpl(`${base.toString().replace(/\/$/, '')}/projects/${PMS_PROJECT_ID}/website/${path}`, {
        method, headers: { 'Content-Type': 'application/json', 'X-Website-Key': config.PMS_API_KEY },
        redirect: 'error', cache: 'no-store',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000),
      });
    } catch { throw fail(502, 'PMS 응답을 확인하지 못했습니다. 새로고침으로 처리 결과를 확인한 뒤 다시 시도해 주세요.'); }
    if (!response.ok) {
      const messages = { 400: '입력값 또는 공지 보관 한도(200개·4MB)를 확인해 주세요.', 404: '공지를 찾을 수 없습니다.', 409: '다른 창에서 공지가 변경되었습니다. 작성 내용을 복사한 후 목록을 새로고침해 주세요.', 429: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' };
      throw fail(messages[response.status] ? response.status : 502, messages[response.status] || 'PMS 연동에 실패했습니다. 연결 설정을 확인해 주세요.');
    }
    try {
      const result = await response.json();
      if (result.code !== 200 || (path !== 'admin-login-attempt' && !Array.isArray(result.data?.notices))) throw new Error();
      return result.data;
    } catch { throw fail(502, 'PMS 응답을 확인할 수 없습니다.'); }
  };
  app.post('/api/admin/login', async (req, res) => {
    if (!sessionConfigured(config)) throw fail(503, '관리자 계정 설정이 필요합니다.');
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 256) throw fail(400, '아이디와 비밀번호를 확인해 주세요.');
    // PMS keeps the shared budget across Vercel instances and cold starts.
    try { await pms('admin-login-attempt', 'POST', {}); }
    catch (error) { if (error.status === 429) res.set('Retry-After', '60'); throw error; }
    const valid = await verifyPassword(password, config.ADMIN_PASSWORD_HASH);
    if (!valid || username !== (config.ADMIN_USERNAME || 'admin')) throw fail(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
    const token = issueSession(config, now());
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionLifetime });
    res.json({ username });
  });
  app.get('/api/admin/session', auth, (req, res) => res.json({ username: req.adminSession.username }));
  app.post('/api/admin/logout', (_req, res) => {
    res.clearCookie(cookieName, cookieOptions).json({ ok: true });
  });
  app.get('/api/notices', async (_req, res) => res.json(await pms('notices')));
  app.use('/api/admin/notices', auth);
  app.get('/api/admin/notices', async (_req, res) => res.json(await pms('admin/notices')));
  const validateRevision = (body) => {
    if (!body || !(body.revision === null || (typeof body.revision === 'string' && uuid.test(body.revision)))) throw fail(400, '목록을 새로고침한 후 다시 시도해 주세요.');
    return body.revision;
  };
  const validateNotice = (body) => {
    const revision = validateRevision(body);
    const n = body.notice;
    if (!n || typeof n.title !== 'string' || !n.title.trim() || n.title.trim().length > 120 || typeof n.body !== 'string' || !n.body.trim() || n.body.trim().length > 20000 || !['공지', '안내', '이벤트'].includes(n.category)) throw fail(400, '제목(120자), 내용(20,000자), 분류를 확인해 주세요.');
    return { revision, notice: { title: n.title.trim(), body: n.body.trim(), category: n.category } };
  };
  app.param('id', (_req, _res, next, id) => next(uuid.test(id) ? undefined : fail(400, '잘못된 공지 번호입니다.')));
  app.post('/api/admin/notices', async (req, res) => res.status(201).json(await pms('admin/notices', 'POST', validateNotice(req.body))));
  app.put('/api/admin/notices/:id', async (req, res) => res.json(await pms(`admin/notices/${req.params.id}`, 'PUT', validateNotice(req.body))));
  app.delete('/api/admin/notices/:id', async (req, res) => res.json(await pms(`admin/notices/${req.params.id}`, 'DELETE', { revision: validateRevision(req.body) })));
  app.use('/api', (_req, _res, next) => next(fail(404, '요청한 API를 찾을 수 없습니다.')));
  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    const message = error.type === 'entity.parse.failed' ? '올바른 JSON 요청이 필요합니다.' : error.type === 'entity.too.large' ? '입력 내용이 너무 큽니다.' : status < 500 || status === 502 || status === 503 ? error.message : '요청을 처리하지 못했습니다.';
    res.status(status).json({ message });
  });
  return app;
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, noticeDate } from './api';
import './admin.css';

const emptyNotice = () => ({ title: '', body: '', category: '공지' });

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [snapshot, setSnapshot] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editRevision, setEditRevision] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [page, setPage] = useState(1);
  const dirty = draft !== null;

  function handleError(error) {
    setError(error.message);
    if (error.status === 401) { setUser(null); setSnapshot(null); }
  }
  async function load() {
    setLoading(true); setError('');
    try { setSnapshot(await api('/admin/notices')); }
    catch (error) { handleError(error); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    api('/admin/session', { signal: controller.signal }).then(setUser).catch((error) => {
      if (error.status !== 401 && error.name !== 'AbortError') setError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (user) load(); }, [user]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const discard = () => !dirty || window.confirm('작성 중인 내용을 버리시겠습니까?');
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      setUser(await api('/admin/login', { method: 'POST', body: credentials }));
      setCredentials({ username: '', password: '' });
    } catch (error) { handleError(error); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (!discard()) return;
    setBusy(true); setError('');
    try { await api('/admin/logout', { method: 'POST', body: {} }); setUser(null); setSnapshot(null); setDraft(null); setSuccess(''); }
    catch (error) { handleError(error); }
    finally { setBusy(false); }
  }
  function edit(notice) {
    if (!discard()) return;
    setEditingId(notice?.id ?? null); setEditRevision(snapshot.revision);
    setDraft(notice ? { title: notice.title, body: notice.body, category: notice.category } : emptyNotice());
    setError(''); setSuccess('');
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const next = await api(`/admin/notices${editingId ? `/${editingId}` : ''}`, { method: editingId ? 'PUT' : 'POST', body: { notice: draft, revision: editRevision } });
      setSnapshot(next); setDraft(null); setSuccess(editingId ? '공지를 수정했습니다.' : '공지를 등록했습니다.');
    } catch (error) { handleError(error); }
    finally { setBusy(false); }
  }
  async function remove(notice) {
    if (!window.confirm(`“${notice.title}” 공지를 삭제하시겠습니까? 삭제한 공지는 복구할 수 없습니다.`)) return;
    setBusy(true); setError(''); setSuccess('');
    try { setSnapshot(await api(`/admin/notices/${notice.id}`, { method: 'DELETE', body: { revision: snapshot.revision } })); setSuccess('공지를 삭제했습니다.'); }
    catch (error) { handleError(error); }
    finally { setBusy(false); }
  }
  const filtered = (snapshot?.notices ?? []).filter((n) => (category === '전체' || n.category === category) && `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);

  return <main className="admin-page">
    <header className="admin-header"><Link to="/" onClick={(event) => { if (!discard()) event.preventDefault(); }}><strong>청송 한옥호텔 안</strong><span>ANN · ADMIN</span></Link>{user && <div><Link to="/announcement" target="_blank">공지 페이지 보기 ↗</Link><button disabled={busy} onClick={logout}>로그아웃</button></div>}</header>
    {checking ? <p className="admin-loading" role="status">로그인 상태를 확인하고 있습니다.</p> : !user ? <section className="admin-login">
      <span className="admin-eyebrow">CHEONGSONG HANOK ANN</span><h1>관리자 로그인</h1><p>호텔의 새로운 소식과 이용 안내를 관리하세요.</p>
      <form onSubmit={login}>
        <label>아이디<input autoFocus autoComplete="username" required value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} /></label>
        <label>비밀번호<input type="password" autoComplete="current-password" required maxLength={256} value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="admin-primary" disabled={busy}>{busy ? '로그인 중…' : '로그인'}</button>
      </form><Link className="admin-back" to="/">← 홈페이지로 돌아가기</Link>
    </section> : <div className="admin-content">
      <div className="admin-title"><div><span className="admin-eyebrow">ANNOUNCEMENTS</span><h1>공지사항 관리</h1><p>등록한 공지는 홈페이지에 바로 공개됩니다.</p></div><button className="admin-primary" disabled={busy || loading || !snapshot} onClick={() => edit(null)}>＋ 새 공지 작성</button></div>
      {error && <p className="admin-error" role="alert">{error}</p>}{success && <p className="admin-success" role="status">{success}</p>}
      {draft && <section className="admin-editor" aria-label={editingId ? '공지 수정' : '공지 작성'}><h2>{editingId ? '공지 수정' : '새 공지 작성'}</h2><form onSubmit={save}>
        <fieldset disabled={busy}><label>분류<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{['공지', '안내', '이벤트'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>제목<input autoFocus required maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="공지 제목을 입력하세요" /><small>{draft.title.length} / 120</small></label>
        <label>내용<textarea required maxLength={20000} rows={12} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="고객에게 전달할 내용을 입력하세요" /><small>{draft.body.length.toLocaleString()} / 20,000 · 줄바꿈이 유지됩니다.</small></label></fieldset>
        <div className="admin-form-actions"><button type="button" disabled={busy} onClick={() => { if (discard()) setDraft(null); }}>취소</button><button className="admin-primary" disabled={busy || !draft.title.trim() || !draft.body.trim()}>{busy ? '저장 중…' : editingId ? '수정 저장' : '공지 등록'}</button></div>
      </form></section>}
      <section className="admin-notices" aria-label="공지 목록"><div className="admin-toolbar"><strong>전체 {snapshot?.notices.length ?? 0}건</strong><div><label><span className="sr-only">분류 필터</span><select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>{['전체', '공지', '안내', '이벤트'].map((c) => <option key={c}>{c}</option>)}</select></label><label><span className="sr-only">공지 검색</span><input type="search" placeholder="제목·내용 검색" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label><button disabled={busy || loading} onClick={() => { if (discard()) { setDraft(null); load(); } }}>새로고침</button></div></div>
        {loading ? <p className="admin-empty" role="status">공지를 불러오고 있습니다.</p> : !snapshot ? <p className="admin-empty">공지 목록을 불러오지 못했습니다. 연결 확인 후 새로고침해 주세요.</p> : !filtered.length ? <p className="admin-empty">{query || category !== '전체' ? '검색 결과가 없습니다.' : '등록된 공지가 없습니다. 첫 소식을 작성해 보세요.'}</p> : <div className="admin-table-wrap"><table><thead><tr><th>분류</th><th>제목</th><th>등록일</th><th>관리</th></tr></thead><tbody>{filtered.slice((currentPage - 1) * 10, currentPage * 10).map((n) => <tr key={n.id}><td><span className="admin-badge">{n.category}</span></td><td><strong>{n.title}</strong><p>{n.body.slice(0, 90)}</p></td><td><time dateTime={n.created_at}>{noticeDate(n.created_at)}</time></td><td><div className="admin-row-actions"><button disabled={busy} onClick={() => edit(n)}>수정</button><button className="admin-delete" disabled={busy || dirty} onClick={() => remove(n)}>삭제</button></div></td></tr>)}</tbody></table></div>}
        {pages > 1 && <nav className="admin-pagination" aria-label="공지 페이지"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>이전</button><span>{currentPage} / {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>다음</button></nav>}
      </section>
    </div>}
  </main>;
}

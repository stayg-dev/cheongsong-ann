export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options, credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
  let data;
  try { data = await response.json(); } catch { throw new Error('서버 응답을 확인할 수 없습니다.'); }
  if (!response.ok) throw Object.assign(new Error(data.message || '요청을 처리하지 못했습니다.'), { status: response.status });
  return data;
}

export const noticeDate = (date) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));

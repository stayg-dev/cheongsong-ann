import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { asset, options, roomCatalog } from './data';
import { api, noticeDate } from './api';
import ReservationButton from './ReservationButton';

const money = (value) => value.toLocaleString('ko-KR');

export function PageHero() {
  return (
    <section className="hero page-hero">
      <img src={asset('hero.webp')} alt="산으로 둘러싸인 청송 한옥마을 전경" />
      <div className="hero-shade" />
      <div className="hero-copy shell">
        <span>HANOK STORY</span>
        <h1>청송의 자연과 한옥의 품에서, 가장 편안한 하루를</h1>
      </div>
    </section>
  );
}

function PageTitle({ eyebrow, title, children }) {
  return (
    <header className="page-title">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function RoomsPage() {
  return (
    <>
      <PageHero />
      <main className="rooms-page shell">
        <PageTitle eyebrow="ROOMS" title={<>일곱 채의 한옥,<br />일곱 가지 쉼</>}>
          <p>같은 청송이지만,<br />머무는 공간에 따라 하루의 풍경은 달라집니다.<br />당신만의 쉼을 선택해 보세요.</p>
        </PageTitle>
        <nav className="room-index" aria-label="객실 바로가기">
          {roomCatalog.map((room) => <a key={room.id} href={`#${room.id}`}>{room.name}</a>)}
        </nav>
        <div className="room-list">
          {roomCatalog.map((room, index) => (
            <article className={`room-detail ${index % 2 ? 'reverse' : ''}`} id={room.id} key={room.id}>
              <img src={asset(room.image)} alt={`${room.name} 전경`} />
              <div className="room-detail-copy">
                <span>ROOM {room.number}</span>
                <h2>{room.name}</h2>
                <h3>{room.hanja} · {room.english}</h3>
                <p>{room.copy}</p>
                <dl><div><dt>SIZE</dt><dd>{room.size}</dd></div><div><dt>GUESTS</dt><dd>{room.guests}</dd></div></dl>
                <ReservationButton className="outline-button">예약하기 →</ReservationButton>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

export function AnnouncementPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [open, setOpen] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api('/notices', { signal: controller.signal }).then((data) => setNotices(data.notices)).catch((error) => {
      if (error.name !== 'AbortError') setError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const filtered = notices.filter((n) => (category === '전체' || n.category === category) && `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);

  return (
    <>
      <PageHero />
      <main className="announcement-page shell">
        <PageTitle eyebrow="Announcement" title="공지 사항" />
        <div className="notice-tools">
          <span>전체 {filtered.length}건</span>
          <label className="notice-search"><span className="sr-only">공지 검색</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /><b>⌕</b></label>
        </div>
        <div className="notice-filters">
          {['전체', '공지', '안내', '이벤트'].map((item) => <button className={category === item ? 'active' : ''} type="button" key={item} onClick={() => { setCategory(item); setPage(1); }}>{item}</button>)}
        </div>
        <div className="notice-list">
          {loading ? <p role="status">공지를 불러오고 있습니다.</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setReload((value) => value + 1)}>다시 시도</button></div> : !filtered.length ? <p>등록된 공지 또는 검색 결과가 없습니다.</p> : filtered.slice((currentPage - 1) * 10, currentPage * 10).map((notice) => (
            <article className={`notice-row ${open === notice.id ? 'open' : ''}`} key={notice.id}>
              <button type="button" aria-expanded={open === notice.id} onClick={() => setOpen(open === notice.id ? null : notice.id)}>
                <span>{notice.category}</span><div><h2>{notice.title}</h2><p>{notice.body.slice(0, 100)}</p></div><time dateTime={notice.created_at}>{noticeDate(notice.created_at)}</time>
              </button>
              {open === notice.id && <div className="notice-expanded" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{notice.body}</div>}
            </article>
          ))}
        </div>
        {!loading && !error && pages > 1 && <nav className="pagination" aria-label="페이지 이동"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button>{Array.from({ length: pages }, (_, i) => <button key={i} aria-current={currentPage === i + 1 ? 'page' : undefined} className={currentPage === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}<button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>›</button></nav>}
      </main>
    </>
  );
}

function SectionBar({ title, english }) {
  return <header className="form-section-title"><h2>{title}</h2><span>{english}</span></header>;
}

function StaySearch() {
  return (
    <div className="stay-search">
      <div><span>Check - in</span><b>2026.07.15 수</b></div>
      <div><span>Check - out</span><b>2026.07.17 금</b></div>
      <div><span>Guests</span><b>성인 2명</b></div>
      <button type="button">검색 · 2박</button>
    </div>
  );
}

function GuestForm({ form, setForm }) {
  const field = (key) => ({ value: form[key], onChange: (event) => setForm({ ...form, [key]: event.target.value }) });
  return (
    <div className="guest-form">
      <label><span>예약자명 *</span><input required placeholder="성함을 입력해 주십시오" {...field('name')} /></label>
      <label><span>연락처 *</span><input required placeholder="010-1234-1234" {...field('phone')} /></label>
      <label><span>이메일 *</span><input required type="email" placeholder="예약 확인서를 받으실 이메일" {...field('email')} /></label>
      <label><span>요청사항</span><textarea placeholder="예: 늦은 도착 · 기념일 방문 등" {...field('request')} /></label>
    </div>
  );
}

function PaymentAndTerms({ setAgreed, total }) {
  const terms = [
    { id: 'service', label: '이용약관 동의', required: true },
    { id: 'privacy', label: '개인정보 수집 및 이용 동의', required: true },
    { id: 'refund', label: '취소 · 환불 규정 확인', required: true },
    { id: 'marketing', label: '마케팅 동의(선택)', required: false },
  ];
  const [consents, setConsents] = useState(() => Object.fromEntries(terms.map(({ id }) => [id, false])));
  const allChecked = terms.every(({ id }) => consents[id]);

  const updateConsents = (next) => {
    setConsents(next);
    setAgreed(terms.filter(({ required }) => required).every(({ id }) => next[id]));
  };

  const toggleAll = (checked) => {
    updateConsents(Object.fromEntries(terms.map(({ id }) => [id, checked])));
  };

  const toggleTerm = (id, checked) => {
    updateConsents({ ...consents, [id]: checked });
  };

  return (
    <>
      <SectionBar title="결제 수단" english="Payment" />
      <div className="payment-box"><b>◉ &nbsp; 무통장 입금</b><span>24시간 내 입금 확인 시 예약이 확정됩니다.</span></div>
      <div className="promo"><input placeholder="쿠폰 · 프로모션 코드" /><button type="button">적용</button></div>
      <SectionBar title="취소 규정 · 약관 동의" english="Agreement" />
      <div className="refund-box"><b>취소 및 환불 규정</b><p>체크인 3일 전 17:00까지 취소 시 결제금액의 100% 환불<br />체크인 2일 전부터 당일 및 No-Show는 취소 및 환불이 불가합니다.</p></div>
      <div className="agreement-list">
        <label><input type="checkbox" checked={allChecked} onChange={(event) => toggleAll(event.target.checked)} /> 전체 약관에 동의합니다.</label>
        {terms.map(({ id, label }) => (
          <label key={id}>
            <input type="checkbox" checked={consents[id]} onChange={(event) => toggleTerm(id, event.target.checked)} />
            {label}<small>보기→</small>
          </label>
        ))}
      </div>
      <div className="booking-total"><span>Total</span><strong>{money(total)}<small>원</small></strong></div>
    </>
  );
}

export function ReservationPage() {
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState('hunjang');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', request: '' });
  const room = roomCatalog.find((item) => item.id === selectedRoom) ?? roomCatalog[0];
  const total = room.price * 2 + selectedOptions.reduce((sum, id) => sum + options.find((item) => item.id === id).price, 0);
  const submit = (event) => {
    event.preventDefault();
    if (!agreed) return window.alert('필수 약관에 동의해 주세요.');
    sessionStorage.setItem('ann-booking', JSON.stringify({ room, form, total }));
    navigate('/complete');
  };

  return (
    <>
      <PageHero />
      <main className="reservation-page shell">
        <PageTitle eyebrow="Reservation" title="객실 예약" />
        <form onSubmit={submit}>
          <SectionBar title="날짜 · 인원" english="Dates & Guests" /><StaySearch />
          <SectionBar title="객실 선택" english="Choose a Room · 7 rooms" />
          <div className="booking-room-list">
            {roomCatalog.map((item) => (
              <label className={selectedRoom === item.id ? 'selected' : ''} key={item.id}>
                <input type="radio" name="room" value={item.id} checked={selectedRoom === item.id} onChange={() => setSelectedRoom(item.id)} />
                <img src={asset(item.bookingImage)} alt="" />
                <div><h3>{item.name}</h3><em>{item.english}</em><p>{item.copy}</p></div>
                <strong>{money(item.price)}<small>원 / 박</small><span>2박 · {money(item.price * 2)}원</span></strong>
              </label>
            ))}
          </div>
          <SectionBar title="옵션" english="Options" />
          <div className="booking-option-list">
            {options.map((item) => (
              <label key={item.id}><input type="checkbox" checked={selectedOptions.includes(item.id)} onChange={() => setSelectedOptions((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /><img src={asset(item.image)} alt="" /><div><h3>{item.name}</h3><em>{item.english}</em><p>{item.copy}</p></div><strong>{money(item.price)}원</strong></label>
            ))}
          </div>
          <SectionBar title="예약자 정보" english="Guest Information" /><GuestForm form={form} setForm={setForm} />
          <PaymentAndTerms agreed={agreed} setAgreed={setAgreed} total={total} />
          <button className="pay-button" type="submit">결제하기</button>
        </form>
      </main>
    </>
  );
}

function CalendarMonth({ month, startDay, days, selected, onSelect }) {
  const cells = Array(startDay).fill(null).concat(Array.from({ length: days }, (_, index) => index + 1));
  return (
    <div className="calendar-month"><h3>{month}</h3><span>2026. {month === 'July' ? '7' : month === 'August' ? '8' : '9'}월</span><div className="weekdays">{'SMTWTFS'.split('').map((day, index) => <b key={`${day}-${index}`}>{day}</b>)}</div><div className="days">{cells.map((day, index) => day ? <button className={selected.includes(`${month}-${day}`) ? 'selected' : ''} type="button" key={day} onClick={() => onSelect(`${month}-${day}`)}>{day}</button> : <i key={`blank-${index}`} />)}</div></div>
  );
}

export function ReservationDetailPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const room = roomCatalog.find((item) => item.id === roomId) ?? roomCatalog[0];
  const [dates, setDates] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', request: '' });
  const total = room.price * 2 + selectedOptions.reduce((sum, id) => sum + options.find((item) => item.id === id).price, 0);
  const pickDate = (value) => setDates((current) => current.includes(value) ? current.filter((date) => date !== value) : [...current.slice(-1), value]);
  const submit = (event) => {
    event.preventDefault();
    if (!agreed) return window.alert('필수 약관에 동의해 주세요.');
    sessionStorage.setItem('ann-booking', JSON.stringify({ room, form, total }));
    navigate('/complete');
  };
  return (
    <>
      <PageHero />
      <main className="reservation-page reservation-detail-page shell">
        <PageTitle eyebrow={`Room · ${room.number}`} title={room.name}><p>{room.english} · 햇살과 바람이 머무는 공간</p></PageTitle>
        <form onSubmit={submit}>
          <SectionBar title="일정 선택" english="Select Your Dates" />
          <div className="calendar-panel"><header><b>예약 가능일</b><span>2026. 07 — 2026. 09</span></header><div className="calendar-grid"><CalendarMonth month="July" startDay={3} days={31} selected={dates} onSelect={pickDate} /><CalendarMonth month="August" startDay={6} days={31} selected={dates} onSelect={pickDate} /><CalendarMonth month="September" startDay={2} days={30} selected={dates} onSelect={pickDate} /></div></div>
          <SectionBar title="추가 옵션" english="Additional Options" />
          <div className="booking-option-list detail-options">
            {options.map((item, index) => <label key={item.id}><input type="checkbox" checked={selectedOptions.includes(item.id)} onChange={() => setSelectedOptions((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /><img src={asset(`detail-option-${index + 1}.webp`)} alt="" /><div><h3>{item.name}</h3><em>{item.english}</em><p>{item.copy}</p></div><strong>{money(item.price)}원</strong></label>)}
          </div>
          <SectionBar title="예약자 정보" english="Guest Information" /><GuestForm form={form} setForm={setForm} />
          <PaymentAndTerms agreed={agreed} setAgreed={setAgreed} total={total} />
          <button className="pay-button" type="submit">결제하기</button>
        </form>
      </main>
    </>
  );
}

export function CompletePage() {
  const booking = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('ann-booking')); } catch { return null; }
  }, []);
  const room = booking?.room ?? roomCatalog[2];
  const form = booking?.form ?? { name: '홍길동', phone: '010-0000-0000', email: 'guest@email.com' };
  const total = booking?.total ?? 484000;
  return (
    <>
      <PageHero />
      <main className="complete-page shell">
        <PageTitle eyebrow="" title="예약이 접수되었습니다"><p>청송의 밤에 오시게 되어 기쁩니다.<br />예약 확인서는 입력하신 문자 또는 카카오톡으로 발송되었습니다.</p></PageTitle>
        <div className="booking-number"><span>예약 번호</span><b>2026.0708.00184</b></div>
        <section className="summary-card two-column"><div><h2>예약 내역<em>Booking</em></h2><dl><div><dt>객실</dt><dd>{room.name} · {room.english}</dd></div><div><dt>입실</dt><dd>2026.07.15 수 · 16:00</dd></div><div><dt>퇴실</dt><dd>2026.07.17 금 · 11:00</dd></div><div><dt>기간</dt><dd>2박</dd></div><div><dt>인원</dt><dd>성인 2명</dd></div></dl></div><div><h2>예약자 · 결제<em>Guest · Payment</em></h2><dl><div><dt>예약자</dt><dd>{form.name || '홍길동'}</dd></div><div><dt>연락처</dt><dd>{form.phone || '010-0000-0000'}</dd></div><div><dt>이메일</dt><dd>{form.email || 'guest@email.com'}</dd></div><div><dt>결제</dt><dd>무통장 입금</dd></div><div><dt>금액</dt><dd>{money(total)}원</dd></div></dl></div></section>
        <section className="summary-card bank-card"><h2>입금 계좌 안내<em>Bank Transfer</em></h2><dl><div><dt>은행</dt><dd>00은행</dd></div><div><dt>계좌번호</dt><dd>000-000-0000-0000</dd></div><div><dt>예금주</dt><dd>청송 한옥호텔 안</dd></div><div><dt>입금액</dt><dd>{money(total)}원</dd></div></dl><aside><b>입금 기한 · 2026.07.15(수) 23:59 까지</b><span>접수 후 24시간 내 입금이 확인되지 않으면 예약은 자동 취소됩니다.</span></aside></section>
        <section className="summary-card refund-summary"><h2>취소 및 환불 규정</h2><p>미성년자는 보호자 동의 여부와 관계없이 예약 및 투숙이 불가합니다.<br />체크인 3일 전 17:00까지 취소 시 결제금액의 100% 환불<br />체크인 2일 전부터 체크인 당일 및 No-Show는 취소 및 환불 불가</p></section>
        <div className="complete-actions"><Link to="/manage">예약 조회</Link><Link to="/">홈으로</Link></div><p className="inquiry">문의 · 010-8218-3334</p>
      </main>
    </>
  );
}

export function ManagePage() {
  return (
    <>
      <PageHero />
      <main className="manage-page shell">
        <PageTitle eyebrow="Booking Management" title="예약 조회 · 취소" />
        <SectionBar title="예약 정보" english="Booking Information" />
        <form className="manage-search" onSubmit={(event) => { event.preventDefault(); window.alert('준비중입니다.'); }}>
          <label>예약 번호 *<input name="reservationNumber" placeholder="예약 번호를 입력해 주세요" autoComplete="off" /></label>
          <label>예약자명 *<input name="guestName" placeholder="예약자명을 입력해 주세요" autoComplete="off" /></label>
          <label>연락처 *<input name="guestPhone" type="tel" placeholder="연락처를 입력해 주세요" autoComplete="off" /></label>
          <button type="submit">조회하기</button>
        </form>
        <p className="inquiry">문의 · 010-8218-3334</p>
      </main>
    </>
  );
}

import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import AdminPage from './AdminPage';
import ReservationButton from './ReservationButton';
import { AnnouncementPage, CompletePage, ManagePage, ReservationDetailPage, ReservationPage, RoomsPage } from './SubPages';

const asset = (name) => `/assets/${name}`;

const rooms = [
  { name: '대감댁', hanja: '大監宅', copy: '아담한 중정에 햇살이 머무는 시간', image: 'room-1.webp' },
  { name: '영감댁', hanja: '令監宅', copy: '넓은 마루 위, 고요가 머무는 시간', image: 'room-2.webp' },
  { name: '정승댁', hanja: '政丞宅', copy: '품격 있는 공간에 여유가 스며드는 시간', image: 'room-3.webp' },
];

const around = [
  { name: '주왕산', hanja: '周王山', copy: '호텔에서 차량 5분, 청송의 대표 명산', image: 'around-1.webp' },
  { name: '수석·꽃돌박물관', hanja: '壽石花石館', copy: '도보 5분, 청송의 자연이 빚은 돌의 이야기', image: 'around-2.webp' },
  { name: '얼음골', hanja: '氷溪', copy: '호텔에서 차량 약 20분, 여름의 얼음 협곡', image: 'around-3.webp' },
  { name: '청송백자 도예촌', hanja: '靑松白磁', copy: '호텔에서 도보 5분, 흙과 불의 자리', image: 'around-4.webp' },
];

const dayStories = [
  ['Morning', '아침', '창을 열면 스며드는 산바람,', '새소리와 함께 시작되는 청송의 하루.'],
  ['Noon', '낮', '주왕산을 감싸는 햇살 아래,', '한옥의 여유를 천천히 머금는 시간.'],
  ['Evening', '저녁', '노을이 처마 끝에 내려앉고,', '따뜻한 온기가 공간을 채우는 순간.'],
  ['Night', '밤', '별빛 아래 더욱 깊어지는 고요,', '한옥에서 머무는 가장 편안한 밤.'],
];

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="청송 한옥호텔 안 홈">
      <strong>청송 한옥호텔 안</strong>
      <span>Cheongsong Hanok Ann</span>
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  const nav = [
    ['홈', '/'], ['객실', '/rooms'], ['공지사항', '/announcement'],
    ['예약', '/reservation'], ['예약조회', '/manage'],
  ];

  return (
    <header className="site-header">
      <div className="header-main shell">
        <button className="menu-button" type="button" aria-label="메뉴 열기" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <i /><i />
        </button>
        <Brand />
        <div className="header-actions">
          <ReservationButton className="reserve-button">예약</ReservationButton>
          <span className="language"><b>KO</b><i>/</i><span>EN</span></span>
        </div>
      </div>
      <nav className={`nav-bar ${open ? 'is-open' : ''}`} aria-label="주요 메뉴">
        <div className="nav-links">
          {nav.map(([label, href]) => href === '/reservation' ? (
            <ReservationButton key={label} className="nav-reservation" onClick={() => setOpen(false)}>{label}</ReservationButton>
          ) : (
            <NavLink
              key={label}
              to={href}
              end={href === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="home">
      <img src={asset('hero.webp')} alt="산으로 둘러싸인 청송 한옥마을 전경" />
      <div className="hero-shade" />
      <div className="hero-copy shell">
        <span>HANOK STORY</span>
        <h1>청송의 자연과 한옥의 품에서, 가장 편안한 하루를</h1>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="intro shell" aria-labelledby="intro-title">
      <img className="intro-main" src={asset('intro-main.webp')} alt="햇살 아래 고즈넉한 한옥 객실" />
      <div className="intro-copy">
        <h2 id="intro-title">Ann</h2>
        <div className="short-rule" />
        <p>사계절이 마당에 내려앉는 공간,<br />청송의 자연 속에서 오래도록 머물고 싶은 하루</p>
        <div className="intro-thumbs">
          {[1, 2, 3].map((number) => <img key={number} src={asset(`intro-thumb-${number}.webp`)} alt="한옥의 처마와 마당" />)}
        </div>
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="story shell" aria-labelledby="story-title">
      <div className="story-copy">
        <h2 id="story-title">A stay<br />where tradition finds peace.</h2>
        <p className="story-lead">천년의 한옥과 주왕산의 자연이 만나는 곳,<br />청송의 가장 깊은 쉼을 담습니다.</p>
        <div className="day-list">
          {dayStories.map(([english, korean, first, second]) => (
            <div className="day-row" key={english}>
              <div><em>{english}</em><span>{korean}</span></div>
              <p>{first}<br />{second}</p>
            </div>
          ))}
        </div>
        <p className="story-close">청송의 자연과 한옥의 시간이<br />당신의 하루를 오래 머물게 합니다.</p>
        <small>—&nbsp;&nbsp;Hanok Hotel ANN</small>
      </div>
      <div className="story-gallery">
        <img className="story-top" src={asset('story-top.webp')} alt="봄꽃 너머 보이는 한옥" />
        <img className="story-bottom" src={asset('story-bottom.webp')} alt="단아한 한옥의 외관" />
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, copy }) {
  return (
    <header className="section-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </header>
  );
}

function Rooms() {
  return (
    <section className="rooms-wrap" id="rooms">
      <div className="rooms shell">
        <SectionHeading eyebrow="ROOMS" title="청송의 고요를 품은 일곱 개의 방" copy="각각의 방은 저마다의 이름과 이야기를 품고 있습니다." />
        <div className="room-grid">
          {rooms.map((room) => (
            <article className="room-card" key={room.name}>
              <img src={asset(room.image)} alt={`${room.name} 한옥 객실`} />
              <h3>{room.name}<small>{room.hanja}</small></h3>
              <p>{room.copy}</p>
            </article>
          ))}
        </div>
        <Link className="text-link" to="/rooms">View All Rooms <span>→</span></Link>
      </div>
    </section>
  );
}

function Around() {
  return (
    <section className="around shell" id="around">
      <SectionHeading eyebrow="AMENITIES · AROUND" title="머무는 시간을 채우는 것들" />
      <div className="around-grid">
        {around.map((item) => (
          <article className="around-card" key={item.name}>
            <img src={asset(item.image)} alt={item.name} />
            <h3>{item.name} · <small>{item.hanja}</small></h3>
            <p>{item.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Location() {
  const details = [
    ['ADDRESS', '경북 청송군 주왕산면 청송백자로 12'],
    ['TEL', '010-8219-3334'],
    ['CHECK', 'IN 16:00 / OUT 11:00'],
    ['BY CAR', '서울 3시간 30분 · 대구 1시간 40분'],
  ];
  return (
    <section className="location-wrap" id="location">
      <div className="location shell">
        <SectionHeading eyebrow="LOCATION" title="오시는 길" />
        <div className="location-content">
          <a className="map-placeholder" href="https://naver.me/FWT3Ahud" target="_blank" rel="noreferrer" aria-label="네이버 지도에서 위치 보기">
            <span>MAP</span>
          </a>
          <dl>
            {details.map(([term, description]) => (
              <div key={term}><dt>{term}</dt><dd>{description}</dd></div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner shell">
        <Brand />
        <p>경북 청송군 주왕산면 청송백자로 12&nbsp;&nbsp;·&nbsp;&nbsp;TEL 010-8219-3334<br /><small>© 2026 Cheongsong Hanok An. All rights reserved</small></p>
        <nav aria-label="소셜 링크">
          <a href="https://www.instagram.com/hanok_hotel_ann/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://naver.me/FWT3Ahud" target="_blank" rel="noreferrer">Naver</a>
          <a href="https://chatbot.hio.ai.kr/" target="_blank" rel="noreferrer">Chatbot</a>
        </nav>
      </div>
    </footer>
  );
}

function HomePage() {
  return (
    <main>
      <Hero />
      <Intro />
      <Story />
      <Rooms />
      <Around />
      <Location />
    </main>
  );
}

function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    const target = location.hash && document.querySelector(location.hash);
    if (target) window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 0);
    else window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);
  return null;
}

function SiteRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  return (
    <>
      <ScrollManager />
      {!isAdmin && <Header />}
      <Routes>
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/announcement" element={<AnnouncementPage />} />
        <Route path="/reservation" element={<ReservationPage />} />
        <Route path="/reservation/:roomId" element={<ReservationDetailPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdmin && <Footer />}
    </>
  );
}

export default function App() {
  // Keep previously shared HashRouter links working after enabling real /admin URLs.
  if (window.location.hash.startsWith('#/')) {
    window.history.replaceState(null, '', window.location.hash.slice(1));
  }
  return <BrowserRouter><SiteRoutes /></BrowserRouter>;
}

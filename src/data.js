export const asset = (name) => `/assets/${name}`;

export const roomCatalog = [
  {
    id: 'chambong', number: '01', name: '참봉댁', hanja: '參奉宅', english: 'CHAMBONG-DAEK',
    copy: '마당으로 스며드는 햇살과 계절의 바람을 가장 가까이에서 만나는 공간입니다.',
    size: '128.9㎡', guests: '기준 4인 / 최대 4인', price: 180000, image: 'room-chambong.webp', bookingImage: 'booking-room-1.webp',
  },
  {
    id: 'saengwon', number: '02', name: '생원댁', hanja: '生員宅', english: 'SAENGWON-DAEK',
    copy: '창을 열면 청송의 맑은 바람이 머물고, 고요한 풍경이 편안한 쉼을 선물합니다.',
    size: '128.9㎡', guests: '기준 4인 / 최대 4인', price: 190000, image: 'room-saengwon.webp', bookingImage: 'booking-room-2.webp',
  },
  {
    id: 'hunjang', number: '03', name: '훈장댁', hanja: '訓長宅', english: 'HUNJANG-DAEK',
    copy: '누마루 너머 펼쳐지는 한옥의 풍경과 사계절의 아름다움을 담아내는 공간입니다.',
    size: '128.9㎡', guests: '기준 4인 / 최대 4인', price: 180000, image: 'room-hunjang.webp', bookingImage: 'booking-room-3.webp',
  },
  {
    id: 'gyosu', number: '04', name: '교수댁', hanja: '敎授宅', english: 'GYOSU-DAEK',
    copy: '마루와 안마당이 이어지는 넉넉한 공간에서 한옥의 정취를 온전히 느껴보세요.',
    size: '128.9㎡', guests: '기준 4인 / 최대 4인', price: 200000, image: 'room-gyosu.webp', bookingImage: 'booking-room-4.webp',
  },
  {
    id: 'jeongseung', number: '05', name: '정승댁', hanja: '政丞宅', english: 'JEONGSEUNG-DAEK',
    copy: '넓은 안마당이 품은 여유로운 풍경 속에서 한옥의 품격과 쉼을 함께 누려보세요.',
    size: '128.9㎡', guests: '기준 10인 / 최대 12인', price: 230000, image: 'room-jeongseung.webp', bookingImage: 'booking-room-5.webp',
  },
  {
    id: 'yeonggam', number: '06', name: '영감댁', hanja: '令監宅', english: 'YEONGGAM-DAEK',
    copy: '길게 이어진 대청마루를 따라 한옥의 여유와 청송의 바람을 느껴보세요.',
    size: '128.9㎡', guests: '기준 10인 / 최대 12인', price: 250000, image: 'room-yeonggam.webp', bookingImage: 'booking-room-6.webp',
  },
  {
    id: 'daegam', number: '07', name: '대감댁', hanja: '大監宅', english: 'DAEGAM-DAEK',
    copy: '넉넉한 공간에 머무는 여유와 함께하는 시간이 더욱 특별해지는 공간입니다.',
    size: '128.9㎡', guests: '기준 12인 / 최대 14인', price: 260000, image: 'room-daegam.webp', bookingImage: 'booking-room-7.webp',
  },
];

export const options = [
  { id: 'breakfast', name: '조식 2인', english: 'Breakfast', copy: '지역 식재료로 차린 정갈한 한식 조식', price: 30000, image: 'booking-option-1.webp' },
  { id: 'tea', name: '다과상', english: 'Tea Table', copy: '계절 다과와 청송 사과차', price: 20000, image: 'booking-option-2.webp' },
  { id: 'pottery', name: '청송백자 체험', english: 'Pottery', copy: '청송백자 도예촌에서 즐기는 체험', price: 25000, image: 'booking-option-3.webp' },
];

export const notices = [
  ['공지', '2026년 수영장 오픈 안내', '청송 한옥호텔 안(ANN)의 수영장이 오픈되었습니다.', '2026.07.02', true],
  ['공지', '훈장댁 + 청송백자 패키지 판매 안내', '청송 한옥호텔 안(ANN)의 훈장댁 + 청송백자 패키지 판매가 시작되었습니다.', '2026.06.28'],
  ['공지', '전 객실 예약 오픈 안내', '청송 한옥호텔 안(ANN)의 12월까지 전 객실 예약이 오픈되었습니다.', '2026.06.20'],
  ['공지', '하절기 온돌 점검 및 대청소 안내', '8월 3일(월) – 8월 5일(수) 3일간, 죽림채는 정상 운영됩니다.', '2026.06.10'],
  ['안내', '반려동물 동반 이용 규정 개정', '지정 객실(대문채)에 한하여 소형견 동반이 허용됩니다.', '2026.05.30'],
  ['이벤트', '봄의 끝, 마당 음악회 후기', '함께해 주신 모든 분들께 감사드립니다.', '2026.05.12'],
  ['공지', '홈페이지 개편 안내', '예약 시스템과 객실 소개 페이지가 새롭게 정비되었습니다.', '2026.04.28'],
];

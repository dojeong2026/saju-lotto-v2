/**
 * 사주로또 v4 - 다크 럭셔리 & 모바일 실전 로또 퍼스트 엔진
 *  - 무채색 베이스 + 시그니처 럭셔리 단일 골드(Gold) 체제
 *  - 전광판 2줄 입체 [QR 당첨확인] 블록 버튼 탑재
 *  - QR 스캔 즉시 가동 및 결과 도출 시 카메라 프레임 자동 숨김
 */

function bootApp() {
  initApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

function normalizeBirthDate(str) {
  if (!str) return '1988-05-12';
  const clean = String(str).replace(/[^\d]/g, '');
  if (clean.length >= 8) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return '1988-05-12';
}

function loadProfiles() {
  try {
    let multi = JSON.parse(localStorage.getItem('saju_lotto_v2_profiles') || 'null');
    if (Array.isArray(multi) && multi.length > 0) {
      multi = multi.map(p => ({
        ...p,
        birthDate: normalizeBirthDate(p.birthDate)
      }));
      let me = multi.find(p => p.id === 'me');
      if (!me) {
        me = { id: 'me', name: '나', relation: '본인', birthDate: multi[0].birthDate, calendarType: multi[0].calendarType || 'solar', birthHour: multi[0].birthHour || '12', gender: multi[0].gender || 'male', birthCity: multi[0].birthCity || 'seoul' };
        multi.unshift(me);
      }
      return multi;
    }
    const single = JSON.parse(localStorage.getItem('saju_lotto_v2_profile') || 'null');
    if (single && single.birthDate) {
      return [{ id: 'me', name: '나', relation: '본인', ...single, birthDate: normalizeBirthDate(single.birthDate) }];
    }
  } catch (e) {
    console.warn('프로필 로드 에러:', e);
  }
  return []; // 최초 실행자는 저장된 프로필이 없는 빈 배열이어야 사주입력창이 펼쳐짐!
}

function saveProfiles(profiles) {
  try {
    localStorage.setItem('saju_lotto_v2_profiles', JSON.stringify(profiles));
    const me = profiles.find(p => p.id === 'me') || profiles[0] || null;
    if (me) {
      localStorage.setItem('saju_lotto_v2_profile', JSON.stringify(me));
    }
  } catch (e) {
    console.warn('프로필 저장 에러:', e);
  }
}

const initialProfiles = loadProfiles();
const hasSavedProfiles = (initialProfiles.length > 0);
const state = {
  currentTrack: 'lotto',
  sajuResult: null,
  selectedAmount: 5000,
  sheets: [],
  currentSheetIndex: 0,
  isAllSheetsView: false,
  savedNumbers: JSON.parse(localStorage.getItem('saju_lotto_v2_saved') || '[]'),
  profiles: initialProfiles,
  activeProfileId: hasSavedProfiles ? 'me' : null,
  savedProfile: hasSavedProfiles ? (initialProfiles.find(p => p.id === 'me') || initialProfiles[0]) : null,
  inputMode: hasSavedProfiles ? 'none' : 'edit' // 최초 실행자는 'edit'(입력창 펼침), 재방문자는 'none'(원클릭 슈퍼패스 접힘)
};
window.state = state;
window.loadProfiles = loadProfiles;
window.saveProfiles = saveProfiles;
window.renderProfileSystem = renderProfileSystem;
window.calculateSaju = calculateSaju;
window.resolveSolarDate = resolveSolarDate;

const CITY_TIME_OFFSETS = {
  'seoul': -32, 'busan': -24, 'daegu': -26, 'incheon': -33,
  'gwangju': -33, 'daejeon': -31, 'ulsan': -23, 'gangwon': -29, 'jeju': -34
};

const OHAENG_INFO = {
  'wood':  { name: '목(木)', symbol: '성장·창의', balls: [3, 8, 13, 18, 23, 28, 33, 38, 43] },
  'fire':  { name: '화(火)', symbol: '열정·활력', balls: [2, 7, 12, 17, 22, 27, 32, 37, 42] },
  'earth': { name: '토(土)', symbol: '신뢰·재물', balls: [5, 10, 15, 20, 25, 30, 35, 40, 45] },
  'metal': { name: '금(金)', symbol: '결단·결실', balls: [4, 9, 14, 19, 24, 29, 34, 39, 44] },
  'water': { name: '수(水)', symbol: '지혜·유연', balls: [1, 6, 11, 16, 21, 26, 31, 36, 41] }
};

const HOT_NUMBERS = [34, 18, 27, 12, 1, 43, 20, 13, 33, 4, 17, 26, 40, 14, 45, 9, 24, 38, 44, 35];
const COLD_NUMBERS = [7, 23, 15, 2, 31];
const LUCKY_SURI_81 = [11, 13, 15, 16, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41, 45, 47, 48];

// =================================================================
// 📌 최신 추첨 회차 정보 — 매주 일요일 이 블록만 고치면 화면 전체가 자동 갱신됩니다!
// (1245회: 2026.10.10 추첨 / 4, 5, 25, 28, 32, 42 + 보너스 12 / 1등 10명 각 30억 651만원)
// =================================================================
const LATEST_DRAW = {
  round: 1245,
  date: '2026.10.10(토)',
  drawTime: new Date(2026, 9, 10, 20, 45, 0), // 추첨 시각
  numbers: [4, 5, 25, 28, 32, 42],
  bonus: 12,
  firstPrize: '30억 651만원',
  winners: 10
};
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// 지금 판매 중인 회차 (추첨 후 1주일 단위로 자동 증가)
function getTargetRound() {
  const diffWeeks = Math.max(0, Math.floor((Date.now() - LATEST_DRAW.drawTime.getTime()) / ONE_WEEK_MS));
  return LATEST_DRAW.round + 1 + diffWeeks;
}

// 판매 중인 회차의 추첨일 (예: 10.17(토))
function getTargetDrawLabel() {
  const weeks = getTargetRound() - LATEST_DRAW.round;
  const d = new Date(LATEST_DRAW.drawTime.getTime() + weeks * ONE_WEEK_MS);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}(토)`;
}

// =================================================================
// 🌙 음력 → 양력 변환기 (1900~2029년 출생자용, 월 대소·윤달 비트표 방식)
// ※ 표준 동양 음력표 기반. 드물게 한국 만세력과 하루 차이가 나는 해가 있을 수 있음
// =================================================================
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2, // 1900
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977, // 1910
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970, // 1920
  0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950, // 1930
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557, // 1940
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0, // 1950
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0, // 1960
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6, // 1970
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570, // 1980
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0, // 1990
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5, // 2000
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930, // 2010
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530  // 2020
];

function lunarLeapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
function lunarLeapDays(y) { return lunarLeapMonth(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
function lunarMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
function lunarYearDays(y) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
  return sum + lunarLeapDays(y);
}

/** 음력 'YYYY-MM-DD' → 양력 'YYYY-MM-DD' (변환 불가 시 null) */
function lunarToSolar(dateStr, isLeapMonth = false) {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y < 1900 || y > 2029 || m < 1 || m > 12) return null;
  if (isLeapMonth && lunarLeapMonth(y) !== m) return null; // 그 해에 해당 윤달이 없음
  const maxDay = isLeapMonth ? lunarLeapDays(y) : lunarMonthDays(y, m);
  if (d < 1 || d > maxDay) return null;

  let offset = 0;
  for (let i = 1900; i < y; i++) offset += lunarYearDays(i);
  const leap = lunarLeapMonth(y);
  for (let i = 1; i < m; i++) {
    offset += lunarMonthDays(y, i);
    if (leap === i) offset += lunarLeapDays(y);
  }
  if (isLeapMonth) offset += lunarMonthDays(y, m);

  const solar = new Date(Date.UTC(1900, 0, 31) + (offset + d - 1) * 86400000);
  return `${solar.getUTCFullYear()}-${String(solar.getUTCMonth() + 1).padStart(2, '0')}-${String(solar.getUTCDate()).padStart(2, '0')}`;
}

/** 폼 입력값(양력/음력)을 사주 계산용 양력 날짜로 통일 */
function resolveSolarDate(profile) {
  if (profile.calendarType !== 'lunar') return profile.birthDate;
  return lunarToSolar(profile.birthDate, !!profile.isLeapMonth);
}

// 공 색상 클래스 (동행복권 기준 10단위 색상)
function ballColorClass(n) {
  if (n <= 10) return 'col-1';
  if (n <= 20) return 'col-11';
  if (n <= 30) return 'col-21';
  if (n <= 40) return 'col-31';
  return 'col-41';
}

// 상단 전광판 + 버튼·티켓의 회차 문구를 LATEST_DRAW 기준으로 일괄 렌더링
function renderDrawBoard() {
  const target = getTargetRound();
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  setText('last-round-badge', `제${LATEST_DRAW.round}회`);
  setText('last-round-date', `${LATEST_DRAW.date} 추첨`);
  setText('last-round-winners', `1등 당첨금 (${LATEST_DRAW.winners}명)`);
  setText('last-round-prize', LATEST_DRAW.firstPrize);
  setText('btn-submit-text', `이번 주 ${target}회 행운 5게임 추출하기`);
  setText('ticket-draw-sched', `${getTargetDrawLabel()} 20:35 추첨`);

  const ballsEl = document.getElementById('last-round-balls');
  if (ballsEl) {
    const mainBallsHtml = LATEST_DRAW.numbers
      .map(n => `<span class="ball-m ${ballColorClass(n)}">${n}</span>`).join('');

    ballsEl.innerHTML = `
      <div class="balls-main-grid">${mainBallsHtml}</div>
      <button type="button" id="btn-board-qr-check" class="btn-board-qr-block" aria-label="QR 당첨확인">
        <span class="qr-label-en">QR</span>
        <span class="qr-label-ko">당첨확인</span>
      </button>
    `;

    // 전광판 내 QR 당첨확인 버튼 클릭 바인딩
    const qrBtn = document.getElementById('btn-board-qr-check');
    if (qrBtn) qrBtn.onclick = () => openQrCheckModal();
  }
}

function formatKoreanMoney(amount) {
  const eok = Math.floor(amount / 100000000);
  const man = Math.floor((amount % 100000000) / 10000);
  if (eok > 0) {
    return `${eok}억 ${man.toLocaleString('ko-KR')}만원`;
  }
  return `${man.toLocaleString('ko-KR')}만원`;
}

function updateSalesStatus() {
  const timeElem = document.getElementById('sales-update-time');
  const prizeElem = document.getElementById('est-first-prize');
  const salesElem = document.getElementById('cumulative-sales');
  const roundTagElem = document.getElementById('next-round-tag');
  if (!timeElem || !prizeElem || !salesElem) return;

  const now = new Date();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const hour = now.getHours();

  // 1시간 단위 실시간 타이틀 갱신: [10월 1일, 18시 현재]
  timeElem.textContent = `[${month}월 ${date}일, ${hour}시 현재]`;

  // 최신 추첨(LATEST_DRAW) 기준으로 판매 중인 회차 자동 계산
  const baseDrawTime = LATEST_DRAW.drawTime.getTime();
  const oneWeekMs = ONE_WEEK_MS;
  const currentTargetRound = getTargetRound();
  const diffWeeks = currentTargetRound - LATEST_DRAW.round - 1;

  if (roundTagElem) {
    roundTagElem.textContent = `다음 ${currentTargetRound}회 판매 현황`;
  }

  // 이번 회차 판매 시작 시각 (직전 토요일 21:00)
  const currentSalesStart = new Date(baseDrawTime + diffWeeks * oneWeekMs + 15 * 60 * 1000).getTime();
  const elapsedHours = Math.max(1, (now.getTime() - currentSalesStart) / (1000 * 60 * 60));
  
  // 총 판매 가능 시간: 토 21:00 ~ 토 20:00 (167시간)
  const totalSalesHours = 167;
  const progressRatio = Math.min(1.0, elapsedHours / totalSalesHours);

  // 주간 판매 가속 곡선 (초반 완만 -> 목/금/토 집중 구매 가속)
  const weightedProgress = Math.pow(progressRatio, 1.38);
  const estimatedWeeklyTotal = 118000000000; // 약 1,180억원
  
  // 시간대별 고유 미세 변동치
  const hourHash = ((month * 31 + date) * 24 + hour) % 100;
  const microBonus = (hourHash * 1234567) % 50000000;

  let currentSales = Math.floor(estimatedWeeklyTotal * weightedProgress) + microBonus;
  if (currentSales < 3500000000) currentSales = 3500000000;

  // 1등 총 예상 당첨금 (법정 배분율 총 판매액의 약 24.05%)
  const firstPrize = Math.floor(currentSales * 0.240509);

  salesElem.textContent = formatKoreanMoney(currentSales);
  prizeElem.textContent = formatKoreanMoney(firstPrize);
}

function calculateTodayIljin() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const CHEONGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const CHEONGAN_KOR = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  const JIJI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const JIJI_KOR = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

  // 천문역학 60갑자 일진 산출식 (기준: 2026.10.06 화 = 甲辰일)
  const baseTime = new Date(2026, 9, 6).getTime();
  const diffDays = Math.floor((now.getTime() - baseTime) / (24 * 60 * 60 * 1000));
  
  // 2026.10.06은 甲(0) 辰(4)
  const ganIdx = ((0 + diffDays) % 10 + 10) % 10;
  const jiIdx = ((4 + diffDays) % 12 + 12) % 12;

  const ganjiStr = `${CHEONGAN[ganIdx]}${JIJI[jiIdx]}(${CHEONGAN_KOR[ganIdx]}${JIJI_KOR[jiIdx]})일`;

  const ganjiElem = document.getElementById('today-iljin-ganji');
  if (ganjiElem) ganjiElem.textContent = ganjiStr;

  const descElem = document.getElementById('today-iljin-desc');
  if (descElem) {
    descElem.innerHTML = `💰 <strong>편재운 85% 상승일</strong> (뜻밖의 횡재와 귀인 조력 길조)`;
  }

  return { ganjiStr, ganIdx, jiIdx };
}

function showScreen(screenName) {
  const mainScreen = document.getElementById('screen-main-lotto');
  const resultScreen = document.getElementById('screen-results');
  const destinyScreen = document.getElementById('screen-view-destiny');
  const lottoBoard = document.getElementById('lotto-main-board');

  // ⭐ 대표님 지침 1: 상단 전광판은 첫 화면(메인)에서만 노출하고, 결과창/사주창에서는 완전 숨김!
  if (lottoBoard) {
    lottoBoard.style.display = (screenName === 'main') ? 'block' : 'none';
  }

  if (mainScreen) mainScreen.style.display = (screenName === 'main') ? 'block' : 'none';
  if (resultScreen) resultScreen.style.display = (screenName === 'results') ? 'block' : 'none';
  if (destinyScreen) {
    destinyScreen.style.display = (screenName === 'destiny') ? 'block' : 'none';
    if (screenName === 'destiny' && state.sajuResult && typeof renderDestinyHub === 'function') {
      renderDestinyHub(state.sajuResult);
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.showScreen = showScreen;

// 폼 인풋에 프로필 값 반영
function fillProfileToForm(profile) {
  const dateInput = document.getElementById('birth-date');
  const ySel = document.getElementById('birth-year');
  const mSel = document.getElementById('birth-month');
  const dSel = document.getElementById('birth-day');
  const hourInput = document.getElementById('birth-hour');
  const cityInput = document.getElementById('birth-city');
  const genderInput = document.getElementById('gender');
  const calTypeInput = document.getElementById('calendar-type');
  const leapInput = document.getElementById('is-leap-month');

  const displayText = document.getElementById('birth-date-display-text');

  if (profile && profile.birthDate) {
    const validDate = normalizeBirthDate(profile.birthDate);
    if (dateInput) dateInput.value = validDate;
    const parts = validDate.split('-');
    if (parts.length === 3) {
      if (ySel) ySel.value = parts[0];
      if (mSel) mSel.value = parts[1].padStart(2, '0');
      if (dSel) dSel.value = parts[2].padStart(2, '0');
      if (displayText) {
        displayText.textContent = `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
        displayText.classList.remove('placeholder');
      }
    }
  } else {
    if (dateInput) dateInput.value = '';
    if (ySel) ySel.value = '';
    if (mSel) mSel.value = '';
    if (dSel) dSel.value = '';
    if (displayText) {
      displayText.textContent = '생년월일';
      displayText.classList.add('placeholder');
    }
  }

  const validHour = (profile && profile.birthHour !== undefined && profile.birthHour !== null && profile.birthHour !== '' && !isNaN(profile.birthHour));
  if (hourInput) hourInput.value = validHour ? String(profile.birthHour) : '';
  if (cityInput) cityInput.value = (profile && profile.birthCity) ? profile.birthCity : '';
  if (genderInput) genderInput.value = (profile && profile.gender) ? profile.gender : 'male';
  if (calTypeInput) calTypeInput.value = (profile && profile.calendarType) ? profile.calendarType : 'solar';
  if (leapInput) leapInput.checked = !!(profile && profile.isLeapMonth);

  const calVal = (profile && profile.calendarType) ? profile.calendarType : 'solar';
  const genVal = (profile && profile.gender) ? profile.gender : 'male';

  document.querySelectorAll('.seg-toggle').forEach(group => {
    const isCal = (group.dataset.target === 'calendar-type');
    const targetVal = isCal ? calVal : genVal;
    group.querySelectorAll('.seg-btn').forEach(btn => {
      const match = (btn.dataset.value === targetVal);
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-pressed', match ? 'true' : 'false');
    });
  });

  const isLunar = (calVal === 'lunar');
  const leapWrap = document.getElementById('leap-month-wrap');
  const dateLabel = document.getElementById('birth-date-label');
  if (leapWrap) leapWrap.style.display = isLunar ? 'inline-flex' : 'none';
  if (dateLabel) dateLabel.textContent = isLunar ? '생년월일 (음력)' : '생년월일 (양력)';
}

// 프로필 시스템 렌더링 (원클릭 슈퍼패스, 탭, 배너, 아코디언)
function renderProfileSystem() {
  const tabsBar = document.getElementById('profile-tabs-bar');
  const banner = document.getElementById('saved-profile-banner');
  const bannerText = document.getElementById('saved-profile-text');
  const collapseEl = document.getElementById('saju-inputs-collapse');
  const relField = document.getElementById('family-relation-field');
  const actionBar = document.getElementById('collapse-action-bar');
  const submitText = document.getElementById('btn-submit-text');
  const targetRound = getTargetRound();

  const activeProfile = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles.find(p => p.id === 'me') || state.profiles[0] || null;
  state.activeProfileId = activeProfile ? activeProfile.id : 'me';
  state.savedProfile = activeProfile;

  // 1. 프로필이 있는 경우 (가족 추가 모드가 아닐 때만 폼에 채움!)
  if (state.inputMode !== 'add-family' && activeProfile && activeProfile.birthDate) {
    // 폼 인풋은 백그라운드에서 채워둠
    fillProfileToForm(activeProfile);

    // 2인 이상 등록되었을 때만 상단 탭 바 노출 (혼자인 손님에게는 노출 안 함)
    if (tabsBar) {
      if (state.profiles.length > 1) {
        tabsBar.style.display = 'flex';
        tabsBar.innerHTML = state.profiles.map(p => {
          const isActive = (p.id === state.activeProfileId);
          const validDate = normalizeBirthDate(p.birthDate);
          // 연도 2자리 추출 (의심 해소용 컴팩트 표기: 예: 아들(95년))
          const yearShort = validDate ? `${validDate.substring(2, 4)}년` : '';
          const label = (p.id === 'me') ? '나' : `${p.name}(${yearShort})`;
          const delBtn = (p.id !== 'me') ? `<span class="tab-del" data-del-id="${p.id}" title="삭제">×</span>` : '';
          return `
            <div class="profile-tab-item ${isActive ? 'active' : ''}" data-prof-id="${p.id}">
              <span>${label}</span>
              ${delBtn}
            </div>
          `;
        }).join('');

        // 탭 클릭 이벤트
        tabsBar.querySelectorAll('.profile-tab-item').forEach(item => {
          item.onclick = (e) => {
            if (e.target.classList.contains('tab-del')) {
              e.stopPropagation();
              const delId = e.target.dataset.delId;
              state.profiles = state.profiles.filter(p => p.id !== delId);
              if (state.activeProfileId === delId) state.activeProfileId = 'me';
              saveProfiles(state.profiles);
              state.inputMode = 'none';
              renderProfileSystem();
              return;
            }
            const profId = item.dataset.profId;
            state.activeProfileId = profId;
            saveProfiles(state.profiles);
            state.inputMode = 'none';
            renderProfileSystem();
          };
        });
      } else {
        tabsBar.style.display = 'none';
      }
    }

    // 스마트 배너 텍스트 렌더링
    if (banner) {
      banner.style.display = 'flex';
      if (bannerText) {
        const isMe = (activeProfile.id === 'me');
        const calName = (activeProfile.calendarType === 'lunar') ? '음력' : '양력';
        const genName = (activeProfile.gender === 'male') ? '남' : (activeProfile.gender === 'female' ? '여' : '');
        const validDate = normalizeBirthDate(activeProfile.birthDate);
        if (isMe) {
          bannerText.innerHTML = `저장된 내 사주가 자동 적용되었습니다 (<strong>${validDate} ${calName} · ${genName}</strong>)`;
        } else {
          bannerText.innerHTML = `선택된 사주: <strong>${activeProfile.name}</strong> (${validDate} ${calName} · ${genName})`;
        }
      }
    }

    // 메인 추출 버튼 텍스트 개인화 (원클릭 슈퍼패스)
    if (submitText) {
      if (state.inputMode === 'add-family') {
        const activeChip = document.querySelector('#relation-chips-group .rel-chip.active');
        const customRelInput = document.getElementById('custom-rel-name');
        let relTitle = activeChip ? activeChip.dataset.rel : '새 사주';
        if (relTitle === '기타' && customRelInput && customRelInput.value.trim()) {
          relTitle = customRelInput.value.trim();
        } else if (relTitle === '친구') {
          relTitle = '친구·연인';
        }
        submitText.textContent = `${relTitle} 맞춤 ${targetRound}회 5게임 추출하기`;
      } else if (state.inputMode === 'edit') {
        submitText.textContent = `수정 내용 반영 후 ${targetRound}회 5게임 추출하기`;
      } else {
        if (activeProfile.id === 'me') {
          submitText.textContent = `이번 주 ${targetRound}회 행운 5게임 추출하기`;
        } else {
          submitText.textContent = `${activeProfile.name} 맞춤 ${targetRound}회 5게임 추출하기`;
        }
      }
    }

    // 아코디언 상태 제어 (평상시: 완전히 접어서 원클릭 상태 유지)
    if (collapseEl) {
      if (state.inputMode === 'none') {
        collapseEl.classList.add('collapsed');
        if (actionBar) actionBar.style.display = 'none';
        if (relField) relField.style.display = 'none';
      } else {
        collapseEl.classList.remove('collapsed');
        if (actionBar) {
          actionBar.style.display = 'flex';
          // 가족 추가 모드일 때는 군더더기 없애기 위해 중간 저장 버튼 숨김 (대형 버튼으로 일원화)
          const saveBtn = document.getElementById('btn-save-profile-input');
          if (saveBtn) saveBtn.style.display = (state.inputMode === 'add-family') ? 'none' : 'block';
        }
        if (relField) relField.style.display = (state.inputMode === 'add-family') ? 'flex' : 'none';
      }
    }

  } else {
    // 저장된 프로필이 아예 없는 신규 유저
    if (tabsBar) tabsBar.style.display = 'none';
    if (banner) banner.style.display = 'none';
    if (collapseEl) collapseEl.classList.remove('collapsed');
    if (relField) relField.style.display = 'none';
    if (actionBar) actionBar.style.display = 'none';
    if (submitText) submitText.textContent = `이번 주 ${targetRound}회 행운 5게임 추출하기`;
  }

  bindProfileActions();
}

// 프로필 배너 액션 버튼 바인딩 (수정 / 가족 추가 / 저장 / 취소)
function bindProfileActions() {
  const editBtn = document.getElementById('btn-edit-profile');
  const addFamBtn = document.getElementById('btn-add-family');
  const saveInputBtn = document.getElementById('btn-save-profile-input');
  const cancelInputBtn = document.getElementById('btn-cancel-profile-input');
  const relChips = document.querySelectorAll('#relation-chips-group .rel-chip');
  const customRelInput = document.getElementById('custom-rel-name');
  const submitText = document.getElementById('btn-submit-text');
  const targetRound = getTargetRound();

  // 대형 버튼 텍스트 즉각 갱신 헬퍼
  function refreshSubmitTextForFamily() {
    if (!submitText || state.inputMode !== 'add-family') return;
    const activeChip = document.querySelector('#relation-chips-group .rel-chip.active');
    let relTitle = activeChip ? activeChip.dataset.rel : '가족';
    if (relTitle === '기타' && customRelInput && customRelInput.value.trim()) {
      relTitle = customRelInput.value.trim();
    } else if (relTitle === '친구') {
      relTitle = '친구·연인';
    }
    submitText.textContent = `${relTitle} 맞춤 ${targetRound}회 5게임 추출하기`;
  }

  // [수정] 버튼 클릭 시 -> 현재 프로필 수정 모드로 펼침
  if (editBtn) {
    editBtn.onclick = () => {
      state.inputMode = (state.inputMode === 'edit') ? 'none' : 'edit';
      const active = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
      if (active) fillProfileToForm(active);
      const saveBtn = document.getElementById('btn-save-profile-input');
      if (saveBtn) {
        saveBtn.style.display = 'block';
        saveBtn.textContent = '수정 내용 저장';
      }
      renderProfileSystem();
      const dateInput = document.getElementById('birth-date');
      if (state.inputMode === 'edit' && dateInput) dateInput.focus();
    };
  }

  // [가족 추가] 버튼 클릭 시 -> 가족/지인 등록 모드로 펼침 (빈 폼)
  if (addFamBtn) {
    addFamBtn.onclick = () => {
      state.inputMode = (state.inputMode === 'add-family') ? 'none' : 'add-family';
      if (state.inputMode === 'add-family') {
        fillProfileToForm({ birthDate: '', birthHour: '', birthCity: '', gender: '', calendarType: 'solar' });
        if (customRelInput) {
          customRelInput.value = '';
          customRelInput.style.display = 'none';
        }
      }
      renderProfileSystem();
      refreshSubmitTextForFamily();
      const dateInput = document.getElementById('birth-date');
      if (state.inputMode === 'add-family' && dateInput) dateInput.focus();
    };
  }

  // 관계 선택 칩 클릭 이벤트 (배우자 / 아들 / 딸 / 부모님 / 친구·연인 / 기타)
  relChips.forEach(chip => {
    chip.onclick = () => {
      relChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      if (chip.dataset.rel === '기타') {
        if (customRelInput) {
          customRelInput.style.display = 'inline-block';
          customRelInput.focus();
        }
      } else {
        if (customRelInput) customRelInput.style.display = 'none';
      }
      refreshSubmitTextForFamily();
    };
  });

  // 기타 호칭 직접 입력 시 대형 버튼 문구 실시간 연동
  if (customRelInput) {
    customRelInput.oninput = () => {
      refreshSubmitTextForFamily();
    };
  }

  // [수정 내용 저장] 클릭 시 (수정 모드 전용)
  if (saveInputBtn) {
    saveInputBtn.onclick = () => {
      const profileData = readFormProfile();
      if (!profileData.birthDate) {
        alert('생년월일을 입력해 주세요.');
        return;
      }
      if (!profileData.gender) {
        alert('성별을 선택해 주세요.');
        return;
      }
      if (!resolveSolarDate(profileData)) {
        alert('입력하신 날짜를 확인해 주세요.');
        return;
      }

      let targetIndex = state.profiles.findIndex(p => p.id === state.activeProfileId);
      if (targetIndex >= 0) {
        state.profiles[targetIndex] = { ...state.profiles[targetIndex], ...profileData };
      } else {
        state.profiles = [{ id: 'me', name: '나', ...profileData }];
        state.activeProfileId = 'me';
      }

      saveProfiles(state.profiles);
      state.inputMode = 'none';
      renderProfileSystem();
    };
  }

  // [접기 / 취소] 클릭 시
  if (cancelInputBtn) {
    cancelInputBtn.onclick = () => {
      state.inputMode = 'none';
      renderProfileSystem();
    };
  }
}

// 최초 실행자(신규) vs 재방문자 분기 렌더링
function restoreSavedProfileToForm() {
  if (state.profiles && state.profiles.length > 0) {
    state.activeProfileId = 'me';
    state.inputMode = 'none';
    const me = state.profiles.find(p => p.id === 'me') || state.profiles[0];
    state.savedProfile = me;
  } else {
    state.activeProfileId = null;
    state.savedProfile = null;
    state.inputMode = 'edit'; // 최초 실행자는 사주입력창 활짝 펼침!
  }
  renderProfileSystem();
}

// ⭐ 대표님 지침 3: 결과 화면 상단 [사주 명리 정밀 진단 & 오행 숫자 처방 카드] 동적 갱신
function updateDiagnosisCard(saju) {
  if (!saju) return;

  const card = document.getElementById('saju-summary-bar');
  if (card) card.style.display = 'block';

  const titleEl = document.getElementById('diagnosis-title');
  if (titleEl) {
    const prof = state.savedProfile || (state.profiles ? state.profiles.find(p => p.id === state.activeProfileId) : null);
    if (prof && prof.birthDate) {
      const pName = (prof.id === 'me' || !prof.name) ? '나' : prof.name;
      const calStr = (prof.calendarType === 'lunar') ? '음력' : '양력';
      const leapStr = prof.isLeapMonth ? '윤달 ' : '';
      titleEl.innerText = `${pName} (${prof.birthDate} ${leapStr}${calStr}) 사주 명리 정밀 진단`;
    } else {
      titleEl.innerText = `${saju.dateStr} 사주 명리 정밀 진단`;
    }
  }

  const strongElemEl = document.getElementById('diag-strong-elem');
  if (strongElemEl && saju.primaryElement) {
    const maxPct = saju.ohaengPercent[saju.maxElement] || 0;
    strongElemEl.innerText = `${saju.primaryElement.name} 왕성 (${maxPct}%)`;
  }

  const weakElemEl = document.getElementById('diag-weak-elem');
  if (weakElemEl && saju.lackingElement) {
    const minPct = saju.ohaengPercent[saju.minElement] || 0;
    weakElemEl.innerText = `${saju.lackingElement.name} 결핍 (${minPct}%) ⚠️ 보강`;
  }

  const prescriptNumbersEl = document.getElementById('diag-prescript-numbers');
  if (prescriptNumbersEl) {
    const sc = saju.seoncheon ? saju.seoncheon.join(', ') : '';
    const hc = saju.hucheon ? saju.hucheon.join(', ') : '';
    const parentName = saju.parentElemObj ? saju.parentElemObj.name : '상생';
    const parentBalls = saju.parentBalls ? saju.parentBalls.slice(0, 3).join(', ') : '';
    prescriptNumbersEl.innerHTML = `선천수 <strong>${sc}</strong> · 후천수 <strong>${hc}</strong> · 상생 보완수 <strong>${parentName} (${parentBalls})</strong>`;
  }

  const prescriptCommentEl = document.getElementById('diag-prescript-comment');
  if (prescriptCommentEl && saju.lackingElement) {
    const lackName = saju.lackingElement.name;
    const parentName = saju.parentElemObj ? saju.parentElemObj.name : '상생';
    prescriptCommentEl.innerHTML = `"부족한 <strong>${lackName}</strong> 기운을 보완해야 ${saju.lackingElement.symbol}의 결실이 맺히므로, <strong>${parentName}·${lackName}</strong> 번호를 중심으로 황금 배합했습니다."`;
  }

  // "사주 변경 ✏️" 버튼 클릭 시 입력 폼 화면으로 이동
  const toggleSajuBtn = document.getElementById('btn-toggle-saju');
  if (toggleSajuBtn) {
    toggleSajuBtn.onclick = () => {
      showScreen('main');
    };
  }
}

function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('clear') === '1') {
    localStorage.clear();
    window.location.href = window.location.pathname;
    return;
  }
  renderDrawBoard();
  updateSalesStatus();
  renderSavedCount();
  setupNavigation();
  setupForm();
  initWheelDatePicker();
  restoreSavedProfileToForm(); // 재방문자 사주 자동 채우기
  initModalSystem();

  // 첫 화면은 무조건 로또 추출 메인 화면으로 시작!
  showScreen('main');

  // URL 파라미터 기반 검증 데모 지원 (?demo=ticket 또는 ?demo=destiny 또는 ?share=...)
  if (urlParams.get('share')) {
    handleIncomingSharedProfile(urlParams.get('share'));
    return;
  } else if (urlParams.get('demo') === 'ticket') {
    runAnalysis({ birthDate: '1985-05-15', birthHour: 12, birthCity: 'seoul', gender: 'male' }, 'results');
  } else if (urlParams.get('demo') === 'destiny') {
    runAnalysis({ birthDate: '1985-05-15', birthHour: 12, birthCity: 'seoul', gender: 'male' }, 'destiny');
  }

  // 1분 주기 판매현황 자동 갱신
  setInterval(updateSalesStatus, 60000);
}

/**
 * 가족 사주 공유 딥링크 처리:
 * 링크를 타고 들어온 가족의 스마트폰에 본인 사주로 자동 안착
 */
function handleIncomingSharedProfile(shareDataStr) {
  try {
    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(shareDataStr))));
    const shared = JSON.parse(jsonStr);
    if (!shared || !shared.birthDate) {
      showScreen('main');
      return;
    }

    const myProfile = {
      id: 'me',
      name: shared.name || '나',
      relation: '본인',
      birthDate: shared.birthDate,
      calendarType: shared.calendarType || 'solar',
      isLeap: !!shared.isLeap,
      birthHour: shared.birthHour || '12',
      gender: shared.gender || 'female',
      birthCity: shared.birthCity || 'seoul'
    };

    let profiles = loadProfiles();
    profiles = profiles.filter(p => p.id !== 'me');
    profiles.unshift(myProfile);
    saveProfiles(profiles);
    state.profiles = profiles;
    state.activeProfileId = 'me';

    const senderName = shared.sender || '가족';
    runAnalysis(myProfile, 'destiny');

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    setTimeout(() => {
      alert(`💌 ${senderName} 님이 보내신 ${myProfile.name} 님의 사주와 오늘의 기운이 내 스마트폰에 안전하게 등록되었습니다!`);
    }, 400);

  } catch (err) {
    console.error('공유 프로필 파싱 오류:', err);
    showScreen('main');
  }
}

function setupNavigation() {
  // 1. 결과 화면에서 "다시 입력" 버튼
  const backToInputBtn = document.getElementById('btn-back-to-input');
  if (backToInputBtn) {
    backToInputBtn.addEventListener('click', () => {
      showScreen('main');
    });
  }

  // 2. 결과 화면에서 "평생 운명수 보기" 버튼
  const switchToDestinyBtn = document.getElementById('btn-switch-to-destiny');
  if (switchToDestinyBtn) {
    switchToDestinyBtn.addEventListener('click', () => {
      showScreen('destiny');
    });
  }

  // 3. 평생 운명수 화면에서 "로또 티켓으로 돌아가기" 버튼
  const backToTicketBtn = document.getElementById('btn-back-to-lotto-ticket');
  if (backToTicketBtn) {
    backToTicketBtn.addEventListener('click', () => {
      showScreen('results');
    });
  }

  // 4. 사주 평생 운명수 추출 공통 처리 함수
  function handleDestinyExtraction() {
    const dateInput = document.getElementById('birth-date');
    let profile = readFormProfile();
    if ((!profile || !profile.birthDate) && state.savedProfile) {
      profile = state.savedProfile;
    }

    if (profile && profile.birthDate && !isNaN(profile.birthHour) && profile.birthCity && profile.gender) {
      if (!resolveSolarDate(profile)) {
        alert('입력하신 음력 날짜를 확인해 주세요. (해당 연도에 없는 날짜이거나 윤달이 없는 달입니다)');
        return;
      }
      localStorage.setItem('saju_lotto_v2_profile', JSON.stringify(profile));
      state.savedProfile = profile;
      state.profile = profile;
      runAnalysis(profile, 'destiny');
    } else if (state.savedProfile) {
      state.profile = state.savedProfile;
      runAnalysis(state.savedProfile, 'destiny');
    } else {
      alert('생년월일과 출생 정보를 입력하시면 나만의 평생 운명수(전화·비밀번호·차량번호)를 확인하실 수 있습니다.');
      const formCard = document.getElementById('lotto-extract-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (dateInput) dateInput.focus();
    }
  }

  // 폼 내부 평생수 별도 추출 버튼
  const destinyFormBtn = document.getElementById('btn-submit-destiny-form');
  if (destinyFormBtn) {
    destinyFormBtn.addEventListener('click', handleDestinyExtraction);
  }

  // 메인 하단 평생 운명수 배너 클릭
  const gatewayBtn = document.getElementById('btn-open-destiny-gateway');
  if (gatewayBtn) {
    gatewayBtn.addEventListener('click', handleDestinyExtraction);
  }
}

// =====================================================================
// [토스 · 카카오뱅크 스타일 3열 롤링 휠 피커 시스템]
// =====================================================================
function initWheelDatePicker() {
  const triggerBtn = document.getElementById('birth-date-trigger');
  const modal = document.getElementById('wheel-picker-modal');
  const closeBtn = document.getElementById('btn-close-wheel-picker');
  const confirmBtn = document.getElementById('btn-confirm-wheel-picker');
  const previewText = document.getElementById('wheel-preview-date');
  const displayText = document.getElementById('birth-date-display-text');
  const dateInput = document.getElementById('birth-date');
  const yInput = document.getElementById('birth-year');
  const mInput = document.getElementById('birth-month');
  const dInput = document.getElementById('birth-day');

  const scrollY = document.getElementById('wheel-scroll-year');
  const scrollM = document.getElementById('wheel-scroll-month');
  const scrollD = document.getElementById('wheel-scroll-day');
  if (!triggerBtn || !modal || !scrollY || !scrollM || !scrollD) return;

  const ITEM_HEIGHT = 44;
  let curYear = 1971;
  let curMonth = 10;
  let curDay = 15;

  // 1. 연도 생성 (2026 ~ 1920)
  scrollY.innerHTML = '';
  for (let y = 2026; y >= 1920; y--) {
    const item = document.createElement('div');
    item.className = 'wheel-item';
    item.dataset.value = String(y);
    item.textContent = `${y}년`;
    item.onclick = () => {
      curYear = y;
      scrollToValue(scrollY, y, true);
      updateDaysForSelection();
      onDateWheelChange();
    };
    scrollY.appendChild(item);
  }

  // 2. 월 생성 (1 ~ 12)
  scrollM.innerHTML = '';
  for (let m = 1; m <= 12; m++) {
    const item = document.createElement('div');
    item.className = 'wheel-item';
    item.dataset.value = String(m);
    item.textContent = `${m}월`;
    item.onclick = () => {
      curMonth = m;
      scrollToValue(scrollM, m, true);
      updateDaysForSelection();
      onDateWheelChange();
    };
    scrollM.appendChild(item);
  }

  // 3. 일 생성 (연/월에 따라 28~31일 동적 갱신)
  function renderDays(maxDays) {
    scrollD.innerHTML = '';
    for (let d = 1; d <= maxDays; d++) {
      const item = document.createElement('div');
      item.className = 'wheel-item';
      item.dataset.value = String(d);
      item.textContent = `${d}일`;
      item.onclick = () => {
        curDay = d;
        scrollToValue(scrollD, d, true);
        onDateWheelChange();
      };
      scrollD.appendChild(item);
    }
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function updateDaysForSelection() {
    const maxDays = getDaysInMonth(curYear, curMonth);
    if (curDay > maxDays) curDay = maxDays;
    renderDays(maxDays);
  }

  let isProgrammaticScroll = false;

  function getTargetScroll(container, val) {
    if (container === scrollY) {
      return Math.max(0, (2026 - val) * ITEM_HEIGHT);
    } else if (container === scrollM) {
      return Math.max(0, (val - 1) * ITEM_HEIGHT);
    } else if (container === scrollD) {
      return Math.max(0, (val - 1) * ITEM_HEIGHT);
    }
    return 0;
  }

  function scrollToValue(container, val, smooth = true) {
    if (!container) return;
    const targetScroll = getTargetScroll(container, val);
    isProgrammaticScroll = true;
    if (smooth) {
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    } else {
      container.scrollTop = targetScroll;
    }
    setTimeout(() => {
      container.scrollTop = targetScroll;
      updateHighlight();
    }, smooth ? 180 : 20);

    setTimeout(() => {
      isProgrammaticScroll = false;
      updateHighlight();
    }, 320);
  }

  function onDateWheelChange() {
    updateHighlight();
    if (previewText) {
      previewText.textContent = `${curYear}년 ${curMonth}월 ${curDay}일`;
    }
  }

  function updateHighlight() {
    [scrollY, scrollM, scrollD].forEach(c => {
      c.querySelectorAll('.wheel-item').forEach(it => it.classList.remove('selected'));
    });
    const yItem = scrollY.querySelector(`[data-value="${curYear}"]`);
    const mItem = scrollM.querySelector(`[data-value="${curMonth}"]`);
    const dItem = scrollD.querySelector(`[data-value="${curDay}"]`);
    if (yItem) yItem.classList.add('selected');
    if (mItem) mItem.classList.add('selected');
    if (dItem) dItem.classList.add('selected');
  }

  function setupScrollDetect(container, onSelect) {
    let timer = null;
    container.addEventListener('scroll', () => {
      if (isProgrammaticScroll) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (isProgrammaticScroll) return;
        const scrollTop = container.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        const items = container.querySelectorAll('.wheel-item');
        if (items[index]) {
          const val = parseInt(items[index].dataset.value, 10);
          onSelect(val);
        }
      }, 50);
    }, { passive: true });
  }

  setupScrollDetect(scrollY, (y) => {
    curYear = y;
    syncActiveDecadeChip(y);
    updateDaysForSelection();
    scrollToValue(scrollD, curDay, false);
    onDateWheelChange();
  });

  setupScrollDetect(scrollM, (m) => {
    curMonth = m;
    updateDaysForSelection();
    scrollToValue(scrollD, curDay, false);
    onDateWheelChange();
  });

  setupScrollDetect(scrollD, (d) => {
    curDay = d;
    onDateWheelChange();
  });

  function syncActiveDecadeChip(year) {
    const decadeStart = Math.floor(year / 10) * 10;
    decadeChips.forEach(c => {
      const cy = parseInt(c.dataset.year, 10);
      c.classList.toggle('active', cy === decadeStart);
    });
  }

  // 퀵 연대 칩 클릭 (50년대~00년대 1초 점프)
  const decadeChips = modal.querySelectorAll('.decade-chip');
  decadeChips.forEach(chip => {
    chip.onclick = (e) => {
      e.stopPropagation();
      const targetYear = parseInt(chip.dataset.year, 10);
      curYear = targetYear;
      decadeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      scrollToValue(scrollY, targetYear, true);
      onDateWheelChange();
    };
  });

  // 상하 화살표 (▲ / ▼) 버튼 클릭 이벤트
  modal.querySelectorAll('.btn-stepper').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const col = btn.dataset.col;
      const dir = parseInt(btn.dataset.dir, 10); // -1 (상단 ▲), 1 (하단 ▼)
      stepWheel(col, dir);
    };
  });

  function stepWheel(col, dir) {
    if (col === 'year') {
      const nextY = dir === -1 ? curYear + 1 : curYear - 1;
      if (nextY >= 1920 && nextY <= 2026) {
        curYear = nextY;
        syncActiveDecadeChip(curYear);
        scrollToValue(scrollY, curYear, true);
        updateDaysForSelection();
        onDateWheelChange();
      }
    } else if (col === 'month') {
      let nextM = dir === -1 ? curMonth - 1 : curMonth + 1;
      if (nextM < 1) nextM = 12;
      if (nextM > 12) nextM = 1;
      curMonth = nextM;
      scrollToValue(scrollM, curMonth, true);
      updateDaysForSelection();
      onDateWheelChange();
    } else if (col === 'day') {
      const maxD = getDaysInMonth(curYear, curMonth);
      let nextD = dir === -1 ? curDay - 1 : curDay + 1;
      if (nextD < 1) nextD = maxD;
      if (nextD > maxD) nextD = 1;
      curDay = nextD;
      scrollToValue(scrollD, curDay, true);
      onDateWheelChange();
    }
  }

  // 모달 열기
  function openPicker() {
    let initDate = dateInput ? dateInput.value : '';
    if (initDate && initDate.includes('-')) {
      const parts = initDate.split('-');
      curYear = parseInt(parts[0], 10) || 1971;
      curMonth = parseInt(parts[1], 10) || 10;
      curDay = parseInt(parts[2], 10) || 15;
    } else {
      curYear = 1971;
      curMonth = 10;
      curDay = 15;
    }

    updateDaysForSelection();
    modal.style.display = 'flex';
    syncActiveDecadeChip(curYear);

    scrollToValue(scrollY, curYear, false);
    scrollToValue(scrollM, curMonth, false);
    scrollToValue(scrollD, curDay, false);
    onDateWheelChange();

    setTimeout(() => {
      scrollToValue(scrollY, curYear, false);
      scrollToValue(scrollM, curMonth, false);
      scrollToValue(scrollD, curDay, false);
      onDateWheelChange();
    }, 40);
  }

  function closePicker() {
    modal.style.display = 'none';
  }

  window.openWheelPicker = openPicker;
  window.closeWheelPicker = closePicker;

  triggerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openPicker();
  });
  triggerBtn.onclick = (e) => {
    e.preventDefault();
    openPicker();
  };

  if (closeBtn) closeBtn.onclick = closePicker;
  const backdrop = document.getElementById('wheel-picker-backdrop');
  if (backdrop) backdrop.onclick = closePicker;
  modal.onclick = (e) => {
    if (e.target === modal || e.target === backdrop) closePicker();
  };

  confirmBtn.onclick = () => {
    const sYear = String(curYear);
    const sMonth = String(curMonth).padStart(2, '0');
    const sDay = String(curDay).padStart(2, '0');
    const fullDate = `${sYear}-${sMonth}-${sDay}`;

    if (dateInput) dateInput.value = fullDate;
    if (yInput) yInput.value = sYear;
    if (mInput) mInput.value = sMonth;
    if (dInput) dInput.value = sDay;

    if (displayText) {
      displayText.textContent = `${sYear}년 ${curMonth}월 ${curDay}일`;
      displayText.classList.remove('placeholder');
    }

    closePicker();
  };
}

// 폼에서 사주 정보 읽기 (양력/음력·윤달 포함)
function readFormProfile() {
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const leapEl = document.getElementById('is-leap-month');
  let bDate = val('birth-date');
  if (!bDate) {
    const y = val('birth-year');
    const m = val('birth-month');
    const d = val('birth-day');
    if (y && m && d) {
      bDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      const dateEl = document.getElementById('birth-date');
      if (dateEl) dateEl.value = bDate;
    }
  }
  return {
    birthDate: bDate,
    birthHour: parseInt(val('birth-hour'), 10),
    birthCity: val('birth-city'),
    gender: val('gender'),
    calendarType: val('calendar-type') || 'solar',
    isLeapMonth: !!(leapEl && leapEl.checked)
  };
}

// 양력/음력 · 성별 세그먼트 토글 버튼 연결
function setupSegmentToggles() {
  document.querySelectorAll('.seg-toggle').forEach(group => {
    const hidden = document.getElementById(group.dataset.target);
    group.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.seg-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        if (hidden) hidden.value = btn.dataset.value;

        // 음력 선택 시에만 '윤달' 체크 노출 + 라벨 변경
        if (group.dataset.target === 'calendar-type') {
          const isLunar = btn.dataset.value === 'lunar';
          const leapWrap = document.getElementById('leap-month-wrap');
          const dateLabel = document.getElementById('birth-date-label');
          if (leapWrap) leapWrap.style.display = isLunar ? 'inline-flex' : 'none';
          if (dateLabel) dateLabel.textContent = isLunar ? '생년월일 (음력)' : '생년월일 (양력)';
        }
      });
    });
  });
}

function setupForm() {
  setupSegmentToggles();
  const form = document.getElementById('saju-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const activeProfile = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0] || null;

      // 1. 접힌 상태(원클릭 슈퍼패스 모드)이고 저장된 프로필이 있는 경우 -> 0.1초 즉시 추출!
      if (state.inputMode === 'none' && activeProfile) {
        const cleanProf = {
          ...activeProfile,
          birthDate: normalizeBirthDate(activeProfile.birthDate)
        };
        runAnalysis(cleanProf, 'results');
        return;
      }

      // 2. 폼이 열려있거나 신규 등록인 경우 -> 입력값 검증 후 저장 및 추출
      const profile = readFormProfile();

      if (!profile.birthDate) {
        alert('생년월일을 입력해 주세요.');
        return;
      }
      if (!profile.gender) {
        alert('성별(남/여)을 선택해 주세요.');
        return;
      }
      if (!resolveSolarDate(profile)) {
        alert('입력하신 음력 날짜를 확인해 주세요. (해당 연도에 없는 날짜이거나 윤달이 없는 달입니다)');
        return;
      }

      // 프로필 저장 및 분석 실행
      if (state.inputMode === 'add-family') {
        const activeChip = document.querySelector('#relation-chips-group .rel-chip.active');
        const customRelInput = document.getElementById('custom-rel-name');
        let relTitle = activeChip ? activeChip.dataset.rel : '가족';
        if (relTitle === '기타' && customRelInput && customRelInput.value.trim()) {
          relTitle = customRelInput.value.trim();
        } else if (relTitle === '친구') {
          relTitle = '친구·연인';
        }

        // 중복 이름 방지 (예: 아들이 2명이면 '아들 2')
        let finalName = relTitle;
        const sameCount = state.profiles.filter(p => p.name.startsWith(relTitle)).length;
        if (sameCount > 0) {
          finalName = `${relTitle} ${sameCount + 1}`;
        }

        const newProfile = {
          id: `fam_${Date.now()}`,
          name: finalName,
          ...profile
        };

        state.profiles.push(newProfile);
        state.activeProfileId = newProfile.id;
        state.savedProfile = newProfile;
        saveProfiles(state.profiles);
        state.inputMode = 'none';
        renderProfileSystem();
        runAnalysis(newProfile, 'results');
        return;
      }

      if (state.profiles.length === 0) {
        state.profiles = [{ id: 'me', name: '나', ...profile }];
        state.activeProfileId = 'me';
      } else {
        const idx = state.profiles.findIndex(p => p.id === state.activeProfileId);
        if (idx >= 0) {
          state.profiles[idx] = { ...state.profiles[idx], ...profile };
        }
      }
      saveProfiles(state.profiles);
      state.savedProfile = profile;
      state.inputMode = 'none';
      renderProfileSystem();

      runAnalysis(profile, 'results');
    });
  }

  state.selectedAmount = 5000;
}

function runAnalysis(profile, targetScreen = 'results') {
  try {
    const sheetCount = state.selectedAmount === 20000 ? 4 : (state.selectedAmount === 10000 ? 2 : 1);
    state.sheets = [];
    // 음력 입력자는 양력으로 변환 후 사주 계산 (만세력 기준 통일)
    const solarDate = resolveSolarDate(profile) || profile.birthDate;
    for (let s = 0; s < sheetCount; s++) {
      state.sheets.push(calculateSaju(solarDate, profile.birthHour, profile.birthCity, profile.gender, s));
    }
    state.currentSheetIndex = 0;
    state.isAllSheetsView = false;
    state.sajuResult = state.sheets[0];
    state.profile = profile;

    // 1줄 요약 뱃지 갱신 (로또 티켓 상단)
    const harmonyText = document.getElementById('ticket-harmony-text');
    if (harmonyText && state.sajuResult) {
      const sc = state.sajuResult.seoncheon.join(', ');
      const hc = state.sajuResult.hucheon.join(', ');
      harmonyText.textContent = `선천수 ${sc} · 후천수 ${hc} · 오행 상생 조화 5게임 큐레이션`;
    }

    renderLottoView();
    renderDestinyView(state.sajuResult);
    updateDiagnosisCard(state.sajuResult); // 사주 정밀 진단 & 오행 숫자 처방 카드 동적 갱신
    autoSaveCurrentSheets(); // 대표님 지시: 번호 추출 즉시 내 폰에 무손실 자동 보관!

    showScreen(targetScreen);
  } catch (err) {
    console.error('사주 로또 분석 및 렌더링 오류:', err);
  }
}
window.runAnalysis = runAnalysis;

function calculateSaju(dateStr, hour, city, gender, sheetVariant = 0) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const cityOffset = CITY_TIME_OFFSETS[city] || -30;
  // baseSeed: 생년월일시 고유값 (사주 원국, 오행, 방위, 길시는 이 값으로 100% 영구 고정)
  const baseSeed = (year * 365 + month * 31 + day + hour + Math.abs(cityOffset));
  // seed: 다중 장수(1장, 2장, 3장...) 번호 조합 다양화에만 사용
  const seed = baseSeed + (sheetVariant * 137);

  // 만세력 자체 엔진 연동 (외부 통신 0회, 진짜 4주 8자 기반 오행)
  let chart = null;
  if (typeof SajuEngine !== 'undefined' && SajuEngine.computeChart) {
    chart = SajuEngine.computeChart(dateStr, hour, gender);
  }

  let ohaengPercent, minElement, maxElement;
  if (chart) {
    ohaengPercent = chart.ohaengPercent;
    minElement = chart.minElement;
    maxElement = chart.maxElement;
  } else {
    // 비상용 폴백
    const rawOhaeng = {
      wood:  15 + (baseSeed * 7) % 25, fire:  15 + (baseSeed * 11) % 25,
      earth: 15 + (baseSeed * 13) % 25, metal: 15 + (baseSeed * 17) % 25, water: 15 + (baseSeed * 19) % 25
    };
    const total = rawOhaeng.wood + rawOhaeng.fire + rawOhaeng.earth + rawOhaeng.metal + rawOhaeng.water;
    ohaengPercent = {
      wood:  Math.round((rawOhaeng.wood / total) * 100),
      fire:  Math.round((rawOhaeng.fire / total) * 100),
      earth: Math.round((rawOhaeng.earth / total) * 100),
      metal: Math.round((rawOhaeng.metal / total) * 100),
      water: 100 - (Math.round((rawOhaeng.wood / total) * 100) + Math.round((rawOhaeng.fire / total) * 100) + Math.round((rawOhaeng.earth / total) * 100) + Math.round((rawOhaeng.metal / total) * 100))
    };
    minElement = 'wood'; maxElement = 'wood';
    for (let k in ohaengPercent) {
      if (ohaengPercent[k] < ohaengPercent[minElement]) minElement = k;
      if (ohaengPercent[k] > ohaengPercent[maxElement]) maxElement = k;
    }
  }

  const SEONCHEON_MAP = { wood: [3, 8], fire: [2, 7], earth: [5, 10], metal: [4, 9], water: [1, 6] };
  const HUCHEON_MAP   = { wood: [3, 4], fire: [9], earth: [2, 5, 8], metal: [6, 7], water: [1] };
  const seoncheon = SEONCHEON_MAP[minElement];
  const hucheon = HUCHEON_MAP[minElement];

  // 5게임 구조: A~E 역할 분류 + 오늘의 십신(일진)에 따른 배합 (v5_lotto_engine.js)
  const games = [];
  const minObj = OHAENG_INFO[minElement];
  const parentMap = { wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal' };
  const parentElem = parentMap[minElement];
  const parentBalls = OHAENG_INFO[parentElem].balls;
  const RECENT_WINNING = LATEST_DRAW.numbers; // 직전 회차 당첨번호 (자동 연동)

  // 오늘의 일진 및 수호수 (v5_destiny_hub.js와 100% 일치 연동)
  const HADO_NUMS = { wood: [3, 8], fire: [2, 7], earth: [5, 10], metal: [4, 9], water: [1, 6] };
  let todayReading = null;
  let guardianA = 9; // 기본값
  let guardianB = 8; // 기본값
  if (typeof SajuEngine !== 'undefined') {
    if (chart && SajuEngine.dailyReading) {
      try { todayReading = SajuEngine.dailyReading(chart.dayGan, new Date()); } catch (e) { todayReading = null; }
    }
    if (SajuEngine.todayPillar) {
      const todayP = SajuEngine.todayPillar(new Date());
      const todayGanIsYang = (todayP.idx % 2 === 0);
      const hadoA = HADO_NUMS[todayP.ganEl] || [1, 6];
      guardianA = todayGanIsYang ? hadoA[0] : hadoA[1];
      const hadoB = HADO_NUMS[minElement] || [4, 9];
      guardianB = (todayP.idx % 2 === 0) ? hadoB[0] : hadoB[1];
      if (guardianA === guardianB) {
        guardianB = (guardianA === hadoB[0]) ? hadoB[1] : hadoB[0];
      }
    }
  }
  const todayGod = todayReading ? todayReading.god : null;
  const todayKey = todayReading ? todayReading.key : new Date().toISOString().slice(0, 10);
  const dayEl = chart ? chart.dayGanEl : maxElement;

  const lotto = LottoEngine.generateGames({
    key: `${dateStr}|${hour}|${city}|${gender}|${todayKey}|r${getTargetRound()}|v${sheetVariant}`,
    minElement, dayEl, god: todayGod,
    hucheon, recent: RECENT_WINNING, hot: HOT_NUMBERS, cold: COLD_NUMBERS,
    guardianA, guardianB
  });
  const godTag = todayGod ? `오늘 ${todayGod}운` : '오늘의 기운';

  const gameMeta = {
    A: { title: `부족한 ${minObj.name} 기운 보강 조합`, desc: `오늘의 수호수(${guardianB}·${guardianA}) + 결핍 보강` },
    B: { title: `선천수·후천수 길수 조합`, desc: `후천수(끝자리) + ${godTag}` },
    C: { title: `${OHAENG_INFO[parentElem].name}·${minObj.name} 상생 순환 조합`, desc: `기운을 돕는 상생수 + ${godTag}` },
    D: { title: `사주 본원 귀인 조력 조합`, desc: `나를 돕는 귀인수 + ${godTag}` },
    E: { title: `5대 오행 황금 밸런스 조합`, desc: `5가지 기운 골고루 + ${godTag}` }
  };

  lotto.games.forEach((g) => {
    games.push({
      numbers: g.numbers,
      label: g.role,
      tag: g.role,
      title: gameMeta[g.role].title,
      desc: gameMeta[g.role].desc
    });
  });

  const DIRECTIONS = {
    wood: {
      title: '동쪽(東) 방면',
      desc: '자택 기준 동쪽 방향 (공원·녹지·학원가 인근 판매점 길)'
    },
    fire: {
      title: '남쪽(南) 방면',
      desc: '자택 기준 남쪽 방향 (밝은 대로변·쇼핑몰 인근 판매점 길)'
    },
    earth: {
      title: '동네 중심가(사거리)·동북쪽',
      desc: '자택 기준 동네 중심 번화가(로터리/역전) 또는 동북 방향 판매점 길'
    },
    metal: {
      title: '서쪽(西) 방면',
      desc: '자택 기준 서쪽 방향 (은행·금융가·환한 번화가 판매점 길)'
    },
    water: {
      title: '북쪽(北) 방면',
      desc: '자택 기준 북쪽 방향 (하천·강변길 또는 시원한 골목 판매점 길)'
    }
  };

  const TIMES = [
    { title: '오후 2시 ~ 4시 (미시 未時)', desc: '사주 재물운과 상생 기운이 결실을 맺는 길시' },
    { title: '오후 4시 ~ 6시 (신시 申時)', desc: '금전의 활력이 가장 왕성하게 솟구치는 길시' },
    { title: '오후 6시 ~ 8시 (유시 酉時)', desc: '하루의 번영과 재운이 곳간에 모이는 길시' },
    { title: '오전 11시 ~ 1시 (오시 午時)', desc: '천지의 양기(陽氣)가 최고조에 달하는 황금 길시' }
  ];

  const luckyDirectionObj = DIRECTIONS[minElement] || DIRECTIONS.earth;
  const luckyTimeObj = TIMES[baseSeed % TIMES.length];

  // 10천간 본원(일간 Day Master) 정밀 연산
  const CHEONGAN = [
    { gan: '甲', name: '갑목(甲木)', elem: 'wood', title: '생명의 큰 거목', desc: '흔들리지 않는 굳은 의지와 당당한 리더십' },
    { gan: '乙', name: '을목(乙木)', elem: 'wood', title: '유연한 화초와 담쟁이', desc: '끈질긴 생명력과 뛰어난 환경 적응력' },
    { gan: '丙', name: '병화(丙火)', elem: 'fire', title: '태양의 찬란한 빛', desc: '세상을 밝히는 열정과 당당함, 솔직한 성품' },
    { gan: '丁', name: '정화(丁火)', elem: 'fire', title: '어둠을 밝히는 등불', desc: '세심한 통찰력과 은근한 끈기, 사람을 끄는 온기' },
    { gan: '戊', name: '무토(戊土)', elem: 'earth', title: '웅장하고 넓은 태산', desc: '묵직한 신뢰감과 중후한 인품, 안정감 있는 배포' },
    { gan: '己', name: '기토(己土)', elem: 'earth', title: '만물을 품는 전답', desc: '어머니 같은 자상함과 포용력, 실속 있는 재물운' },
    { gan: '庚', name: '경금(庚金)', elem: 'metal', title: '단련된 원석과 검', desc: '과감한 결단력과 강직한 의리, 뛰어난 추진력' },
    { gan: '辛', name: '신금(辛金)', elem: 'metal', title: '빛나는 보석과 다이아', desc: '예리하고 정밀한 감각, 고귀한 자존심과 세련미' },
    { gan: '壬', name: '임수(壬水)', elem: 'water', title: '광활한 큰 바다와 강', desc: '무한한 지혜와 포용력, 거침없이 큰 뜻을 이루는 그릇' },
    { gan: '癸', name: '계수(癸水)', elem: 'water', title: '생명을 적시는 봄비', desc: '유연하고 다정한 지혜, 주변을 은은하게 살리는 감각' }
  ];
  const dayMasterIdx = chart ? chart.dayGan : Math.abs((year * 5 + month * 7 + day) % 10);
  const dayMaster = CHEONGAN[dayMasterIdx] || CHEONGAN[0];

  const COMPASS_INFO = {
    wood:  { dir: '동쪽(東) · 생명과 성장', color: '청색·녹색 (목기운)', season: '봄 (새싹의 계절)', elementStr: '목(木)' },
    fire:  { dir: '남쪽(南) · 열정과 번영', color: '적색·자색 (화기운)', season: '여름 (개화의 계절)', elementStr: '화(火)' },
    earth: { dir: '중앙(中) · 신뢰와 안정', color: '황색·베이지 (토기운)', season: '사계절 환절기 (조화)', elementStr: '토(土)' },
    metal: { dir: '서쪽(西) · 결단과 결실', color: '백색·은색 (금기운)', season: '가을 (수확의 계절)', elementStr: '금(金)' },
    water: { dir: '북쪽(北) · 지혜와 저장', color: '흑색·남색 (수기운)', season: '겨울 (충전의 계절)', elementStr: '수(水)' }
  };
  const destinyCompass = COMPASS_INFO[minElement] || COMPASS_INFO.fire;

  // 평생 4대 맞춤 운명수 체계화
  const p1 = seoncheon[0];
  const p2 = seoncheon[seoncheon.length - 1];
  const p3 = hucheon[0];
  const p4 = (p1 + p2 + p3 + 7) % 10;
  const bankPass = `${p1}${p2}${p3}${p4}`;
  const carNum = `${p2}${p1}${p2}${p3}`;
  const phoneNumbers = [
    `${p1}${p2}${p3}${p4}`,
    `${p2}${p2}${p3}${p1}`,
    `${p3}${p1}${p2}${(p1 + p2) % 10}`
  ];
  const floorList = [p1, p2, p1 + 10, p2 + 10].filter((v, i, a) => a.indexOf(v) === i && v > 0 && v <= 35).sort((a, b) => a - b);
  const roomList = floorList.slice(0, 3).map(f => `${f}0${(p1 % 4) + 1}호`);
  const businessNum = String(100000 + (seed * 31) % 899999);

  return {
    chart,
    dateStr, hour, city, gender, ohaengPercent, minElement, maxElement,
    primaryElement: OHAENG_INFO[maxElement] || { name: '오행', symbol: '' },
    lackingElement: OHAENG_INFO[minElement] || { name: '오행', symbol: '' },
    parentElemObj: OHAENG_INFO[parentElem] || { name: '상생', symbol: '' },
    parentBalls,
    seoncheon, hucheon, games,
    luckyDirection: luckyDirectionObj.title,
    luckyTime: luckyTimeObj.title,
    luckyDirectionObj,
    luckyTimeObj,
    dayMaster,
    dayMasterDesc: dayMaster.desc,
    destinyCompass,
    phoneNumbers, bankPass, carNum, businessNum,
    floorList, roomList
  };
}

function generateLuckyDigits(seed, variant) {
  const d1 = (seed * 3 + variant) % 9 + 1;
  const d2 = (seed * 7 + variant * 2) % 10;
  const d3 = (seed * 11 + variant * 3) % 10;
  const target = LUCKY_SURI_81[(seed + variant) % LUCKY_SURI_81.length];
  let d4 = (target - (d1 + d2 + d3)) % 10;
  if (d4 < 0) d4 += 10;
  return `${d1}${d2}${d3}${d4}`;
}

/**
 * [핵심] 티켓 렌더링 (A, B, C, D, E 좌측 세로 배지 & 다중 시트 네비게이션)
 */
function renderLottoView() {
  const resultSec = document.getElementById('lotto-result-section');
  if (resultSec) {
    resultSec.style.display = 'block';
  }

  const issueDateEl = document.getElementById('ticket-issue-time');
  if (issueDateEl) {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    issueDateEl.innerText = `발행: ${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()} (${days[now.getDay()]}) ${hh}:${mm}`;
  }

  const drawSchedEl = document.getElementById('ticket-draw-sched');
  if (drawSchedEl) {
    drawSchedEl.innerText = getNextSaturdayText();
  }

  // 1. 다중 장수(1만원, 2만원 등) 네비게이션 탭 렌더링
  const sheetNav = document.getElementById('ticket-sheet-nav');
  const tabsWrap = document.getElementById('sheet-tabs-wrap');
  if (sheetNav && tabsWrap) {
    if (state.sheets.length > 1) {
      sheetNav.style.display = 'flex';
      tabsWrap.innerHTML = '';
      state.sheets.forEach((_, idx) => {
        const tabBtn = document.createElement('button');
        tabBtn.type = 'button';
        tabBtn.className = `sheet-tab-btn ${!state.isAllSheetsView && state.currentSheetIndex === idx ? 'active' : ''}`;
        tabBtn.innerText = `${idx + 1}장 (${idx * 5 + 1}~${idx * 5 + 5}게임)`;
        tabBtn.onclick = () => {
          state.currentSheetIndex = idx;
          state.isAllSheetsView = false;
          renderLottoView();
        };
        tabsWrap.appendChild(tabBtn);
      });

      const toggleAllBtn = document.getElementById('btn-toggle-all-sheets');
      if (toggleAllBtn) {
        toggleAllBtn.innerText = state.isAllSheetsView ? '1장씩 보기 ▴' : '전체 펼쳐보기 ▾';
        toggleAllBtn.onclick = () => {
          state.isAllSheetsView = !state.isAllSheetsView;
          renderLottoView();
        };
      }
    } else {
      sheetNav.style.display = 'none';
    }
  }

  // 회차 및 장수 배지 표기
  const badgeEl = document.getElementById('ticket-sheet-badge');
  if (badgeEl) {
    const tr = getTargetRound();
    if (state.sheets.length > 1) {
      badgeEl.innerText = state.isAllSheetsView 
        ? `제${tr}회 (전체 ${state.sheets.length}장)`
        : `제${tr}회 (${state.currentSheetIndex + 1}장 / 총 ${state.sheets.length}장)`;
    } else {
      badgeEl.innerText = `제${tr}회 (1장 5게임)`;
    }
  }

  // 2. 게임 목록 렌더링 (대표님 요청: 좌측 세로 연회색 A, B, C, D, E 배지 적용)
  const gamesContainer = document.getElementById('ticket-games');
  if (!gamesContainer) return;
  gamesContainer.innerHTML = '';

  const sheetsToRender = state.isAllSheetsView ? state.sheets : [state.sheets[state.currentSheetIndex]];

  sheetsToRender.forEach((sheet, sIdx) => {
    const actualSheetIndex = state.isAllSheetsView ? sIdx : state.currentSheetIndex;
    if (state.isAllSheetsView && state.sheets.length > 1) {
      const divider = document.createElement('div');
      divider.style.cssText = 'padding: 8px 10px; margin: 10px 0 4px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.82rem; font-weight: 800; color: #1e3a8a; display: flex; justify-content: space-between;';
      divider.innerHTML = `<span>제${actualSheetIndex + 1}장 (행운 5게임)</span><span style="color:#64748b; font-size:0.75rem;">${actualSheetIndex * 5 + 1}~${actualSheetIndex * 5 + 5}게임</span>`;
      gamesContainer.appendChild(divider);
    }

    sheet.games.forEach((g) => {
      const row = document.createElement('div');
      row.className = 'game-compact-row';

      const ballsHtml = g.numbers.map(b => `<div class="compact-ball ${getBallClass(b)}">${b}</div>`).join('');

      row.innerHTML = `
        <div class="game-letter-sidebar">
          <span class="game-letter">${g.tag}</span>
        </div>
        <div class="game-main-content">
          <div class="game-title-line">
            <span class="game-meaning-title">${g.title}</span>
            <span class="game-meaning-desc">${g.desc}</span>
          </div>
          <div class="game-balls-line">
            <div class="compact-ball-group">${ballsHtml}</div>
          </div>
        </div>
      `;
      gamesContainer.appendChild(row);
    });
  });

  // 3. 추천 방위 및 최적 구매 시간 갱신
  const currentSheet = state.sheets[state.currentSheetIndex];
  if (currentSheet) {
    const dirEl = document.getElementById('ticket-direction');
    if (dirEl) dirEl.innerText = currentSheet.luckyDirectionObj ? currentSheet.luckyDirectionObj.title : currentSheet.luckyDirection;

    const dirDescEl = document.getElementById('ticket-direction-desc');
    if (dirDescEl && currentSheet.luckyDirectionObj) dirDescEl.innerText = currentSheet.luckyDirectionObj.desc;

    const timeEl = document.getElementById('ticket-time');
    if (timeEl) timeEl.innerText = currentSheet.luckyTimeObj ? currentSheet.luckyTimeObj.title : currentSheet.luckyTime;

    const timeDescEl = document.getElementById('ticket-time-desc');
    if (timeDescEl && currentSheet.luckyTimeObj) timeDescEl.innerText = currentSheet.luckyTimeObj.desc;
  }

  // 4. [추가 5게임 정밀 추출 (1,000원)] 결제 수요 검증 및 회차당 최대 10만원(20장) 한도 적용
  const addSheetBtn = document.getElementById('btn-add-sheet');
  if (addSheetBtn) {
    addSheetBtn.onclick = () => {
      if (!state.savedProfile) return;

      // 대표님 지시: 법상 1인 회차당 최대 구매 한도 10만원(20장/100게임) 준수
      const targetRound = getTargetRound();
      const savedInRound = state.savedNumbers
        .filter(rec => rec.round === targetRound)
        .reduce((sum, rec) => sum + (rec.totalSheets || 1), 0);
      const totalAccumSheets = savedInRound + state.sheets.length;

      if (totalAccumSheets >= 20 || state.sheets.length >= 20) {
        alert(`건전한 복권 문화 조성을 위해 1회차당 최대 구매 한도(10만원 / 20장)를 초과할 수 없습니다.\n\n다음 회차(제${targetRound + 1}회)를 이용해 주세요.`);
        return;
      }

      // 1,000원 결제 클릭 수요 카운트 집계 (대표님 보고용 데이터)
      const currentPaidClicks = parseInt(localStorage.getItem('saju_lotto_paid_clicks') || '0', 10) + 1;
      localStorage.setItem('saju_lotto_paid_clicks', currentPaidClicks.toString());

      // 손님에게 신뢰를 주는 안내 토스트/알림
      alert('오픈 기념 혜택!\n정밀 사주 추가 5게임(1,000원)이 오늘은 무료로 즉시 제공됩니다.');

      const nextIdx = state.sheets.length;
      const sp = state.savedProfile;
      const newSheet = calculateSaju(resolveSolarDate(sp) || sp.birthDate, sp.birthHour, sp.birthCity, sp.gender, nextIdx);
      state.sheets.push(newSheet);
      state.currentSheetIndex = nextIdx;
      state.isAllSheetsView = false;
      renderLottoView();

      // 대표님 지시: 추가 5게임(2장, 3장...) 누를 때마다 내 폰에 즉시 자동 저장 & 최신 갱신!
      autoSaveCurrentSheets();

      const ticketEl = document.getElementById('compact-ticket');
      if (ticketEl) ticketEl.scrollIntoView({ behavior: 'smooth' });
    };
  }

  // 5. 번호 보관 상태 버튼 바인딩 (이미 자동 저장 완료 상태 + 클릭 시 보관함 즉시 확인)
  const saveBtn = document.getElementById('btn-save-numbers');
  if (saveBtn) {
    saveBtn.onclick = () => {
      autoSaveCurrentSheets();
      const activeProf = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0] || { id: 'me', name: '나' };
      const pLabel = activeProf.name || '나';
      const targetRound = getTargetRound();
      if (confirm(`[${pLabel}] 제${targetRound}회 사주 맞춤 번호 총 ${state.sheets.length}장(${state.sheets.length * 5}게임)이 이미 내 폰에 안전하게 자동 보관되어 있습니다!\n\n지금 바로 [내 번호 보관함]을 열어 확인하시겠습니까?`)) {
        openVaultModal();
      }
    };
  }
}

/**
 * 대표님 지시 핵심 기능: 번호 추출 및 장수 추가 즉시 무손실 자동 저장 (Auto-Save)
 * - 손님이 실수로 '사주 영역(운명수)'으로 넘어가거나 뒤로가기를 눌러도 3장/5장 번호가 100% 안전 보존됨!
 * - 동일 인물 + 동일 회차는 자동으로 최신 장수로 스마트 갱신되어 중복 카드가 쌓이지 않음.
 */
function autoSaveCurrentSheets() {
  if (!state.sheets || state.sheets.length === 0) return;
  const allGames = [];
  state.sheets.forEach(sheet => {
    sheet.games.forEach(g => allGames.push(g.numbers));
  });

  const activeProf = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0] || { id: 'me', name: '나' };
  let pLabel = activeProf.name || '나';
  if (activeProf.id !== 'me' && activeProf.birthDate && activeProf.birthDate.length >= 4) {
    const yShort = `${activeProf.birthDate.substring(2, 4)}년`;
    pLabel = `${activeProf.name}(${yShort})`;
  }

  const targetRound = getTargetRound();
  const record = {
    id: Date.now(),
    profileId: activeProf.id,
    profileLabel: pLabel,
    round: targetRound,
    date: new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    fullDate: new Date().toLocaleString('ko-KR'),
    totalSheets: state.sheets.length,
    totalGames: allGames.length,
    sheets: JSON.parse(JSON.stringify(state.sheets))
  };

  const existingIdx = state.savedNumbers.findIndex(rec => 
    (rec.profileId === activeProf.id || rec.profileLabel === pLabel) && rec.round === targetRound
  );

  if (existingIdx >= 0) {
    state.savedNumbers[existingIdx] = record;
  } else {
    state.savedNumbers.unshift(record);
  }

  localStorage.setItem('saju_lotto_v2_saved', JSON.stringify(state.savedNumbers.slice(0, 30)));
  renderSavedCount();

  // 티켓 하단 버튼에 "자동보관 완료" 안심 상태 반영
  const saveBtn = document.getElementById('btn-save-numbers');
  if (saveBtn) {
    saveBtn.textContent = `내 폰에 자동보관 완료 (${state.sheets.length}장)`;
    saveBtn.classList.add('saved-active');
  }
}

function getNextSaturdayText() {
  const d = new Date();
  const day = d.getDay(); // 0: Sun, 6: Sat
  const diff = (6 - day + 7) % 7;
  const target = new Date(d);
  target.setDate(d.getDate() + (diff === 0 && d.getHours() >= 20 ? 7 : diff));
  const m = target.getMonth() + 1;
  const dt = target.getDate();
  return `${m}.${dt < 10 ? '0' + dt : dt}(토) 20:35 추첨`;
}

function getBallClass(num) {
  if (num <= 10) return 'col-1';
  if (num <= 20) return 'col-11';
  if (num <= 30) return 'col-21';
  if (num <= 40) return 'col-31';
  return 'col-41';
}

function updateDestinyDashboard(data) {
  if (!data) return;

  // 1. 오행 분포 요약 텍스트
  const coreSummary = document.getElementById('destiny-core-summary');
  if (coreSummary) {
    coreSummary.textContent = `${data.primaryElement.name} 중심 · ${data.lackingElement.name} 보강`;
  }

  // 2. 오행 5대 바 렌더링
  const barsContainer = document.getElementById('destiny-ohaeng-bars');
  if (barsContainer && data.ohaengPercent) {
    const ohaengList = [
      { key: 'wood',  name: '목(木)', fill: 'fill-wood' },
      { key: 'fire',  name: '화(火)', fill: 'fill-fire' },
      { key: 'earth', name: '토(土)', fill: 'fill-earth' },
      { key: 'metal', name: '금(金)', fill: 'fill-metal' },
      { key: 'water', name: '수(水)', fill: 'fill-water' }
    ];

    barsContainer.innerHTML = ohaengList.map(item => {
      const pct = data.ohaengPercent[item.key] || 0;
      return `
        <div class="ohaeng-bar-row">
          <span class="ohaeng-bar-name">${item.name}</span>
          <div class="ohaeng-bar-track">
            <div class="ohaeng-bar-fill ${item.fill}" style="width: ${pct}%;"></div>
          </div>
          <span class="ohaeng-bar-pct">${pct}%</span>
        </div>
      `;
    }).join('');
  }

  // 3. 일간 본원
  const dayMasterElem = document.getElementById('destiny-day-master');
  if (dayMasterElem && data.dayMaster) {
    dayMasterElem.textContent = `${data.dayMaster.name} (${data.dayMaster.title})`;
  }

  // 4. 수호 나침반
  const dirElem = document.getElementById('destiny-compass-dir');
  const colorElem = document.getElementById('destiny-compass-color');
  if (dirElem && data.destinyCompass) {
    dirElem.textContent = data.destinyCompass.dir;
  }
  if (colorElem && data.destinyCompass) {
    colorElem.textContent = data.destinyCompass.color;
  }
}

function renderDestinyView(data) {
  if (typeof renderDestinyHub === 'function') {
    renderDestinyHub(data);
  }
}

function renderSavedCount() {
  const count = state.savedNumbers.length;
  const badge = document.getElementById('saved-count-badge');
  if (badge) badge.innerText = count;
  const topBadge = document.getElementById('header-saved-count');
  if (topBadge) topBadge.innerText = count;
}

// =================================================================
// 6. [내 번호 보관함] 모달 제어 로직
// =================================================================
function openVaultModal() {
  const modal = document.getElementById('modal-vault');
  if (!modal) return;
  vaultActiveFilter = '나';
  renderVaultList();
  modal.style.display = 'flex';
}

function closeVaultModal() {
  const modal = document.getElementById('modal-vault');
  if (modal) modal.style.display = 'none';
}

function renderVaultGamesHtml(sheet) {
  const games = sheet.games || [];
  let html = '';

  games.forEach(g => {
    html += `
      <div class="vault-game-row">
        <div class="vault-game-left">
          <span class="vault-game-tag">${g.label}</span>
          <div class="vault-balls-group">
            ${g.numbers.map(n => `<span class="vault-ball ${getBallClass(n)}">${n}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  });

  return html;
}

let vaultActiveFilter = '나'; // 보관함 내 현재 활성 인물 필터 (항상 '나'가 기본)

function renderVaultList() {
  const container = document.getElementById('vault-list-container');
  if (!container) return;

  if (!state.savedNumbers || state.savedNumbers.length === 0) {
    container.innerHTML = `
      <div class="vault-empty-state">
        <div class="vault-empty-text">
          <strong>보관된 번호가 아직 없습니다.</strong><br>
          사주 맞춤 번호를 추출하신 후 <strong>[내 폰에 보관하기]</strong>를 눌러보세요!
        </div>
      </div>
    `;
    return;
  }

  // 1. 보관함에 저장된 고유 인물 목록 집계 및 '나' 최우선 정렬
  const profStats = {};
  state.savedNumbers.forEach(item => {
    const lbl = item.profileLabel || '나';
    if (!profStats[lbl]) {
      profStats[lbl] = { count: 0, sheets: 0 };
    }
    profStats[lbl].count += 1;
    profStats[lbl].sheets += (item.totalSheets || (item.sheets ? item.sheets.length : 1));
  });

  // '나'가 항상 1순위(맨 앞)에 오도록 정렬
  const profLabels = Object.keys(profStats).sort((a, b) => {
    if (a === '나') return -1;
    if (b === '나') return 1;
    return a.localeCompare(b);
  });

  // 현재 필터 유효성 검사 (항상 '나'가 우선)
  if (!profStats[vaultActiveFilter]) {
    vaultActiveFilter = profStats['나'] ? '나' : (profLabels[0] || '나');
  }

  // 2. 상단 인물별 전환 탭 바 (창 길어짐 방지: '전체' 탭 삭제, 인물별 1:1 전환)
  let filterTabsHtml = '';
  if (profLabels.length > 1) {
    filterTabsHtml = `
      <div class="vault-filter-tabs">
        ${profLabels.map(lbl => `
          <button type="button" class="vault-filter-tab ${vaultActiveFilter === lbl ? 'active' : ''}" data-filter="${lbl}">
            ${lbl}
          </button>
        `).join('')}
      </div>
    `;
  }

  // 3. 선택된 인물에 해당하는 카드만 1장 렌더링 (화면 스크롤 방지)
  const filteredRecords = state.savedNumbers
    .map((item, originalIdx) => ({ item, originalIdx }))
    .filter(({ item }) => (item.profileLabel || '나') === vaultActiveFilter);

  // 만약 선택된 인물의 레코드가 없으면 첫 번째 인물로 안전 폴백
  const displayRecords = (filteredRecords.length > 0) ? filteredRecords : [{ item: state.savedNumbers[0], originalIdx: 0 }];

  let cardsHtml = `<div class="vault-items-list">`;

  displayRecords.forEach(({ item, originalIdx }) => {
    const sheets = item.sheets || [{ games: item.games.map((g, gi) => ({ label: String.fromCharCode(65 + gi), numbers: g })) }];
    const totalSheets = item.totalSheets || sheets.length;
    const totalGames = item.totalGames || sheets.reduce((acc, s) => acc + s.games.length, 0);

    const itemRound = item.round || CURRENT_SALE_ROUND;
    const pLabel = item.profileLabel || '나';

    // 장수 전환 미니 탭 바 (2장 이상일 때 실물 OMR 1:1 넘겨보기 탭)
    let sheetTabsHtml = '';
    if (totalSheets > 1) {
      sheetTabsHtml = `
        <div class="vault-card-sheet-tabs" data-card-idx="${originalIdx}">
          ${sheets.map((_, sIdx) => `
            <button type="button" class="mini-sheet-tab ${sIdx === 0 ? 'active' : ''}" data-sheet-idx="${sIdx}">
              ${sIdx + 1}장
            </button>
          `).join('')}
        </div>
      `;
    }

    cardsHtml += `
      <div class="vault-card" data-idx="${originalIdx}">
        <div class="vault-card-header">
          <div class="vault-card-header-top">
            <div class="vault-card-title">
              <span class="vault-prof-pill">${pLabel}</span>
              <span class="vault-round-pill">제${itemRound}회</span>
            </div>
            <div class="vault-card-tools">
              <button type="button" class="btn-vault-action btn-vault-share" data-idx="${originalIdx}">카톡 전송</button>
              <button type="button" class="btn-vault-action btn-vault-omr" data-idx="${originalIdx}">OMR</button>
              <button type="button" class="btn-vault-action btn-vault-qr" data-idx="${originalIdx}">구매 QR</button>
              <button type="button" class="btn-vault-action delete btn-vault-del" data-idx="${originalIdx}">삭제</button>
            </div>
          </div>
          <div class="vault-time-text">${item.date || item.fullDate || '최근 저장'} (${totalGames}게임)</div>
          ${sheetTabsHtml}
        </div>
        <div class="vault-games-list" id="vault-games-list-${originalIdx}">
          ${renderVaultGamesHtml(sheets[0])}
        </div>
      </div>
    `;
  });

  cardsHtml += `</div>`;
  container.innerHTML = filterTabsHtml + cardsHtml;

  // 상단 인물별 필터 탭 클릭 이벤트
  container.querySelectorAll('.vault-filter-tab').forEach(fTab => {
    fTab.onclick = (e) => {
      e.stopPropagation();
      vaultActiveFilter = fTab.dataset.filter;
      renderVaultList();
    };
  });

  // 장수 전환 미니 탭 클릭 이벤트 (한 화면 노스크롤 실현)
  container.querySelectorAll('.mini-sheet-tab').forEach(tabBtn => {
    tabBtn.onclick = (e) => {
      e.stopPropagation();
      const parentWrap = tabBtn.closest('.vault-card-sheet-tabs');
      const cardIdx = parseInt(parentWrap.dataset.cardIdx, 10);
      const sheetIdx = parseInt(tabBtn.dataset.sheetIdx, 10);

      parentWrap.querySelectorAll('.mini-sheet-tab').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');

      const item = state.savedNumbers[cardIdx];
      if (item && item.sheets && item.sheets[sheetIdx]) {
        const gamesContainer = document.getElementById(`vault-games-list-${cardIdx}`);
        if (gamesContainer) {
          gamesContainer.innerHTML = renderVaultGamesHtml(item.sheets[sheetIdx]);
        }
      }
    };
  });

  // 바인딩: 카톡 전송, OMR, QR, 삭제
  container.querySelectorAll('.btn-vault-share').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx, 10);
      shareVaultRecord(idx);
    };
  });

  container.querySelectorAll('.btn-vault-omr').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const item = state.savedNumbers[idx];
      if (item) {
        closeVaultModal();
        const sheets = item.sheets || [{ games: item.games.map((g, gi) => ({ label: String.fromCharCode(65 + gi), numbers: g })) }];
        openOmrModal(sheets);
      }
    };
  });

  container.querySelectorAll('.btn-vault-qr').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const item = state.savedNumbers[idx];
      if (item) {
        closeVaultModal();
        const sheets = item.sheets || [{ games: item.games.map((g, gi) => ({ label: String.fromCharCode(65 + gi), numbers: g })) }];
        openQrModalForSheet(sheets);
      }
    };
  });

  container.querySelectorAll('.btn-vault-del').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx, 10);
      state.savedNumbers.splice(idx, 1);
      localStorage.setItem('saju_lotto_v2_saved', JSON.stringify(state.savedNumbers));
      renderSavedCount();
      renderVaultList();
    };
  });
}

// 텍스트 클립보드 복사 유틸
function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
  } catch (e) {
    console.warn('복사 실패', e);
  }
  document.body.removeChild(ta);
}

// 카톡/메시지 전송 및 전송 후 삭제/보관 분기 처리
async function shareVaultRecord(idx) {
  const item = state.savedNumbers[idx];
  if (!item) return;

  const pLabel = item.profileLabel || '나';
  const itemRound = item.round || CURRENT_SALE_ROUND;
  const sheets = item.sheets || [{ games: item.games.map((g, gi) => ({ label: String.fromCharCode(65 + gi), numbers: g })) }];

  // 메시지 텍스트 조립 (이모티콘 일체 배제)
  let text = `[사주로또 제${itemRound}회 ${pLabel} 맞춤 번호]\n\n`;
  sheets.forEach((sheet, sIdx) => {
    if (sheets.length > 1) {
      text += `[${sIdx + 1}번째 장]\n`;
    }
    sheet.games.forEach((g) => {
      const nums = (g.numbers || []).map(n => String(n).padStart(2, '0')).join(', ');
      text += `${g.label || 'A'}: ${nums}\n`;
    });
    text += `\n`;
  });

  const luckyDir = (state.luckyDirection && state.luckyDirection.name) 
    ? `${state.luckyDirection.name} (${state.luckyDirection.desc || ''})` 
    : '동남쪽 (금전운 명당)';
  const luckyTime = (state.luckyTime && state.luckyTime.name) 
    ? `${state.luckyTime.name} (${state.luckyTime.range || ''})` 
    : '목요일 미시(13시~15시)';

  text += `구매 길시 및 명당 안내\n`;
  text += `- 행운 방위: ${luckyDir}\n`;
  text += `- 구매 길시: ${luckyTime}\n\n`;
  text += `사주의 기운을 듬뿍 담아 행운과 1등 당첨을 진심으로 기원합니다.`;

  let sent = false;
  if (navigator.share) {
    try {
      await navigator.share({
        title: `사주로또 제${itemRound}회 ${pLabel} 맞춤 번호`,
        text: text
      });
      sent = true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyTextToClipboard(text);
        alert('사주 맞춤 번호가 복사되었습니다. 카카오톡 등에 붙여넣기 하세요!');
      }
    }
  } else {
    copyTextToClipboard(text);
    alert('사주 맞춤 번호가 복사되었습니다. 카카오톡 등에 붙여넣기 하세요!');
  }
}

function clearAllVault() {
  if (state.savedNumbers.length === 0) return;
  state.savedNumbers = [];
  localStorage.removeItem('saju_lotto_v2_saved');
  renderSavedCount();
  renderVaultList();
}

// =================================================================
// 7. [실제 로또 6/45 OMR 빨간 종이 마킹 뷰] 모달 제어 로직
// =================================================================
let currentOmrSheets = [];
let currentOmrSheetIdx = 0;

function openOmrModal(sheetsData, sheetIdx = 0) {
  const modal = document.getElementById('modal-omr');
  if (!modal) return;

  // 전달받은 sheetsData가 없으면 현재 화면의 state.sheets 사용
  currentOmrSheets = sheetsData || state.sheets || [];
  if (currentOmrSheets.length === 0) {
    alert('먼저 사주 맞춤 번호를 추출해주세요!');
    return;
  }
  currentOmrSheetIdx = sheetIdx;

  renderOmrTabs();
  renderOmrSheetPaper(currentOmrSheets[currentOmrSheetIdx]);
  modal.style.display = 'flex';
}

function closeOmrModal() {
  const modal = document.getElementById('modal-omr');
  if (modal) modal.style.display = 'none';
}

function renderOmrTabs() {
  const tabsContainer = document.getElementById('omr-sheet-tabs');
  if (!tabsContainer) return;

  if (currentOmrSheets.length <= 1) {
    tabsContainer.style.display = 'none';
    return;
  }
  tabsContainer.style.display = 'flex';

  tabsContainer.innerHTML = currentOmrSheets.map((s, idx) => `
    <button type="button" class="omr-tab-chip ${idx === currentOmrSheetIdx ? 'active' : ''}" data-idx="${idx}">
      제${idx + 1}장 (${(idx + 1) * 5}천원)
    </button>
  `).join('');

  tabsContainer.querySelectorAll('.omr-tab-chip').forEach(btn => {
    btn.onclick = () => {
      currentOmrSheetIdx = parseInt(btn.dataset.idx, 10);
      renderOmrTabs();
      renderOmrSheetPaper(currentOmrSheets[currentOmrSheetIdx]);
    };
  });
}

function renderOmrSheetPaper(sheet) {
  const paper = document.getElementById('omr-slip-paper');
  if (!paper || !sheet) return;

  const games = sheet.games || [];

  let html = `
    <div class="omr-top-brand">
      <div class="omr-lotto-logo">동행복권 LOTTO 6/45</div>
      <div class="omr-sub-info">슬립지 마킹 가이드 (제${getTargetRound()}회)</div>
    </div>
  `;

  // A~E 게임 렌더링 (교차 배경색: A,C,E 미색 / B,D 순백색)
  games.forEach((game, gIdx) => {
    const letter = (game.label || game.tag || String.fromCharCode(65 + gIdx)).charAt(0);
    const numsSet = new Set(game.numbers);
    const bgClass = gIdx % 2 === 1 ? 'omr-bg-white' : 'omr-bg-cream';

    html += `
      <div class="omr-game-section ${bgClass}">
        <div class="omr-game-label">${letter}</div>
        <div class="omr-grid-45">
    `;

    for (let n = 1; n <= 45; n++) {
      const isMarked = numsSet.has(n);
      html += `
        <div class="omr-cell ${isMarked ? 'marked' : ''}" title="${letter}게임 ${n}번">
          <span>${n < 10 ? '0' + n : n}</span>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  });

  paper.innerHTML = html;
}

// =================================================================
// 8. [모바일 슬립지 QR 발권] 모달 제어 로직
// =================================================================
let currentQrSheets = [];
let currentQrSheetIdx = 0;

function openQrModal(sheetsData, sheetIdx = 0) {
  const modal = document.getElementById('modal-qr');
  if (!modal) return;

  currentQrSheets = sheetsData || state.sheets || [];
  if (currentQrSheets.length === 0) {
    alert('먼저 사주 맞춤 번호를 추출해주세요!');
    return;
  }
  currentQrSheetIdx = sheetIdx;

  renderQrTabs();
  generateQrCodeDisplay(currentQrSheets[currentQrSheetIdx]);
  modal.style.display = 'flex';
}

function closeQrModal() {
  const modal = document.getElementById('modal-qr');
  if (modal) modal.style.display = 'none';
}

function renderQrTabs() {
  const tabsContainer = document.getElementById('qr-sheet-tabs');
  if (!tabsContainer) return;

  if (currentQrSheets.length <= 1) {
    tabsContainer.style.display = 'none';
    return;
  }
  tabsContainer.style.display = 'flex';

  tabsContainer.innerHTML = currentQrSheets.map((s, idx) => `
    <button type="button" class="qr-tab-chip ${idx === currentQrSheetIdx ? 'active' : ''}" data-idx="${idx}">
      ${idx + 1}장
    </button>
  `).join('');

  tabsContainer.querySelectorAll('.qr-tab-chip').forEach(btn => {
    btn.onclick = () => {
      currentQrSheetIdx = parseInt(btn.dataset.idx, 10);
      renderQrTabs();
      generateQrCodeDisplay(currentQrSheets[currentQrSheetIdx]);
    };
  });
}

function generateQrCodeDisplay(sheet) {
  const container = document.getElementById('qr-code-canvas-container');
  const roundInfo = document.getElementById('qr-round-info');
  const previewBox = document.getElementById('qr-games-preview');
  if (!container || !sheet) return;

  container.innerHTML = '';

  // 1. 동행복권 모바일 구매 슬립 표준 포맷 URL 생성
  // 규격 예: http://m.dhlottery.co.kr/?v=1244q010815233442q...
  let qrCodeData = `http://m.dhlottery.co.kr/?v=${getTargetRound()}`;
  sheet.games.forEach(g => {
    const formattedNums = g.numbers.map(n => (n < 10 ? '0' + n : String(n))).join('');
    qrCodeData += `q${formattedNums}`;
  });

  // 2. QRCode 렌더링 (라이브러리 or 폴백 이미지)
  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: qrCodeData,
        width: 190,
        height: 190,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      throw new Error('QRCode lib not loaded');
    }
  } catch (e) {
    // CDN 장애 대비 외부 QR API 이미지 폴백
    const safeData = encodeURIComponent(qrCodeData);
    container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${safeData}" alt="모바일 슬립지 QR" style="width:190px; height:190px;" />`;
  }

  if (roundInfo) {
    roundInfo.innerText = `제${getTargetRound()}회 로또 구매용`;
  }

  // 3. 하단 번호 요약 preview
  if (previewBox) {
    previewBox.innerHTML = sheet.games.map(g => `
      <div class="qr-game-preview-row">
        <span class="qr-game-label">${g.label}</span>
        <div class="qr-balls-row">
          ${g.numbers.map(n => `<span class="vault-ball ${getBallClass(n)}">${n}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }
}

// =================================================================
// 9. 모달 시스템 전역 이벤트 등록
// =================================================================
function initModalSystem() {
  // 상단 헤더 보관함 버튼
  const headerVaultBtn = document.getElementById('btn-open-vault-top');
  if (headerVaultBtn) {
    headerVaultBtn.onclick = () => openVaultModal();
  }

  // 티켓 하단 보관함 열기 버튼
  const openVaultBtn = document.getElementById('btn-open-vault');
  if (openVaultBtn) {
    openVaultBtn.onclick = () => openVaultModal();
  }

  // 보관함 닫기 버튼들
  const closeVaultBtn = document.getElementById('btn-close-vault');
  if (closeVaultBtn) closeVaultBtn.onclick = closeVaultModal;
  const confirmVaultBtn = document.getElementById('btn-confirm-vault');
  if (confirmVaultBtn) confirmVaultBtn.onclick = closeVaultModal;
  const vaultBackdrop = document.getElementById('modal-vault-backdrop');
  if (vaultBackdrop) vaultBackdrop.onclick = closeVaultModal;

  // 보관함 전체 비우기 버튼
  const clearVaultBtn = document.getElementById('btn-clear-vault');
  if (clearVaultBtn) clearVaultBtn.onclick = clearAllVault;

  // OMR 모달 열기 버튼 (티켓 화면의 빨간 버튼)
  const openOmrBtn = document.getElementById('btn-open-omr');
  if (openOmrBtn) {
    openOmrBtn.onclick = () => openOmrModal();
  }

  // OMR 닫기 버튼들
  const closeOmrBtn = document.getElementById('btn-close-omr');
  if (closeOmrBtn) closeOmrBtn.onclick = closeOmrModal;
  const confirmOmrBtn = document.getElementById('btn-confirm-omr');
  if (confirmOmrBtn) confirmOmrBtn.onclick = closeOmrModal;
  const omrBackdrop = document.getElementById('modal-omr-backdrop');
  if (omrBackdrop) omrBackdrop.onclick = closeOmrModal;

  // QR 모달 열기 버튼 (티켓 화면의 파란 버튼)
  const openQrBtn = document.getElementById('btn-open-qr');
  if (openQrBtn) {
    openQrBtn.onclick = () => openQrModal();
  }

  // QR 닫기 버튼들
  const closeQrBtn = document.getElementById('btn-close-qr');
  if (closeQrBtn) closeQrBtn.onclick = closeQrModal;
  const confirmQrBtn = document.getElementById('btn-confirm-qr');
  if (confirmQrBtn) confirmQrBtn.onclick = closeQrModal;
  const qrBackdrop = document.getElementById('modal-qr-backdrop');
  if (qrBackdrop) qrBackdrop.onclick = closeQrModal;

  // =================================================================
  // 10. [QR 당첨확인 스캐너 모달] 제어 로직 등록
  // =================================================================
  const openQrCheckBtn = document.getElementById('btn-open-qr-check');
  if (openQrCheckBtn) {
    openQrCheckBtn.onclick = () => openQrCheckModal();
  }

  const closeQrCheckBtn = document.getElementById('btn-close-qr-check');
  if (closeQrCheckBtn) closeQrCheckBtn.onclick = closeQrCheckModal;
  const confirmQrCheckBtn = document.getElementById('btn-confirm-qr-check');
  if (confirmQrCheckBtn) confirmQrCheckBtn.onclick = closeQrCheckModal;
  const qrCheckBackdrop = document.getElementById('modal-qr-check-backdrop');
  if (qrCheckBackdrop) qrCheckBackdrop.onclick = closeQrCheckModal;

  // 카메라 시작 버튼
  const startCameraBtn = document.getElementById('btn-start-camera');
  if (startCameraBtn) {
    startCameraBtn.onclick = () => startCameraScanner();
  }

  // URL 수동 조회 버튼
  const manualCheckBtn = document.getElementById('btn-manual-qr-check');
  if (manualCheckBtn) {
    manualCheckBtn.onclick = () => {
      const input = document.getElementById('input-qr-url');
      if (input && input.value.trim()) {
        processQrData(input.value.trim());
      } else {
        alert('복권 QR 링크 또는 번호를 입력해주세요.');
      }
    };
  }

  // 예시 번호 테스트 버튼
  const demoCheckBtn = document.getElementById('btn-demo-qr-check');
  if (demoCheckBtn) {
    demoCheckBtn.onclick = () => {
      // 1245회 기준 5등 1개 + 낙첨 포함 예시 데이터
      const demoUrl = 'http://m.dhlottery.co.kr/?v=1245m040511192733071218273441010309152230041119202530020814212835';
      const input = document.getElementById('input-qr-url');
      if (input) input.value = demoUrl;
      processQrData(demoUrl);
    };
  }

  // 낙첨 후킹 버튼: [이번 주 나만의 5게임 추출하기 ›]
  const hookExtractBtn = document.getElementById('btn-qr-hook-extract');
  if (hookExtractBtn) {
    hookExtractBtn.onclick = () => {
      closeQrCheckModal();
      showScreen('main');
      const formCard = document.getElementById('lotto-extract-card');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const birthInput = document.getElementById('birth-date');
      if (birthInput) birthInput.focus();
    };
  }
}

// =================================================================
// 10. [QR 당첨확인 스캐너 & 채점기] 핵심 구현
// =================================================================
let qrVideoStream = null;
let qrScanAnimId = null;

function openQrCheckModal() {
  const modal = document.getElementById('modal-qr-check');
  if (!modal) return;
  modal.style.display = 'flex';

  // 결과 카드 초기화 및 프레임 복원
  const resultCard = document.getElementById('qr-scan-result-card');
  if (resultCard) resultCard.style.display = 'none';

  const scannerFrame = document.getElementById('camera-scanner-frame');
  const manualBox = document.querySelector('.manual-check-box');
  if (scannerFrame) scannerFrame.style.display = 'flex';
  if (manualBox) manualBox.style.display = 'flex';

  // 대표님 지침 반영: 팝업 열림과 동시에 별도 절차 없이 카메라 즉시 자동 스캔 시작!
  startCameraScanner();
}

function closeQrCheckModal() {
  stopCameraScanner();
  const modal = document.getElementById('modal-qr-check');
  if (modal) modal.style.display = 'none';
}

async function startCameraScanner() {
  const video = document.getElementById('qr-video-feed');
  const placeholder = document.getElementById('scanner-placeholder');
  const guideText = document.getElementById('scanner-guide-text');
  const canvas = document.getElementById('qr-scan-canvas');
  if (!video || !canvas) return;

  if (guideText) guideText.textContent = '카메라를 연결하는 중입니다...';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (placeholder) placeholder.style.display = 'flex';
    if (guideText) guideText.textContent = '카메라를 지원하지 않는 브라우저입니다. 아래 입력을 이용해 주세요.';
    return;
  }

  try {
    // 1. 장치 목록 조회: Mirametrix Virtual Camera 같은 가상 카메라 필터링
    let constraints = { video: { facingMode: { ideal: 'environment' } } };

    if (navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');

        // 가상 카메라('mirametrix', 'virtual', 'obs') 제외하고 실제 웹캠 우선 선택
        const realCameras = videoDevices.filter(d => {
          const label = (d.label || '').toLowerCase();
          return !label.includes('mirametrix') && !label.includes('virtual') && !label.includes('obs');
        });

        if (realCameras.length > 0) {
          constraints = { video: { deviceId: { exact: realCameras[0].deviceId } } };
        }
      } catch (devErr) {
        console.warn('디바이스 목록 조회 스킵:', devErr);
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    qrVideoStream = stream;
    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    video.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    await video.play();
    qrScanAnimId = requestAnimationFrame(scanQrFrame);
  } catch (err) {
    console.warn('우선 카메라 연결 실패, 기본 비디오로 폴백 재시도:', err);
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
      qrVideoStream = fallbackStream;
      video.srcObject = fallbackStream;
      video.setAttribute('playsinline', true);
      video.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      await video.play();
      qrScanAnimId = requestAnimationFrame(scanQrFrame);
    } catch (e2) {
      console.warn('모든 카메라 접근 실패:', e2);
      if (placeholder) placeholder.style.display = 'flex';
      if (guideText) guideText.textContent = '카메라 영상을 불러올 수 없습니다. 아래 [예시 번호 테스트]를 눌러보세요!';
    }
  }
}

function stopCameraScanner() {
  if (qrScanAnimId) {
    cancelAnimationFrame(qrScanAnimId);
    qrScanAnimId = null;
  }
  if (qrVideoStream) {
    qrVideoStream.getTracks().forEach(track => track.stop());
    qrVideoStream = null;
  }
  const video = document.getElementById('qr-video-feed');
  if (video) {
    video.pause();
    video.srcObject = null;
    video.style.display = 'none';
  }
  const placeholder = document.getElementById('scanner-placeholder');
  if (placeholder) placeholder.style.display = 'flex';
}

function scanQrFrame() {
  const video = document.getElementById('qr-video-feed');
  const canvas = document.getElementById('qr-scan-canvas');
  if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
    qrScanAnimId = requestAnimationFrame(scanQrFrame);
    return;
  }

  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (window.jsQR) {
    const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });
    if (code && code.data) {
      stopCameraScanner();
      processQrData(code.data);
      return;
    }
  }

  qrScanAnimId = requestAnimationFrame(scanQrFrame);
}

/**
 * 동행복권 QR 데이터 파싱 및 당첨 결과 대조
 */
function processQrData(qrStr) {
  // 동행복권 QR URL 파싱: 예) http://m.dhlottery.co.kr/?v=1245m040511192733...
  let targetRound = LATEST_DRAW.round;
  let parsedGames = [];

  const vMatch = qrStr.match(/[?&]v=(\d+)/i) || qrStr.match(/(\d{3,4})/);
  if (vMatch) {
    const rNum = parseInt(vMatch[1].slice(0, 4), 10);
    if (rNum >= 1000 && rNum <= 2000) targetRound = rNum;
  }

  // 번호 추출 (m 다음에 연속된 2자리 숫자 쌍들)
  const mIndex = qrStr.indexOf('m');
  const numsPart = mIndex !== -1 ? qrStr.substring(mIndex + 1) : qrStr.replace(/[^0-9]/g, '');

  if (numsPart.length >= 12) {
    // 12자리씩 1게임(6개 번호)으로 분할
    const gameChunks = numsPart.match(/.{1,12}/g) || [];
    gameChunks.forEach((chunk, idx) => {
      if (chunk.length === 12 && idx < 5) {
        const balls = (chunk.match(/.{1,2}/g) || []).map(b => parseInt(b, 10)).filter(n => n >= 1 && n <= 45);
        if (balls.length === 6) {
          parsedGames.push({
            label: String.fromCharCode(65 + idx),
            numbers: balls.sort((a, b) => a - b)
          });
        }
      }
    });
  }

  // 번호 파싱 실패 시 기본 5게임 생성 (폴백)
  if (parsedGames.length === 0) {
    parsedGames = [
      { label: 'A', numbers: [4, 5, 11, 19, 27, 33] },
      { label: 'B', numbers: [7, 12, 18, 27, 34, 41] },
      { label: 'C', numbers: [1, 3, 9, 15, 22, 30] },
      { label: 'D', numbers: [4, 11, 19, 20, 25, 30] },
      { label: 'E', numbers: [2, 8, 14, 21, 28, 35] }
    ];
  }

  // 당첨번호 기준 (해당 회차가 1245회면 LATEST_DRAW, 아니면 기준 당첨번호 대조)
  const winNumbers = new Set(LATEST_DRAW.numbers);
  const bonusNumber = LATEST_DRAW.bonus;

  let bestRank = '낙첨';
  let bestRankPrize = 0;
  let wonCount = 0;

  const evaluatedGames = parsedGames.map(game => {
    const matchCount = game.numbers.filter(n => winNumbers.has(n)).length;
    const hasBonus = game.numbers.includes(bonusNumber);

    let rankText = '낙첨';
    let isWin = false;
    if (matchCount === 6) { rankText = '1등 당첨!'; isWin = true; }
    else if (matchCount === 5 && hasBonus) { rankText = '2등 당첨!'; isWin = true; }
    else if (matchCount === 5) { rankText = '3등 당첨'; isWin = true; }
    else if (matchCount === 4) { rankText = '4등 (5만원)'; isWin = true; }
    else if (matchCount === 3) { rankText = '5등 (5천원)'; isWin = true; }

    if (isWin) wonCount++;

    return {
      label: game.label,
      numbers: game.numbers,
      matchCount,
      hasBonus,
      rankText,
      isWin
    };
  });

  renderQrCheckResult(targetRound, evaluatedGames, wonCount);
}

function renderQrCheckResult(round, games, wonCount) {
  const resultCard = document.getElementById('qr-scan-result-card');
  const badgeWrap = document.getElementById('qr-result-badge-wrap');
  const listContainer = document.getElementById('qr-result-games-list');
  const hookTitle = document.getElementById('qr-hook-title');
  const hookDesc = document.getElementById('qr-hook-desc');

  if (!resultCard || !badgeWrap || !listContainer) return;

  const winNumbers = new Set(LATEST_DRAW.numbers);
  const isAnyWin = wonCount > 0;

  // 헤더 뱃지 및 [다시 스캔하기] 액션 바
  badgeWrap.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2px;">
      <span style="font-size:0.7rem; color:#94a3b8; font-weight:700;">제${round}회 동행복권 당첨 확인</span>
      <strong style="font-size:0.92rem; color:#fff;">당첨 결과: ${isAnyWin ? `총 ${wonCount}게임 당첨 축하합니다!` : '아쉽게도 낙첨되었습니다.'}</strong>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <button type="button" id="btn-rescan-qr" class="btn-rescan-chip" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; font-size:0.68rem; padding:3px 8px; border-radius:4px; cursor:pointer;">다시 스캔</button>
      <span class="qr-result-badge ${isAnyWin ? 'win' : 'lose'}">
        ${isAnyWin ? '당첨 축하' : '낙첨'}
      </span>
    </div>
  `;

  // 5게임 목록
  listContainer.innerHTML = games.map(g => `
    <div class="scan-game-row">
      <span class="scan-game-label">${g.label}</span>
      <div class="scan-game-balls">
        ${g.numbers.map(n => `
          <span class="scan-mini-ball ${winNumbers.has(n) ? 'match' : ''}">${n}</span>
        `).join('')}
      </div>
      <span class="scan-game-rank ${g.isWin ? 'win' : ''}">${g.rankText}</span>
    </div>
  `).join('');

  // 후킹 문구 업데이트
  if (isAnyWin) {
    if (hookTitle) hookTitle.textContent = '축하합니다! 다음 회차도 황금 행운을 이어가세요.';
    if (hookDesc) hookDesc.textContent = '내 생년월일의 타고난 기운과 상생 오행으로 다음 회차 1등 번호를 정밀 추출합니다.';
  } else {
    if (hookTitle) hookTitle.textContent = '기계식 무작위 자동 번호는 이제 그만!';
    if (hookDesc) hookDesc.textContent = '낙첨의 아쉬움을 뒤로하고, 내 타고난 사주 기운으로 맞춘 1등 도전 5게임을 확인해 보세요.';
  }

  // 대표님 지침: 결과가 뜨면 흉물스러운 카메라 프레임(빨간 X)을 싹 치워버림!
  const scannerFrame = document.getElementById('camera-scanner-frame');
  const manualBox = document.querySelector('.manual-check-box');
  if (scannerFrame) scannerFrame.style.display = 'none';
  if (manualBox) manualBox.style.display = 'none';
  stopCameraScanner(); // 카메라 피드 즉시 종료

  resultCard.style.display = 'flex';
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // [↺ 다시 스캔] 버튼 클릭 시 카메라 프레임 다시 열기
  const rescanBtn = document.getElementById('btn-rescan-qr');
  if (rescanBtn) {
    rescanBtn.onclick = () => {
      resultCard.style.display = 'none';
      if (scannerFrame) scannerFrame.style.display = 'flex';
      if (manualBox) manualBox.style.display = 'flex';
      startCameraScanner();
    };
  }
}

// DOM 로드 완료 시 모달 시스템 초기화 (안전 실행 패턴)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initModalSystem();
    renderSavedCount();
  });
} else {
  initModalSystem();
  renderSavedCount();
}

/**
 * 실생활 운명수 원터치 클립보드 복사 함수
 */
window.copyToClipboard = function(text, btnElement) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showCopiedFeedback(btnElement);
    }).catch(() => fallbackCopy(text, btnElement));
  } else {
    fallbackCopy(text, btnElement);
  }
};

function showCopiedFeedback(btn) {
  if (!btn) return;
  const original = btn.innerHTML;
  btn.innerHTML = '복사 완료!';
  btn.classList.add('copied');
  setTimeout(() => {
    btn.innerHTML = original;
    btn.classList.remove('copied');
  }, 1800);
}

function fallbackCopy(text, btn) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showCopiedFeedback(btn);
  } catch (err) {
    console.error('복사 실패:', err);
  }
  document.body.removeChild(ta);
}



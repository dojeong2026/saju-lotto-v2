/**
 * 사주로또 v3 - 차별성 극대화 랜딩 (v2.1 기반)
 *  - A안: 슬림 당첨현황 최상단 → ONLY 3 띠 → 탭 → 운명수 맛보기 → 입력폼
 * (이하 v2 원본 주석)
 * 사주로또 v2 - 모바일 한 화면 핏 & 직관적 의미 타이틀 엔진
 * 1. A자선/B자선 삭제 -> 의미 있는 핵심 타이틀로 대체
 * 2. 분석 완료 시 사주 폼 자동 접기 (모바일 1화면 핏)
 * 3. 5개 게임 압축 렌더링
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

const state = {
  currentTrack: 'lotto',
  sajuResult: null,
  selectedAmount: 5000,
  sheets: [],
  currentSheetIndex: 0,
  isAllSheetsView: false,
  savedNumbers: JSON.parse(localStorage.getItem('saju_lotto_v2_saved') || '[]'),
  savedProfile: JSON.parse(localStorage.getItem('saju_lotto_v2_profile') || 'null')
};

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
  setText('btn-submit-text', `🎰 이번 주 ${target}회 행운 5게임 추출하기`);
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
    roundTagElem.textContent = `다음 회차(${currentTargetRound}회) 판매 현황`;
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
  if (destinyScreen) destinyScreen.style.display = (screenName === 'destiny') ? 'block' : 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ⭐ 대표님 지침 2: 재방문자 사주 자동 채우기 (Auto-Restore)
function restoreSavedProfileToForm() {
  const profile = state.savedProfile;
  if (!profile || !profile.birthDate) return;

  const dateInput = document.getElementById('birth-date');
  const hourInput = document.getElementById('birth-hour');
  const cityInput = document.getElementById('birth-city');
  const genderInput = document.getElementById('gender');
  const calTypeInput = document.getElementById('calendar-type');
  const leapInput = document.getElementById('is-leap-month');
  const banner = document.getElementById('saved-profile-banner');
  const bannerText = document.getElementById('saved-profile-text');

  if (dateInput) dateInput.value = profile.birthDate;
  if (hourInput && !isNaN(profile.birthHour)) hourInput.value = profile.birthHour;
  if (cityInput && profile.birthCity) cityInput.value = profile.birthCity;
  if (genderInput && profile.gender) genderInput.value = profile.gender;
  if (calTypeInput && profile.calendarType) calTypeInput.value = profile.calendarType;
  if (leapInput) leapInput.checked = !!profile.isLeapMonth;

  // 세그먼트 버튼 UI active 상태 동기화
  document.querySelectorAll('.seg-toggle').forEach(group => {
    const targetVal = (group.dataset.target === 'calendar-type') ? (profile.calendarType || 'solar') : profile.gender;
    group.querySelectorAll('.seg-btn').forEach(btn => {
      const match = (btn.dataset.value === targetVal);
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-pressed', match ? 'true' : 'false');
    });
  });

  const isLunar = profile.calendarType === 'lunar';
  const leapWrap = document.getElementById('leap-month-wrap');
  const dateLabel = document.getElementById('birth-date-label');
  if (leapWrap) leapWrap.style.display = isLunar ? 'inline-flex' : 'none';
  if (dateLabel) dateLabel.textContent = isLunar ? '생년월일 (음력)' : '생년월일 (양력)';

  // 재방문 알림 배너 노출
  if (banner) {
    banner.style.display = 'flex';
    if (bannerText) {
      const calName = isLunar ? '음력' : '양력';
      const genderName = profile.gender === 'male' ? '남' : (profile.gender === 'female' ? '여' : '');
      bannerText.innerHTML = `저장된 내 사주가 자동 적용되었습니다 (<strong>${profile.birthDate} ${calName} · ${genderName}</strong>)`;
    }
  }

  // "새로 입력 🔄" 버튼 바인딩
  const resetBtn = document.getElementById('btn-reset-profile');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (dateInput) dateInput.value = '';
      if (hourInput) hourInput.selectedIndex = 0;
      if (cityInput) cityInput.selectedIndex = 0;
      if (genderInput) genderInput.value = '';
      if (calTypeInput) calTypeInput.value = 'solar';
      if (leapInput) leapInput.checked = false;

      document.querySelectorAll('.seg-toggle').forEach(group => {
        group.querySelectorAll('.seg-btn').forEach((btn, idx) => {
          const isFirst = (idx === 0);
          btn.classList.toggle('active', isFirst);
          btn.setAttribute('aria-pressed', isFirst ? 'true' : 'false');
        });
      });
      if (leapWrap) leapWrap.style.display = 'none';
      if (dateLabel) dateLabel.textContent = '생년월일 (양력)';
      if (banner) banner.style.display = 'none';
      if (dateInput) dateInput.focus();
    };
  }
}

// ⭐ 대표님 지침 3: 결과 화면 상단 [사주 명리 정밀 진단 & 오행 숫자 처방 카드] 동적 갱신
function updateDiagnosisCard(saju) {
  if (!saju) return;

  const card = document.getElementById('saju-summary-bar');
  if (card) card.style.display = 'block';

  const titleEl = document.getElementById('diagnosis-title');
  if (titleEl) {
    titleEl.innerText = `${saju.dateStr} 사주 명리 정밀 진단`;
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
  renderDrawBoard();
  updateSalesStatus();
  renderSavedCount();
  setupNavigation();
  setupForm();
  restoreSavedProfileToForm(); // 재방문자 사주 자동 채우기
  initModalSystem();

  // 첫 화면은 무조건 로또 추출 메인 화면으로 시작!
  showScreen('main');

  // URL 파라미터 기반 검증 데모 지원 (?demo=ticket 또는 ?demo=destiny)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('demo') === 'ticket') {
    runAnalysis({ birthDate: '1985-05-15', birthHour: 12, birthCity: 'seoul', gender: 'male' }, 'results');
  } else if (urlParams.get('demo') === 'destiny') {
    runAnalysis({ birthDate: '1985-05-15', birthHour: 12, birthCity: 'seoul', gender: 'male' }, 'destiny');
  }

  // 1분 주기 판매현황 자동 갱신
  setInterval(updateSalesStatus, 60000);
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
    const profile = readFormProfile();

    if (profile.birthDate && !isNaN(profile.birthHour) && profile.birthCity && profile.gender) {
      if (!resolveSolarDate(profile)) {
        alert('입력하신 음력 날짜를 확인해 주세요. (해당 연도에 없는 날짜이거나 윤달이 없는 달입니다)');
        return;
      }
      localStorage.setItem('saju_lotto_v2_profile', JSON.stringify(profile));
      state.savedProfile = profile;
      runAnalysis(profile, 'destiny');
    } else if (state.savedProfile) {
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

// 폼에서 사주 정보 읽기 (양력/음력·윤달 포함)
function readFormProfile() {
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const leapEl = document.getElementById('is-leap-month');
  return {
    birthDate: val('birth-date'),
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
      const profile = readFormProfile();

      if (!profile.birthDate) return;
      if (!profile.gender) {
        alert('성별(남/여)을 선택해 주세요.');
        return;
      }
      if (!resolveSolarDate(profile)) {
        alert('입력하신 음력 날짜를 확인해 주세요. (해당 연도에 없는 날짜이거나 윤달이 없는 달입니다)');
        return;
      }
      localStorage.setItem('saju_lotto_v2_profile', JSON.stringify(profile));
      state.savedProfile = profile;

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

    showScreen(targetScreen);
  } catch (err) {
    console.error('사주 로또 분석 및 렌더링 오류:', err);
  }
}

function calculateSaju(dateStr, hour, city, gender, sheetVariant = 0) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const cityOffset = CITY_TIME_OFFSETS[city] || -30;
  const baseSeed = (year * 365 + month * 31 + day + hour + Math.abs(cityOffset));
  const seed = baseSeed + (sheetVariant * 137);

  const rawOhaeng = {
    wood:  15 + (seed * 7) % 25, fire:  15 + (seed * 11) % 25,
    earth: 15 + (seed * 13) % 25, metal: 15 + (seed * 17) % 25, water: 15 + (seed * 19) % 25
  };
  const total = rawOhaeng.wood + rawOhaeng.fire + rawOhaeng.earth + rawOhaeng.metal + rawOhaeng.water;
  const ohaengPercent = {
    wood:  Math.round((rawOhaeng.wood / total) * 100),
    fire:  Math.round((rawOhaeng.fire / total) * 100),
    earth: Math.round((rawOhaeng.earth / total) * 100),
    metal: Math.round((rawOhaeng.metal / total) * 100),
    water: 100 - (Math.round((rawOhaeng.wood / total) * 100) + Math.round((rawOhaeng.fire / total) * 100) + Math.round((rawOhaeng.earth / total) * 100) + Math.round((rawOhaeng.metal / total) * 100))
  };

  let minElement = 'wood', maxElement = 'wood';
  for (let k in ohaengPercent) {
    if (ohaengPercent[k] < ohaengPercent[minElement]) minElement = k;
    if (ohaengPercent[k] > ohaengPercent[maxElement]) maxElement = k;
  }

  const SEONCHEON_MAP = { wood: [3, 8], fire: [2, 7], earth: [5, 10], metal: [4, 9], water: [1, 6] };
  const HUCHEON_MAP   = { wood: [3, 4], fire: [9], earth: [2, 5, 8], metal: [6, 7], water: [1] };
  const seoncheon = SEONCHEON_MAP[minElement];
  const hucheon = HUCHEON_MAP[minElement];

  // 5게임 구조: A~E 명확한 분류 및 친숙하고 쉬운 설명
  const games = [];
  const minObj = OHAENG_INFO[minElement];
  const parentMap = { wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal' };
  const parentElem = parentMap[minElement];
  const minBalls = minObj.balls;
  const parentBalls = OHAENG_INFO[parentElem].balls;
  const RECENT_WINNING = LATEST_DRAW.numbers; // 직전 회차 당첨번호 (자동 연동)

  const gameMeta = [
    { tag: 'A', title: `부족한 ${minObj.name} 기운 보강 조합`, desc: `사주 맞춤수 + 1등 최다 당첨 번호` },
    { tag: 'B', title: `선천수·후천수 길수 조합`, desc: `태어난 날 행운수 + 역대 인기 번호` },
    { tag: 'C', title: `${OHAENG_INFO[parentElem].name}·${minObj.name} 상생 순환 조합`, desc: `기운을 돕는 상생수 + 자주 나온 번호` },
    { tag: 'D', title: `최신 회차 흐름 연계 조합`, desc: `지난주 당첨 흐름수 + 내 사주 보완수` },
    { tag: 'E', title: `5대 오행 황금 밸런스 조합`, desc: `5가지 기운 골고루 + 고른 번호대 조합` }
  ];

  // 1~45번 전체 대역(10번대, 20번대, 30번대, 40번대) 고른 번호 분배
  const rawGames = [
    // Game A: 부족한 기운 보강 (저번대, 중번대, 고번대에서 고르게 골라 담기)
    [
      minBalls[seed % 3], // 1~15 저번대
      minBalls[3 + (seed % 3)], // 16~30 중번대
      minBalls[6 + (seed % 3)], // 31~45 고번대
      HOT_NUMBERS[(seed + 1) % HOT_NUMBERS.length],
      HOT_NUMBERS[(seed + 4) % HOT_NUMBERS.length],
      HOT_NUMBERS[(seed + 7) % HOT_NUMBERS.length]
    ],
    // Game B: 선천수·후천수 길수
    [
      minBalls[(seed + 2) % minBalls.length],
      minBalls[(seed + 5) % minBalls.length],
      HOT_NUMBERS[(seed + 2) % HOT_NUMBERS.length],
      HOT_NUMBERS[(seed + 8) % HOT_NUMBERS.length],
      HOT_NUMBERS[(seed + 12) % HOT_NUMBERS.length],
      30 + ((seed * 7) % 15) + 1
    ],
    // Game C: 상생 순환 조합
    [
      parentBalls[seed % 4],
      parentBalls[4 + (seed % 5)],
      minBalls[(seed + 1) % 4],
      minBalls[4 + ((seed + 2) % 5)],
      HOT_NUMBERS[(seed + 3) % HOT_NUMBERS.length],
      HOT_NUMBERS[(seed + 9) % HOT_NUMBERS.length]
    ],
    // Game D: 최신 회차 흐름 연계
    [
      RECENT_WINNING[seed % RECENT_WINNING.length],
      RECENT_WINNING[(seed + 2) % RECENT_WINNING.length],
      minBalls[(seed + 3) % minBalls.length],
      minBalls[(seed + 7) % minBalls.length],
      HOT_NUMBERS[(seed + 5) % HOT_NUMBERS.length],
      HOT_NUMBERS[(seed + 10) % HOT_NUMBERS.length]
    ],
    // Game E: 5대 오행 황금 밸런스 (오행별 1개씩 고른 분포)
    [
      OHAENG_INFO.wood.balls[(seed + 1) % OHAENG_INFO.wood.balls.length],
      OHAENG_INFO.fire.balls[(seed + 2) % OHAENG_INFO.fire.balls.length],
      OHAENG_INFO.earth.balls[(seed + 3) % OHAENG_INFO.earth.balls.length],
      OHAENG_INFO.metal.balls[(seed + 4) % OHAENG_INFO.metal.balls.length],
      OHAENG_INFO.water.balls[(seed + 5) % OHAENG_INFO.water.balls.length],
      HOT_NUMBERS[(seed + 6) % HOT_NUMBERS.length]
    ]
  ];

  for (let g = 0; g < 5; g++) {
    let u6 = Array.from(new Set(rawGames[g])).map(n => ((n - 1) % 45) + 1).slice(0, 6);
    let fillIdx = 0;
    while (u6.length < 6) {
      let cand = HOT_NUMBERS[fillIdx % HOT_NUMBERS.length];
      if (!u6.includes(cand)) u6.push(cand);
      fillIdx++;
    }
    u6.sort((a, b) => a - b);
    games.push({
      numbers: u6,
      label: gameMeta[g].tag,
      tag: gameMeta[g].tag,
      title: gameMeta[g].title,
      desc: gameMeta[g].desc
    });
  }

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
  const luckyTimeObj = TIMES[seed % TIMES.length];

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
  const dayMasterIdx = Math.abs((year * 5 + month * 7 + day) % 10);
  const dayMaster = CHEONGAN[dayMasterIdx];

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
      divider.innerHTML = `<span>🎟️ 제${actualSheetIndex + 1}장 (행운 5게임)</span><span style="color:#64748b; font-size:0.75rem;">${actualSheetIndex * 5 + 1}~${actualSheetIndex * 5 + 5}게임</span>`;
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

  // 4. [추가 5게임 더 뽑기] 리워드 광고(5초) 시청 후 추가 언락 로직
  const addSheetBtn = document.getElementById('btn-add-sheet');
  if (addSheetBtn) {
    addSheetBtn.onclick = () => {
      if (!state.savedProfile) return;
      if (addSheetBtn.dataset.loading === 'true') return;

      const origHtml = addSheetBtn.innerHTML;
      addSheetBtn.dataset.loading = 'true';
      addSheetBtn.style.opacity = '0.75';
      let sec = 3;
      addSheetBtn.innerHTML = `🎬 <strong>스폰서 광고 시청 중... (${sec}초)</strong>`;

      const timer = setInterval(() => {
        sec--;
        if (sec > 0) {
          addSheetBtn.innerHTML = `🎬 <strong>스폰서 광고 시청 중... (${sec}초)</strong>`;
        } else {
          clearInterval(timer);
          addSheetBtn.dataset.loading = 'false';
          addSheetBtn.style.opacity = '1';
          addSheetBtn.innerHTML = origHtml;

          const nextIdx = state.sheets.length;
          const sp = state.savedProfile;
          const newSheet = calculateSaju(resolveSolarDate(sp) || sp.birthDate, sp.birthHour, sp.birthCity, sp.gender, nextIdx);
          state.sheets.push(newSheet);
          state.currentSheetIndex = nextIdx;
          state.isAllSheetsView = false;
          renderLottoView();

          // 영자 실장 멘트 갱신
          const briefingElem = document.getElementById('youngja-text');
          if (briefingElem) {
            briefingElem.innerHTML = `"대표님을 위한 <strong>제${nextIdx + 1}장(+5게임)</strong>의 새로운 오행 조화수를 성공적으로 언락했습니다! (총 ${state.sheets.length * 5}게임)"`;
          }
          document.getElementById('compact-ticket').scrollIntoView({ behavior: 'smooth' });
        }
      }, 1000);
    };
  }

  // 5. 번호 저장 버튼 바인딩 (현재 뽑힌 모든 장수 저장)
  const saveBtn = document.getElementById('btn-save-numbers');
  if (saveBtn) {
    saveBtn.onclick = () => {
      if (!state.sheets || state.sheets.length === 0) return;
      const allGames = [];
      state.sheets.forEach(sheet => {
        sheet.games.forEach(g => allGames.push(g.numbers));
      });
      const newRecord = {
        id: Date.now(),
        date: new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        fullDate: new Date().toLocaleString('ko-KR'),
        round: getTargetRound(),
        totalSheets: state.sheets.length,
        totalGames: allGames.length,
        sheets: JSON.parse(JSON.stringify(state.sheets))
      };
      state.savedNumbers.unshift(newRecord);
      localStorage.setItem('saju_lotto_v2_saved', JSON.stringify(state.savedNumbers.slice(0, 30)));
      renderSavedCount();

      // 저장 완료 후 보관함 열기 여부
      if (confirm(`총 ${state.sheets.length}장(${allGames.length}게임) 번호가 내 폰에 안전하게 보관되었습니다!\n\n지금 바로 [내 번호 보관함]을 열어 확인하시겠습니까?`)) {
        openVaultModal();
      }
    };
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
  const destinyBox = document.getElementById('destiny-content');
  if (!destinyBox) return;

  const dm = data.dayMaster || { name: '壬水(임수)', title: '광활한 큰 바다와 강', desc: '무한한 지혜와 포용력' };
  const compass = data.destinyCompass || { dir: '남쪽(南)', color: '적색·자색 (화기운)', season: '여름' };
  const lacking = data.lackingElement || { name: '화(火)', symbol: '열정·활력' };
  const primary = data.primaryElement || { name: '수(水)', symbol: '지혜·유연' };
  const birthStr = state.savedProfile ? state.savedProfile.birthDate : '1984.10.04';
  const certId = 'SJ-' + (state.savedProfile ? state.savedProfile.birthDate.replace(/-/g, '') : '19841004') + '-VIP';

  // 오행 5대 바 HTML 생성
  const ohaengList = [
    { key: 'wood',  name: '목(木)', fill: 'fill-wood' },
    { key: 'fire',  name: '화(火)', fill: 'fill-fire' },
    { key: 'earth', name: '토(土)', fill: 'fill-earth' },
    { key: 'metal', name: '금(金)', fill: 'fill-metal' },
    { key: 'water', name: '수(水)', fill: 'fill-water' }
  ];
  const ohaengBarsHtml = ohaengList.map(item => {
    const pct = (data.ohaengPercent && data.ohaengPercent[item.key]) || 20;
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

  destinyBox.innerHTML = `
    <!-- [제1주제 화면]: 사주 평가 (나의 본원 기운 노출) -->
    <div class="destiny-screen-card" id="destiny-card-1">
      <div class="card-header-row">
        <span class="card-step-badge">🔮 제1주제 · 사주 평가</span>
        <span class="card-progress-counter">1 / 6</span>
      </div>
      <div>
        <h3 class="card-main-title">나의 본원(日干) 기운 노출</h3>
        <p class="card-subtitle">우주 순환 속에서 부여받은 타고난 기질과 영명한 그릇</p>
      </div>
      
      <div class="card-body-content">
        <div class="day-master-showcase">
          <div class="day-master-emblem">🌊</div>
          <div class="day-master-title-kor">${dm.name}</div>
          <div class="day-master-nick">${dm.title}</div>
          <div class="day-master-desc-box">
            "대표님은 <strong>${dm.name}</strong>의 영명한 기운을 타고났습니다. 
            ${dm.desc}을 품고 있어, 주변 사람들에게 깊은 신뢰를 얻으며 큰 결실을 맺을 천부적 인물입니다."
          </div>
        </div>

        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px; font-size: 0.82rem; line-height: 1.6;">
          <div style="color: #fbbf24; font-weight: 800; margin-bottom: 4px;">⚖️ 오행 균형 조화 진단</div>
          현재 사주는 <strong>${primary.name}</strong> 기운이 든든하게 받쳐주고 있으나, 
          상대적으로 <strong>${lacking.name}</strong> 기운이 부족하여 보강이 필요합니다. 
          따라서 <strong>${lacking.name}의 수리(數理)와 방위</strong>를 취하면 재물과 결실운이 비약적으로 열립니다.
        </div>
      </div>

      <div class="card-next-scroll-indicator">
        <span>스크롤을 내리면 <strong>[천부명반]</strong>이 나타납니다</span>
        <span class="scroll-arrow-bounce">⬇️</span>
      </div>
    </div>

    <!-- [제2주제 화면]: 천부명반 (5대 오행 기운 & 수호 나침반) -->
    <div class="destiny-screen-card" id="destiny-card-2">
      <div class="card-header-row">
        <span class="card-step-badge">🧭 제2주제 · 천부명반(天府命盤)</span>
        <span class="card-progress-counter">2 / 6</span>
      </div>
      <div>
        <h3 class="card-main-title">5대 오행 분포 &amp; 수호 나침반</h3>
        <p class="card-subtitle">나를 지켜주는 우주 방위와 상생 에너지 지형도</p>
      </div>

      <div class="card-body-content">
        <div class="ohaeng-bars-wrapper">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.78rem; font-weight: 800; color: #94a3b8;">5대 오행(五行) 에너지 비율</span>
            <span style="font-size: 0.76rem; color: #fbbf24; font-weight: 700;">${primary.name} 중심 · ${lacking.name} 보강</span>
          </div>
          ${ohaengBarsHtml}
        </div>

        <div class="compass-summary-card">
          <div class="compass-sub-box">
            <span class="compass-sub-label">수호 방위 (吉方)</span>
            <span class="compass-sub-val">${compass.dir}</span>
          </div>
          <div class="compass-sub-box">
            <span class="compass-sub-label">행운의 컬러</span>
            <span class="compass-sub-val" style="color: #38bdf8;">${compass.color}</span>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 10px; font-size: 0.78rem; color: #cbd5e1; line-height: 1.5; text-align: center;">
          💡 중요 미팅이나 계약 시 <strong>${compass.dir}</strong>을 등지거나 마주하면 귀인의 조력을 얻기 유리합니다.
        </div>
      </div>

      <div class="card-next-scroll-indicator">
        <span>스크롤을 내리면 <strong>[평생본원 수리 인증]</strong>이 나타납니다</span>
        <span class="scroll-arrow-bounce">⬇️</span>
      </div>
    </div>

    <!-- [제3주제 화면]: 평생본원 수리 인증 (공식 인증서) -->
    <div class="destiny-screen-card" id="destiny-card-3">
      <div class="card-header-row">
        <span class="card-step-badge">📜 제3주제 · 평생본원 수리 인증</span>
        <span class="card-progress-counter">3 / 6</span>
      </div>
      <div>
        <h3 class="card-main-title">평생본원 공식 수리 인증서</h3>
        <p class="card-subtitle">하늘이 정해준 태생적 고유 명판과 불변의 명리 코드</p>
      </div>

      <div class="card-body-content">
        <div class="certificate-frame">
          <div class="cert-stamp">명리공인<br>정통수리<br>認 證</div>
          <div class="cert-header">
            <div class="cert-title">평생본원 수리 인증서</div>
            <div class="cert-num">발급번호: ${certId}</div>
          </div>
          
          <div style="font-size: 0.8rem; color: #cbd5e1; margin-bottom: 8px;">
            귀하(${birthStr}生)의 명리원식을 분석하여 평생을 관통하는 수리를 다음과 같이 공인합니다.
          </div>

          <div class="cert-number-showcase">
            <div class="cert-number-pill">
              <span class="cert-pill-label">선천 천명수 (根)</span>
              <div class="cert-pill-digits">${data.seoncheon.join(', ')}</div>
            </div>
            <div class="cert-number-pill" style="border-color: rgba(56,189,248,0.4);">
              <span class="cert-pill-label">후천 개운수 (變)</span>
              <div class="cert-pill-digits" style="color: #38bdf8;">${data.hucheon.join(', ')}</div>
            </div>
          </div>

          <div style="font-size: 0.74rem; color: #94a3b8; line-height: 1.45; text-align: left; padding: 0 4px;">
            ※ 본 인증서는 동양 역학의 황금률에 따라 산출된 고유 불변의 수리로 평생 귀하의 삶에 길한 에너지를 부여합니다.
          </div>
        </div>
      </div>

      <div class="card-next-scroll-indicator">
        <span>스크롤을 내리면 <strong>[하도·낙서 주역 비결]</strong>이 나타납니다</span>
        <span class="scroll-arrow-bounce">⬇️</span>
      </div>
    </div>

    <!-- [제4주제 화면]: 하도·낙서 (선천수와 후천수 의미 한 줄 더 명확히 추가) -->
    <div class="destiny-screen-card" id="destiny-card-4">
      <div class="card-header-row">
        <span class="card-step-badge">☯️ 제4주제 · 하도(河圖)·낙서(洛書)</span>
        <span class="card-progress-counter">4 / 6</span>
      </div>
      <div>
        <h3 class="card-main-title">하도·낙서와 선천·후천수 의미</h3>
        <p class="card-subtitle">5천 년 주역 역사가 증명하는 수리의 원천과 개운의 원리</p>
      </div>

      <div class="card-body-content">
        <!-- 선천수 의미 한 줄 강조 -->
        <div class="hado-meaning-box">
          <strong>💡 하도 선천수(${data.seoncheon.join(', ')}):</strong><br>
          하늘이 부여한 <strong>본질의 뿌리이자 불변의 천명 씨앗</strong>으로, 태어날 때 정해진 원초적 생명력의 바탕입니다.
        </div>

        <!-- 후천수 의미 한 줄 강조 -->
        <div class="nakseo-meaning-box">
          <strong>💡 낙서 후천수(${data.hucheon.join(', ')}):</strong><br>
          인간의 선택과 환경을 통해 <strong>운을 열어주는 변화의 열쇠이자 개운의 도구</strong>입니다.
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
          <div style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); padding: 10px; border-radius: 8px; text-align: center;">
            <span style="color: #94a3b8; font-size: 0.72rem;">뿌리 (선천)</span>
            <div style="color: #fbbf24; font-size: 1.4rem; font-weight: 900;">${data.seoncheon.join(', ')}</div>
            <span style="color: #cbd5e1; font-size: 0.7rem;">기운 보강의 씨앗</span>
          </div>
          <div style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); padding: 10px; border-radius: 8px; text-align: center;">
            <span style="color: #94a3b8; font-size: 0.72rem;">도구 (후천)</span>
            <div style="color: #38bdf8; font-size: 1.4rem; font-weight: 900;">${data.hucheon.join(', ')}</div>
            <span style="color: #cbd5e1; font-size: 0.7rem;">운을 트이게 하는 열쇠</span>
          </div>
        </div>

        <div style="font-size: 0.76rem; color: #94a3b8; line-height: 1.5; margin-top: 6px; text-align: center;">
          "선천수로 근본을 다지고, 후천수로 일상을 움직일 때 최상의 발복이 일어납니다."
        </div>
      </div>

      <div class="card-next-scroll-indicator">
        <span>스크롤을 내리면 <strong>[실생활 4대 운명수]</strong>가 나타납니다</span>
        <span class="scroll-arrow-bounce">⬇️</span>
      </div>
    </div>

    <!-- [제5주제 화면]: 실생활 운명수 가이드 (비밀번호, 전화번호, 차량번호, 주거 층수/호수) -->
    <div class="destiny-screen-card" id="destiny-card-5">
      <div class="card-header-row">
        <span class="card-step-badge">💎 제5주제 · 실생활 운명수 가이드</span>
        <span class="card-progress-counter">5 / 6</span>
      </div>
      <div>
        <h3 class="card-main-title">실생활 4대 평생 맞춤 번호</h3>
        <p class="card-subtitle">매일 쓰는 일상 속 번호에 길운의 주파수를 각인하는 방법</p>
      </div>

      <div class="card-body-content">
        <div class="lifetime-number-grid">
          <!-- 1. 통장/도어락 비밀번호 -->
          <div class="lifetime-number-card">
            <div class="lifetime-card-header">
              <span>💳</span>
              <span>평생 금전 비밀번호</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin: 4px 0;">
              <span class="lifetime-big-val">${data.bankPass}</span>
              <button type="button" class="btn-copy-num" onclick="copyToClipboard('${data.bankPass}', this)">복사 📋</button>
            </div>
            <div class="lifetime-sub-principle">통장·카드·도어락 4자리<br>(선천·후천 결실 조합)</div>
          </div>

          <!-- 2. 성공 차량 번호 -->
          <div class="lifetime-number-card">
            <div class="lifetime-card-header">
              <span>🚗</span>
              <span>안전·성공 차량번호</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin: 4px 0;">
              <span class="lifetime-big-val">${data.carNum}</span>
              <button type="button" class="btn-copy-num" onclick="copyToClipboard('${data.carNum}', this)">복사 📋</button>
            </div>
            <div class="lifetime-sub-principle">자동차 번호판 4자리<br>(사고 예방 &amp; 사업 번창)</div>
          </div>

          <!-- 3. 대박 전화번호 뒷자리 -->
          <div class="lifetime-number-card" style="grid-column: span 2;">
            <div class="lifetime-card-header">
              <span>📱</span>
              <span>인생 성공 골드 전화번호 (뒷자리 3선)</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; margin: 8px 0;">
              ${data.phoneNumbers.map((p, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(245,158,11,0.25);">
                  <span style="font-size: 0.78rem; color: #94a3b8;">추천 ${idx + 1}순위</span>
                  <span style="font-size: 1.2rem; font-weight: 900; color: #fbbf24; letter-spacing: 2px;">${p}</span>
                  <button type="button" class="btn-copy-num" onclick="copyToClipboard('${p}', this)">복사 📋</button>
                </div>
              `).join('')}
            </div>
            <div class="lifetime-sub-principle">수리 81 영위격(榮華格) 기반 · 인복과 부귀를 부르는 황금 조합</div>
          </div>

          <!-- 4. 주거 층수 및 동호수 -->
          <div class="lifetime-number-card" style="grid-column: span 2;">
            <div class="lifetime-card-header">
              <span>🏢</span>
              <span>재물이 쌓이는 주거 층수 &amp; 동호수</span>
            </div>
            <div style="font-size: 0.98rem; font-weight: 800; color: #38bdf8; margin: 3px 0;">
              길한 층수: ${data.floorList && data.floorList.length ? data.floorList.join('층, ') + '층' : '2층, 7층, 12층, 17층, 22층'}
            </div>
            <div class="lifetime-sub-principle">
              추천 호수: ${data.roomList && data.roomList.length ? data.roomList.join(', ') : '702호, 1202호, 1702호'} (오행 상생 길운 라인)
            </div>
          </div>
        </div>
      </div>

      <div class="card-next-scroll-indicator">
        <span>스크롤을 내리면 <strong>[인생 수호 비책 가이드]</strong>가 나타납니다</span>
        <span class="scroll-arrow-bounce">⬇️</span>
      </div>
    </div>

    <!-- [제6주제 화면]: 영자 실장의 인생 수호 비책 가이드 -->
    <div class="destiny-screen-card" id="destiny-card-6" style="border-color: rgba(245, 158, 11, 0.6); background: linear-gradient(165deg, #131b2e 0%, #1e1b38 50%, #291a3a 100%);">
      <div class="card-header-row">
        <span class="card-step-badge" style="background: linear-gradient(135deg, rgba(236,72,153,0.25), rgba(245,158,11,0.25)); border-color: #f472b6; color: #f472b6;">🌸 제6주제 · 인생 수호 비책</span>
        <span class="card-progress-counter">6 / 6</span>
      </div>
      <div>
        <h3 class="card-main-title" style="color: #fbbf24;">영자 실장의 인생 수호 비책 가이드</h3>
        <p class="card-subtitle">대표님의 매일을 승리로 이끄는 실천형 마음가짐</p>
      </div>

      <div class="card-body-content">
        <div style="background: rgba(0, 0, 0, 0.3); border-radius: 12px; padding: 14px; border: 1px solid rgba(245,158,11,0.25);">
          <p style="color: #f1f5f9; font-size: 0.86rem; line-height: 1.65; margin-bottom: 10px;">
            "대표님, 운명수는 단순한 숫자가 아니라 매일 내 무의식을 깨우는 <strong>'마인드 앵커(닻)'</strong>입니다.
          </p>
          <ul style="color: #cbd5e1; font-size: 0.8rem; line-height: 1.7; padding-left: 18px; margin: 0;">
            <li><strong>매일 아침 앵커링:</strong> 스마트폰 배경화면에 수호수 <strong>${data.seoncheon.join(', ')}</strong>을 두어 긍정 주파수를 유지하세요.</li>
            <li><strong>중요 결정 시 호흡:</strong> 중요한 결정을 앞두셨을 때는 언제나 수호 방위인 <strong>${compass.dir}</strong>을 향해 1분간 깊게 심호흡하세요.</li>
            <li><strong>행운 컬러 활용:</strong> 중요한 미팅이나 계약 날에는 <strong>${compass.color}</strong> 계열의 타이, 스카프, 소품을 착용해보세요.</li>
          </ul>
        </div>

        <div style="text-align: right; color: #94a3b8; font-size: 0.74rem; margin-top: 4px;">
          — 사주로또 v2.1 VIP 명리 큐레이션 센터
        </div>
      </div>

      <div style="margin-top: 14px;">
        <button type="button" id="btn-goto-lotto-track" class="btn-destiny-to-lotto">
          <span>🍀 이번 주 사주맞춤 로또번호 뽑으러 가기</span>
          <span>→</span>
        </button>
      </div>
    </div>
  `;

  // 6번째 카드 하단의 로또 탭 바로가기 버튼 이벤트 바인딩
  const gotoLottoBtn = document.getElementById('btn-goto-lotto-track');
  if (gotoLottoBtn) {
    gotoLottoBtn.onclick = () => {
      const tabLotto = document.getElementById('tab-lotto');
      if (tabLotto) tabLotto.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
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
  renderVaultList();
  modal.style.display = 'flex';
}

function closeVaultModal() {
  const modal = document.getElementById('modal-vault');
  if (modal) modal.style.display = 'none';
}

function renderVaultList() {
  const container = document.getElementById('vault-list-container');
  if (!container) return;

  if (!state.savedNumbers || state.savedNumbers.length === 0) {
    container.innerHTML = `
      <div class="vault-empty-state">
        <div class="vault-empty-icon">📂</div>
        <div class="vault-empty-text">
          <strong>보관된 번호가 아직 없습니다.</strong><br>
          사주 맞춤 번호를 추출하신 후 <strong>[내 폰에 보관하기]</strong>를 눌러보세요!
        </div>
      </div>
    `;
    return;
  }

  let html = `<div class="vault-items-list">`;

  state.savedNumbers.forEach((item, idx) => {
    const sheets = item.sheets || [{ games: item.games.map((g, gi) => ({ label: String.fromCharCode(65 + gi), numbers: g })) }];
    const totalSheets = item.totalSheets || sheets.length;
    const totalGames = item.totalGames || sheets.reduce((acc, s) => acc + s.games.length, 0);

    const itemRound = item.round || CURRENT_SALE_ROUND;
    const isPending = (itemRound > LATEST_DRAW.round);
    const roundStatusPill = isPending 
      ? `<span class="vault-status-pill pending">⏳ 10.17(토) 추첨대기</span>`
      : `<span class="vault-status-pill finished">✅ 당첨 확인완료</span>`;

    html += `
      <div class="vault-card ${isPending ? 'is-pending' : 'is-finished'}" data-idx="${idx}">
        <div class="vault-card-header">
          <div class="vault-card-header-top">
            <div class="vault-card-title">
              <span class="vault-round-pill">제${itemRound}회</span>
              ${roundStatusPill}
            </div>
            <div class="vault-card-tools">
              <button type="button" class="btn-vault-action btn-vault-omr" data-idx="${idx}" title="OMR 빨간 종이 마킹지 보기">🔴 OMR</button>
              <button type="button" class="btn-vault-action btn-vault-qr" data-idx="${idx}" title="모바일 슬립지 QR 보기">📱 QR</button>
              <button type="button" class="btn-vault-action delete btn-vault-del" data-idx="${idx}" title="삭제">🗑️</button>
            </div>
          </div>
          <div class="vault-time-text">${item.date || item.fullDate || '최근 저장'} (${totalSheets}장 / ${totalGames}게임)</div>
        </div>
        <div class="vault-games-list">
    `;

    // 1장째의 게임들을 기본 표시 (추첨 완료 회차만 LATEST_DRAW와 자동 대조 채점!)
    const firstSheetGames = sheets[0].games || [];
    firstSheetGames.forEach(g => {
      let rightBadge = '';
      let hasWinClass = '';
      let hitCheckFn = () => false;
      let bonusCheckFn = () => false;

      if (isPending) {
        // 아직 추첨 전 회차: 채점하지 않고 추첨 대기 상태 표시
        rightBadge = `<span class="vault-match-badge rank-pending">추첨 대기</span>`;
      } else {
        // 이미 추첨된 회차: 정밀 대조 채점 (3개 이상 당첨인 경우만 당첨 뱃지 노출, 1~2개 일치는 미표시)
        const matchCount = g.numbers.filter(n => LATEST_DRAW.numbers.includes(n)).length;
        const bonusMatch = g.numbers.includes(LATEST_DRAW.bonus);

        if (matchCount === 6) { rightBadge = '<span class="vault-match-badge rank-1">🏆 1등 당첨!</span>'; hasWinClass = 'has-win'; }
        else if (matchCount === 5 && bonusMatch) { rightBadge = '<span class="vault-match-badge rank-2">🥈 2등 당첨!</span>'; hasWinClass = 'has-win'; }
        else if (matchCount === 5) { rightBadge = '<span class="vault-match-badge rank-3">🥉 3등 당첨!</span>'; hasWinClass = 'has-win'; }
        else if (matchCount === 4) { rightBadge = '<span class="vault-match-badge rank-4">✨ 4등 (5만원)</span>'; hasWinClass = 'has-win'; }
        else if (matchCount === 3) { rightBadge = '<span class="vault-match-badge rank-5">🎯 5등 (5천원)</span>'; hasWinClass = 'has-win'; }
        else { rightBadge = ''; } // 1개, 2개, 0개 일치는 혼동 방지를 위해 뱃지 미노출

        hitCheckFn = (n) => LATEST_DRAW.numbers.includes(n);
        bonusCheckFn = (n) => (n === LATEST_DRAW.bonus);
      }

      html += `
        <div class="vault-game-row ${hasWinClass}">
          <div class="vault-game-left">
            <span class="vault-game-tag">${g.label}</span>
            <div class="vault-balls-group">
              ${g.numbers.map(n => {
                const isHit = hitCheckFn(n);
                const isBonus = bonusCheckFn(n);
                const hitClass = isHit ? 'ball-hit' : (isBonus ? 'ball-bonus' : '');
                return `<span class="vault-ball ${getBallClass(n)} ${hitClass}">${n}</span>`;
              }).join('')}
            </div>
          </div>
          <div class="vault-game-right">
            ${rightBadge}
          </div>
        </div>
      `;
    });

    if (totalSheets > 1) {
      html += `<div style="font-size:0.72rem; color:#f59e0b; margin-top:4px;">+ 총 ${totalSheets}장의 세트가 함께 보관되어 있습니다. (OMR/QR에서 전체 확인 가능)</div>`;
    }

    html += `
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  // 바인딩: OMR, QR, 삭제
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
        openQrModal(sheets);
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
      <strong style="font-size:0.92rem; color:#fff;">당첨 결과: ${isAnyWin ? `총 ${wonCount}게임 당첨 축하합니다! 🎉` : '아쉽게도 낙첨되었습니다 😢'}</strong>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <button type="button" id="btn-rescan-qr" class="btn-rescan-chip" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; font-size:0.68rem; padding:3px 8px; border-radius:4px; cursor:pointer;">↺ 다시 스캔</button>
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
    if (hookTitle) hookTitle.textContent = '축하합니다! 다음 회차도 황금 행운을 이어가세요 ✨';
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
  btn.innerHTML = '복사 완료! ✔️';
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



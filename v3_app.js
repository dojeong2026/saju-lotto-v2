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

// 최신 추첨 회차 정보 (1244회 기준 - 당첨번호: 4, 11, 19, 27, 33, 41 + 보너스 24)
const LATEST_DRAW = {
  round: 1244,
  date: '2026.10.03(토)',
  numbers: [4, 11, 19, 27, 33, 41],
  bonus: 24,
  firstPrize: '22억 8,419만원',
  winners: 11
};

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

  // 1244회 추첨 기준: 2026-10-03 20:45:00
  const baseDrawTime = new Date(2026, 9, 3, 20, 45, 0).getTime();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const diffWeeks = Math.max(0, Math.floor((now.getTime() - baseDrawTime) / oneWeekMs));
  const currentTargetRound = 1245 + diffWeeks;

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

function initApp() {
  setupTabs();
  setupForm();
  renderSavedCount();
  updateSalesStatus();

  // 1시간 주기 실시간 자동 갱신 (1분마다 체크하여 시각 변경 시 즉시 반영)
  setInterval(updateSalesStatus, 60000);

  // 초기 상태: 요약바와 결과는 닫고, 입력 폼만 깨끗하게 빈칸(선택하기)으로 노출
  const summaryBar = document.getElementById('saju-summary-bar');
  if (summaryBar) summaryBar.style.display = 'none';

  document.getElementById('saju-form-card').style.display = 'block';
  document.getElementById('lotto-result-section').style.display = 'none';
  document.getElementById('view-destiny').style.display = 'none';

  const destinyBoard = document.getElementById('destiny-master-dashboard');
  if (destinyBoard) destinyBoard.style.display = 'none';

  initModalSystem();

  // 대표님 지시: 첫 화면은 임의의 사주를 자동 로드하지 않고 깨끗한 빈칸(선택하기)으로 유지
}

function setupTabs() {
  const tabLotto = document.getElementById('tab-lotto');
  const tabDestiny = document.getElementById('tab-destiny');
  const viewLotto = document.getElementById('view-lotto');
  const viewDestiny = document.getElementById('view-destiny');
  const lottoBoard = document.getElementById('latest-lotto-dashboard');
  const destinyBoard = document.getElementById('destiny-master-dashboard');
  const diagTitle = document.getElementById('diagnosis-title');
  const diagBadge = document.getElementById('diagnosis-amount-badge');

  // [v3 ⑤] 운명수 맛보기 카드: 누르면 운명수 탭으로 전환 후 생년월일 입력으로 안내
  const teaser = document.getElementById('destiny-teaser');
  if (teaser) {
    teaser.addEventListener('click', () => {
      tabDestiny.click();
      const formCard = document.getElementById('saju-form-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const dateInput = document.getElementById('birth-date');
      if (dateInput) setTimeout(() => dateInput.focus({ preventScroll: true }), 400);
    });
  }

  tabLotto.addEventListener('click', () => {
    tabLotto.classList.add('active');
    tabDestiny.classList.remove('active');
    state.currentTrack = 'lotto';

    // 1. [사주 로또 탭]: 로또 전광판 노출 & 운명수 명반 숨김
    if (lottoBoard) lottoBoard.style.display = 'block';
    if (destinyBoard) destinyBoard.style.display = 'none';

    // 폼 버튼 및 안내 문구 전환
    const submitText = document.getElementById('btn-submit-text');
    if (submitText) submitText.innerText = '내 사주 맞춤 로또번호 추출하기';
    const teaserTitle = document.getElementById('teaser-title');
    if (teaserTitle) teaserTitle.innerHTML = '🔒 로또만? <strong>평생 쓰는 내 운명수</strong>도 있어요';
    const modeBanner = document.getElementById('form-mode-banner');
    if (modeBanner) {
      modeBanner.innerHTML = '🔮 <strong>생년월일과 시간을 선택</strong>하시면 맞춤 행운 번호가 정밀 추출됩니다.';
      modeBanner.style.color = '#fbbf24';
      modeBanner.style.borderColor = 'rgba(245,158,11,0.25)';
      modeBanner.style.background = 'rgba(245,158,11,0.1)';
    }

    if (state.sajuResult) {
      viewLotto.style.display = 'block';
      viewDestiny.style.display = 'none';
      if (diagTitle) diagTitle.innerText = `${state.savedProfile ? state.savedProfile.birthDate : ''} 사주 명리 정밀 진단`;
      if (diagBadge) {
        diagBadge.style.display = 'inline-flex';
        diagBadge.innerText = `${state.sheets.length || 1}장 (${(state.sheets.length || 1) * 5}게임)`;
        diagBadge.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      }
    } else {
      viewLotto.style.display = 'block';
      viewDestiny.style.display = 'none';
    }
  });

  tabDestiny.addEventListener('click', () => {
    tabDestiny.classList.add('active');
    tabLotto.classList.remove('active');
    state.currentTrack = 'destiny';

    const sajuSummaryBar = document.getElementById('saju-summary-bar');
    const formCard = document.getElementById('saju-form-card');

    // 1. [사주 & 평생 운명수 탭]: v3 A안 - 분석 전에는 당첨현황 유지, 분석 후에만 숨김(6대 카드 집중)
    if (lottoBoard) lottoBoard.style.display = state.sajuResult ? 'none' : 'block';
    if (destinyBoard) destinyBoard.style.display = 'none'; // 6대 순차 카드 내부로 완전 통합

    // 폼 버튼 및 안내 문구 전환
    const submitText = document.getElementById('btn-submit-text');
    if (submitText) submitText.innerText = '내 운명수 정밀분석하기';
    const teaserTitle = document.getElementById('teaser-title');
    if (teaserTitle) teaserTitle.innerHTML = '🔒 생년월일만 넣으면 공개되는 <strong>나만의 운명수</strong>';
    const modeBanner = document.getElementById('form-mode-banner');
    if (modeBanner) {
      modeBanner.innerHTML = '🏛️ <strong>생년월일과 시간을 선택</strong>하시면 하늘이 내린 오행과 평생 운명수가 정밀 분석됩니다.';
      modeBanner.style.color = '#38bdf8';
      modeBanner.style.borderColor = 'rgba(56,189,248,0.3)';
      modeBanner.style.background = 'rgba(56,189,248,0.1)';
    }

    if (state.sajuResult) {
      // 분석 완료 상태: 6대 주제 순차 스크롤 뷰 전면 노출
      viewLotto.style.display = 'none';
      viewDestiny.style.display = 'block';
      if (sajuSummaryBar) sajuSummaryBar.style.display = 'none'; // 1주제 카드에 통합되었으므로 중복 숨김
      if (formCard) formCard.style.display = 'none';

      renderDestinyView(state.sajuResult);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // 아직 사주 입력 전: 폼으로 집중
      viewLotto.style.display = 'none';
      viewDestiny.style.display = 'none';
      if (sajuSummaryBar) sajuSummaryBar.style.display = 'none';
      if (formCard) formCard.style.display = 'block';
    }
  });
}

function setupForm() {
  const form = document.getElementById('saju-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const birthDate = document.getElementById('birth-date').value;
    const birthHour = parseInt(document.getElementById('birth-hour').value, 10);
    const birthCity = document.getElementById('birth-city').value;
    const gender = document.getElementById('gender').value;

    if (!birthDate) return;

    const profile = { birthDate, birthHour, birthCity, gender };
    localStorage.setItem('saju_lotto_v2_profile', JSON.stringify(profile));
    state.savedProfile = profile;

    runAnalysis(profile);
  });

  // 기본 추출 금액 5,000원(1장 5게임) 설정 유지
  state.selectedAmount = 5000;

  // 사주 변경 버튼 클릭 시: 요약바 숨기고, 입력 폼만 열고, 결과 티켓은 숨김
  const toggleBtn = document.getElementById('btn-toggle-saju');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.getElementById('saju-form-card').style.display = 'block';
      document.getElementById('saju-summary-bar').style.display = 'none';
      document.getElementById('lotto-result-section').style.display = 'none';
      setLandingHooksVisible(true);
      const briefingElem = document.getElementById('youngja-text');
      if (briefingElem) {
        briefingElem.innerHTML = `"대표님의 타고난 선천수를 정밀 분석해 드립니다."`;
      }
      document.getElementById('saju-form-card').scrollIntoView({ behavior: 'smooth' });
    });
  }
}

function autoLoadProfile(profile) {
  document.getElementById('birth-date').value = profile.birthDate;
  document.getElementById('birth-hour').value = profile.birthHour;
  document.getElementById('birth-city').value = profile.birthCity;
  document.getElementById('gender').value = profile.gender;
  // 첫 방문 시에는 자동 실행하지 않고 폼을 보여줌
}

// [v3] 차별성 띠 + 운명수 맛보기 카드 + 통계 칩 표시/숨김 (분석 전에만 노출)
function setLandingHooksVisible(visible) {
  ['v3-only-strip', 'destiny-teaser', 'stat-mini-pill-bar'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  });
}

function runAnalysis(profile) {
  try {
    const sheetCount = state.selectedAmount === 20000 ? 4 : (state.selectedAmount === 10000 ? 2 : 1);
    state.sheets = [];
    for (let s = 0; s < sheetCount; s++) {
      state.sheets.push(calculateSaju(profile.birthDate, profile.birthHour, profile.birthCity, profile.gender, s));
    }
    state.currentSheetIndex = 0;
    state.isAllSheetsView = false;
    state.sajuResult = state.sheets[0];

    // 모바일 1화면 핏: 분석 후 입력 폼은 닫고, 진단 카드로 전환!
    const formCard = document.getElementById('saju-form-card');
    if (formCard) formCard.style.display = 'none';
    setLandingHooksVisible(false);

    // 3. 사주 명리 정밀 진단 & 오행 처방 카드 동적 렌더링
    const diagCard = document.getElementById('saju-summary-bar');
    if (diagCard) {
      diagCard.style.display = 'flex';

      const diagTitle = document.getElementById('diagnosis-title');
      if (diagTitle) {
        diagTitle.innerText = `${profile.birthDate} 사주 명리 정밀 진단`;
      }

      const amountBadge = document.getElementById('diagnosis-amount-badge');
      if (amountBadge) {
        amountBadge.innerText = state.selectedAmount >= 10000 
          ? `${state.selectedAmount / 10000}만원 (${sheetCount * 5}게임)` 
          : '5천원 (5게임)';
      }

      const strongElemEl = document.getElementById('diag-strong-elem');
      if (strongElemEl && state.sajuResult.primaryElement) {
        strongElemEl.innerText = `${state.sajuResult.primaryElement.name} 왕성 (${state.sajuResult.ohaengPercent[state.sajuResult.maxElement]}%)`;
      }

      const weakElemEl = document.getElementById('diag-weak-elem');
      if (weakElemEl && state.sajuResult.lackingElement) {
        weakElemEl.innerText = `${state.sajuResult.lackingElement.name} 결핍 (${state.sajuResult.ohaengPercent[state.sajuResult.minElement]}%) ⚠️ 보강`;
      }

      const prescriptNumbersEl = document.getElementById('diag-prescript-numbers');
      if (prescriptNumbersEl) {
        const sc = state.sajuResult.seoncheon.join(', ');
        const hc = state.sajuResult.hucheon.join(', ');
        const parentName = state.sajuResult.parentElemObj ? state.sajuResult.parentElemObj.name : '상생';
        const parentBalls = state.sajuResult.parentBalls ? state.sajuResult.parentBalls.slice(0, 3).join(', ') : '';
        prescriptNumbersEl.innerHTML = `선천수 <strong>${sc}</strong> · 후천수 <strong>${hc}</strong> · 상생 보완수 <strong>${parentName} (${parentBalls})</strong>`;
      }

      const prescriptCommentEl = document.getElementById('diag-prescript-comment');
      if (prescriptCommentEl && state.sajuResult.lackingElement) {
        const lackName = state.sajuResult.lackingElement.name;
        const parentName = state.sajuResult.parentElemObj ? state.sajuResult.parentElemObj.name : '상생';
        prescriptCommentEl.innerHTML = `"부족한 <strong>${lackName}</strong> 기운을 보완해야 ${state.sajuResult.lackingElement.symbol}의 결실이 맺히므로, <strong>${parentName}·${lackName}</strong> 번호를 중심으로 황금 배합했습니다."`;
      }
    }

    // 영자 실장의 한 줄 품격 브리핑 동적 갱신
    const briefingElem = document.getElementById('youngja-text');
    if (briefingElem) {
      const lackingName = state.sajuResult.lackingElement ? state.sajuResult.lackingElement.name : '부족한';
      const totalGames = sheetCount * 5;
      briefingElem.innerHTML = `"대표님의 사주에 부족한 <strong>${lackingName}</strong> 기운을 보강하는 선천수·후천수 <strong>총 ${totalGames}게임</strong>을 정밀 조화시켰습니다."`;
    }

    renderLottoView();
    renderDestinyView(state.sajuResult);
    updateDestinyDashboard(state.sajuResult);

    const lottoBoard = document.getElementById('latest-lotto-dashboard');
    const destinyBoard = document.getElementById('destiny-master-dashboard');
    const viewLotto = document.getElementById('view-lotto');
    const viewDestiny = document.getElementById('view-destiny');

    if (state.currentTrack === 'destiny') {
      if (lottoBoard) lottoBoard.style.display = 'none';
      if (destinyBoard) destinyBoard.style.display = 'none';
      if (viewLotto) viewLotto.style.display = 'none';
      if (viewDestiny) viewDestiny.style.display = 'block';

      const sajuSummaryBar = document.getElementById('saju-summary-bar');
      if (sajuSummaryBar) sajuSummaryBar.style.display = 'none';

      const firstCard = document.getElementById('destiny-card-1');
      if (firstCard && typeof firstCard.scrollIntoView === 'function') {
        firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      if (lottoBoard) lottoBoard.style.display = 'block';
      if (destinyBoard) destinyBoard.style.display = 'none';
      if (viewLotto) viewLotto.style.display = 'block';
      if (viewDestiny) viewDestiny.style.display = 'none';

      // 【핵심 UX 개선】 사주 진단 카드를 먼저 보여주고, 잠시 뒤 결과로 자연스럽게 이동
      const diagScrollTarget = document.getElementById('saju-summary-bar');
      if (diagScrollTarget && typeof diagScrollTarget.scrollIntoView === 'function') {
        diagScrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // 1.5초 후 결과 티켓 영역으로 부드럽게 스크롤
      setTimeout(() => {
        const resSec = document.getElementById('lotto-result-section');
        if (resSec && typeof resSec.scrollIntoView === 'function') {
          resSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 1500);
    }
  } catch (err) {
    console.error('사주 분석 및 렌더링 오류:', err);
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
  const RECENT_WINNING = [9, 18, 24, 38, 43, 44]; // 직전 회차 1243회

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
    if (state.sheets.length > 1) {
      badgeEl.innerText = state.isAllSheetsView 
        ? `제1244회 (전체 ${state.sheets.length}장)`
        : `제1244회 (${state.currentSheetIndex + 1}장 / 총 ${state.sheets.length}장)`;
    } else {
      badgeEl.innerText = '제1244회 (1장 5게임)';
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
          const newSheet = calculateSaju(state.savedProfile.birthDate, state.savedProfile.birthHour, state.savedProfile.birthCity, state.savedProfile.gender, nextIdx);
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
        round: 1244,
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
            <div class="lifetime-big-val">${data.bankPass}</div>
            <div class="lifetime-sub-principle">통장·카드·도어락 4자리<br>(선천·후천 결실 조합)</div>
          </div>

          <!-- 2. 성공 차량 번호 -->
          <div class="lifetime-number-card">
            <div class="lifetime-card-header">
              <span>🚗</span>
              <span>안전·성공 차량번호</span>
            </div>
            <div class="lifetime-big-val">${data.carNum}</div>
            <div class="lifetime-sub-principle">자동차 번호판 4자리<br>(사고 예방 &amp; 사업 번창)</div>
          </div>

          <!-- 3. 대박 전화번호 뒷자리 -->
          <div class="lifetime-number-card" style="grid-column: span 2;">
            <div class="lifetime-card-header">
              <span>📱</span>
              <span>인생 성공 골드 전화번호 (뒷자리 3선)</span>
            </div>
            <div style="display: flex; justify-content: space-around; margin: 4px 0;">
              ${data.phoneNumbers.map(p => `
                <span style="font-size: 1.15rem; font-weight: 900; color: #fbbf24; background: rgba(255,255,255,0.06); padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(245,158,11,0.3);">${p}</span>
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

    html += `
      <div class="vault-card" data-idx="${idx}">
        <div class="vault-card-header">
          <div class="vault-card-title">
            <span class="vault-round-pill">제1244회</span>
            <span class="vault-time-text">${item.date || item.fullDate || '최근 저장'} (${totalSheets}장 / ${totalGames}게임)</span>
          </div>
          <div class="vault-card-tools">
            <button type="button" class="btn-vault-action btn-vault-omr" data-idx="${idx}" title="OMR 빨간 종이 마킹지 보기">🔴 OMR</button>
            <button type="button" class="btn-vault-action btn-vault-qr" data-idx="${idx}" title="모바일 슬립지 QR 보기">📱 QR</button>
            <button type="button" class="btn-vault-action delete btn-vault-del" data-idx="${idx}" title="삭제">🗑️</button>
          </div>
        </div>
        <div class="vault-games-list">
    `;

    // 1장째의 게임들을 기본 표시 (최신 당첨번호 LATEST_DRAW와 자동 대조 채점!)
    const firstSheetGames = sheets[0].games || [];
    firstSheetGames.forEach(g => {
      // 당첨 일치 개수 계산
      const matchCount = g.numbers.filter(n => LATEST_DRAW.numbers.includes(n)).length;
      const bonusMatch = g.numbers.includes(LATEST_DRAW.bonus);
      
      let rankBadge = '';
      if (matchCount === 6) rankBadge = '<span class="vault-match-badge rank-1">🏆 1등 당첨!</span>';
      else if (matchCount === 5 && bonusMatch) rankBadge = '<span class="vault-match-badge rank-2">🥈 2등 당첨!</span>';
      else if (matchCount === 5) rankBadge = '<span class="vault-match-badge rank-3">🥉 3등 당첨!</span>';
      else if (matchCount === 4) rankBadge = '<span class="vault-match-badge rank-4">✨ 4등 (5만원)</span>';
      else if (matchCount === 3) rankBadge = '<span class="vault-match-badge rank-5">🎯 5등 (5천원)</span>';
      else if (matchCount > 0) rankBadge = `<span class="vault-match-badge rank-none">${matchCount}개 일치</span>`;

      html += `
        <div class="vault-game-row ${matchCount >= 3 ? 'has-win' : ''}">
          <div class="vault-game-tag-wrap">
            <span class="vault-game-tag">${g.label}</span>
            ${rankBadge}
          </div>
          <div class="vault-balls-group">
            ${g.numbers.map(n => {
              const isHit = LATEST_DRAW.numbers.includes(n);
              const isBonus = (n === LATEST_DRAW.bonus);
              const hitClass = isHit ? 'ball-hit' : (isBonus ? 'ball-bonus' : '');
              return `<span class="vault-ball ${getBallClass(n)} ${hitClass}">${n}</span>`;
            }).join('')}
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
      if (confirm('이 저장 번호를 삭제하시겠습니까?')) {
        state.savedNumbers.splice(idx, 1);
        localStorage.setItem('saju_lotto_v2_saved', JSON.stringify(state.savedNumbers));
        renderSavedCount();
        renderVaultList();
      }
    };
  });
}

function clearAllVault() {
  if (state.savedNumbers.length === 0) return;
  if (confirm('보관함의 모든 저장 번호를 완전히 삭제하시겠습니까?')) {
    state.savedNumbers = [];
    localStorage.removeItem('saju_lotto_v2_saved');
    renderSavedCount();
    renderVaultList();
  }
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
      <div class="omr-sub-info">슬립지 마킹 가이드 (제1244회)</div>
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
  let qrCodeData = `http://m.dhlottery.co.kr/?v=1244`;
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
    roundInfo.innerText = `제1244회 로또 구매용`;
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


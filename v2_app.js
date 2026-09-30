/**
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
const LUCKY_SURI_81 = [11, 13, 15, 16, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41, 45, 47, 48];

function initApp() {
  setupTabs();
  setupForm();
  renderSavedCount();

  // 초기 상태: 요약바와 결과는 닫고, 입력 폼만 깨끗하게 노출
  const summaryBar = document.getElementById('saju-summary-bar');
  if (summaryBar) summaryBar.style.display = 'none';

  document.getElementById('saju-form-card').style.display = 'block';
  document.getElementById('lotto-result-section').style.display = 'none';

  if (state.savedProfile) {
    autoLoadProfile(state.savedProfile);
  }
}

function setupTabs() {
  const tabLotto = document.getElementById('tab-lotto');
  const tabDestiny = document.getElementById('tab-destiny');
  const viewLotto = document.getElementById('view-lotto');
  const viewDestiny = document.getElementById('view-destiny');

  tabLotto.addEventListener('click', () => {
    tabLotto.classList.add('active');
    tabDestiny.classList.remove('active');
    viewLotto.style.display = 'block';
    viewDestiny.style.display = 'none';
    state.currentTrack = 'lotto';
  });

  tabDestiny.addEventListener('click', () => {
    tabDestiny.classList.add('active');
    tabLotto.classList.remove('active');
    viewLotto.style.display = 'none';
    viewDestiny.style.display = 'block';
    state.currentTrack = 'destiny';
    if (state.sajuResult) renderDestinyView(state.sajuResult);
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

  // 전화번호 4자리
  const phoneNumbers = [
    generateLuckyDigits(seed, 1),
    generateLuckyDigits(seed + 13, 2),
    generateLuckyDigits(seed + 37, 3)
  ];
  const bankPass = String(1000 + (seed * 19) % 8999);
  const carNum = String(1000 + (seed * 29) % 8999);
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
    phoneNumbers, bankPass, carNum, businessNum
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

  // 4. [추가 5게임 더 뽑기 (+5천원)] 버튼 이벤트 바인딩
  const addSheetBtn = document.getElementById('btn-add-sheet');
  if (addSheetBtn) {
    addSheetBtn.onclick = () => {
      if (!state.savedProfile) return;
      const nextIdx = state.sheets.length;
      const newSheet = calculateSaju(state.savedProfile.birthDate, state.savedProfile.birthHour, state.savedProfile.birthCity, state.savedProfile.gender, nextIdx);
      state.sheets.push(newSheet);
      state.currentSheetIndex = nextIdx;
      state.isAllSheetsView = false;
      renderLottoView();

      // 영자 실장 멘트 갱신
      const briefingElem = document.getElementById('youngja-text');
      if (briefingElem) {
        briefingElem.innerHTML = `"대표님을 위한 <strong>제${nextIdx + 1}장(+5게임)</strong>의 새로운 오행 조화수를 추가 추출했습니다! (총 ${state.sheets.length * 5}게임)"`;
      }
      document.getElementById('compact-ticket').scrollIntoView({ behavior: 'smooth' });
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

function renderDestinyView(data) {
  const destinyBox = document.getElementById('destiny-content');
  if (!destinyBox) return;

  destinyBox.innerHTML = `
    <div class="saju-intro-box">
      <h3 style="color:#fde68a; margin-bottom:8px; font-weight:800; font-size:1.15rem;">📖 사주(四柱)와 숫자의 조화</h3>
      <p style="color:#e2e8f0; font-size:0.92rem; margin-bottom:10px; line-height:1.6;">
        사주(四柱)는 내가 태어난 <strong>년·월·일·시</strong>의 우주 에너지 지도입니다.
        부족한 기운을 상생(相生)으로 채워주는 <strong>조화의 숫자</strong>를 가까이하여 마음의 평온과 긍정적인 에너지를 얻는 지혜입니다.
      </p>
    </div>

    <div style="background:#1e293b; padding:16px; border-radius:10px; margin-bottom:12px;">
      <h4 style="color:#fff; font-size:1.05rem; font-weight:800; margin-bottom:10px;">🔢 선천수와 후천수</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px;">
          <span style="color:#94a3b8; font-size:0.8rem;">하도 선천수:</span><br>
          <strong style="color:#f59e0b; font-size:1.2rem;">${data.seoncheon.join(', ')}</strong>
        </div>
        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px;">
          <span style="color:#94a3b8; font-size:0.8rem;">낙서 후천수:</span><br>
          <strong style="color:#38bdf8; font-size:1.2rem;">${data.hucheon.join(', ')}</strong>
        </div>
      </div>
    </div>

    <div style="background:#1e293b; padding:16px; border-radius:10px; margin-bottom:12px;">
      <h4 style="color:#fff; font-size:1.05rem; font-weight:800; margin-bottom:4px;">📱 행운의 전화번호 큐레이션</h4>
      <p style="color:#94a3b8; font-size:0.82rem; margin-bottom:10px;">수리 81길수 기반 추천 뒷자리</p>
      <div style="display:flex; gap:8px;">
        ${data.phoneNumbers.map(n => `
          <div style="flex:1; background:rgba(245,158,11,0.15); border:1px solid var(--border-gold); padding:8px; border-radius:6px; text-align:center; color:#fde68a; font-weight:900; font-size:1.15rem;">
            ${n}
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background:#1e293b; padding:16px; border-radius:10px;">
      <h4 style="color:#fff; font-size:1.05rem; font-weight:800; margin-bottom:8px;">🔐 생활 추천 번호</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; font-size:0.82rem;">
        <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; text-align:center;">
          <span style="color:#94a3b8;">통장 비번</span><br><strong style="color:#fff; font-size:1rem;">${data.bankPass}</strong>
        </div>
        <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; text-align:center;">
          <span style="color:#94a3b8;">차량 번호</span><br><strong style="color:#fff; font-size:1rem;">${data.carNum}</strong>
        </div>
        <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; text-align:center;">
          <span style="color:#94a3b8;">도전 길수</span><br><strong style="color:#fff; font-size:1rem;">${data.businessNum}</strong>
        </div>
      </div>
    </div>
  `;
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

    // 1장째의 게임들을 기본 표시
    const firstSheetGames = sheets[0].games || [];
    firstSheetGames.forEach(g => {
      html += `
        <div class="vault-game-row">
          <span class="vault-game-tag">${g.label}</span>
          <div class="vault-balls-group">
            ${g.numbers.map(n => `<span class="vault-ball ${getBallClass(n)}">${n}</span>`).join('')}
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


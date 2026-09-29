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
  savedNumbers: JSON.parse(localStorage.getItem('saju_lotto_v2_saved') || '[]'),
  savedProfile: JSON.parse(localStorage.getItem('saju_lotto_v2_profile') || 'null')
};

const CITY_TIME_OFFSETS = {
  'seoul': -32, 'busan': -24, 'daegu': -26, 'incheon': -33,
  'gwangju': -33, 'daejeon': -31, 'ulsan': -23, 'gangwon': -29, 'jeju': -34
};

const OHAENG_INFO = {
  'wood':  { name: '목(木)', symbol: '성장·창의', balls: [3, 8, 13, 28, 38, 43] },
  'fire':  { name: '화(火)', symbol: '열정·활력', balls: [2, 7, 12, 17, 22, 27] },
  'earth': { name: '토(土)', symbol: '신뢰·재물', balls: [5, 10, 15, 20, 25, 30] },
  'metal': { name: '금(金)', symbol: '결단·결실', balls: [4, 9, 14, 19, 24, 34] },
  'water': { name: '수(水)', symbol: '지혜·유연', balls: [1, 6, 11, 16, 21, 31, 41] }
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

  // 사주 변경 버튼 클릭 시: 요약바 숨기고, 입력 폼만 열고, 결과 티켓은 숨김
  const toggleBtn = document.getElementById('btn-toggle-saju');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.getElementById('saju-form-card').style.display = 'block';
      document.getElementById('saju-summary-bar').style.display = 'none';
      document.getElementById('lotto-result-section').style.display = 'none';
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
  const sajuData = calculateSaju(profile.birthDate, profile.birthHour, profile.birthCity, profile.gender);
  state.sajuResult = sajuData;

  // 모바일 1화면 핏: 분석 후 입력 폼은 닫고, 1줄 요약 바로 전환!
  document.getElementById('saju-form-card').style.display = 'none';
  const summaryBar = document.getElementById('saju-summary-bar');
  if (summaryBar) {
    summaryBar.style.display = 'flex';
    const cityName = profile.birthCity === 'seoul' ? '서울' : (profile.birthCity === 'busan' ? '부산' : '지역');
    document.getElementById('summary-text').innerText = 
      `생년월일: ${profile.birthDate} | ${cityName} | ${sajuData.primaryElement.name} 기운 중심`;
  }

  // 영자 실장의 한 줄 품격 브리핑 동적 갱신
  const briefingElem = document.getElementById('youngja-text');
  if (briefingElem) {
    briefingElem.innerHTML = `<strong>영자 실장 분석:</strong> 사주에 <strong>${sajuData.lackingElement.name}</strong> 기운이 부족하여, 이를 채워주는 행운수와 선천수·후천수를 황금 배합했습니다.`;
  }

  renderLottoView(sajuData);
  renderDestinyView(sajuData);

  // 결과 티켓이 화면 중앙에 딱 오도록 스무스 스크롤
  document.getElementById('lotto-result-section').scrollIntoView({ behavior: 'smooth' });
}

function calculateSaju(dateStr, hour, city, gender) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const cityOffset = CITY_TIME_OFFSETS[city] || -30;
  const seed = (year * 365 + month * 31 + day + hour + Math.abs(cityOffset));

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

  // 5게임 구조: 의미 있는 제목과 부제
  const games = [];
  const minObj = OHAENG_INFO[minElement];
  const parentMap = { wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal' };
  const parentElem = parentMap[minElement];

  const gameMeta = [
    { title: `부족한 ${minObj.name} 기운 보강 조합`, desc: `${minObj.name} 보완수 + 역대 최다 1등수` },
    { title: `선천수·후천수 길수 조합`, desc: `하도·낙서 개운수 + 상위 통계수` },
    { title: `${OHAENG_INFO[parentElem].name}·${minObj.name} 상생 순환 조합`, desc: `상생 조화수 + 다빈도수` },
    { title: `최신 회차 흐름 연계 조합`, desc: `직전 회차 연계수 + 보완수` },
    { title: `5대 오행 황금 밸런스 조합`, desc: `목화토금수 고른 분포 + 최고 빈도수` }
  ];

  // 번호 생성 (5게임 중복 100% 방지)
  for (let g = 0; g < 5; g++) {
    let cur = [];
    if (g === 0) {
      cur = [...minObj.balls.slice(0, 3), ...HOT_NUMBERS.slice(0, 3)];
    } else if (g === 1) {
      const sc = [seoncheon[0], (seoncheon[1] || seoncheon[0] + 10)];
      cur = [sc[0], sc[1], hucheon[0] + 10, ...HOT_NUMBERS.slice(3, 6)];
    } else if (g === 2) {
      cur = [...OHAENG_INFO[parentElem].balls.slice(1, 3), minObj.balls[3] || 15, ...HOT_NUMBERS.slice(6, 9)];
    } else if (g === 3) {
      cur = [18, 24, ...minObj.balls.slice(2, 4), ...HOT_NUMBERS.slice(9, 11)];
    } else {
      const b5 = ['wood','fire','earth','metal','water'].map(k => OHAENG_INFO[k].balls[(seed + g) % OHAENG_INFO[k].balls.length]);
      cur = [...b5, HOT_NUMBERS[0]];
    }

    let u6 = Array.from(new Set(cur)).map(n => ((n - 1) % 45) + 1).slice(0, 6);
    while (u6.length < 6) {
      for (let n of HOT_NUMBERS) {
        if (!u6.includes(n)) { u6.push(n); if (u6.length === 6) break; }
      }
    }
    u6.sort((a, b) => a - b);
    games.push({ numbers: u6, title: gameMeta[g].title, desc: gameMeta[g].desc });
  }

  const DIRECTIONS = {
    wood: '동쪽(東)', fire: '남쪽(南)', earth: '중앙·동북쪽(東北)', metal: '서쪽(西)', water: '북쪽(北)'
  };
  const luckyDirection = DIRECTIONS[minElement];
  const luckyTime = ['오후 2시~4시', '오후 4시~6시', '오후 6시~8시', '오전 11시~1시'][seed % 4];

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
    seoncheon, hucheon, games, luckyDirection, luckyTime,
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
 * [핵심] 한 화면에 쏙 들어오는 콤팩트 티켓 렌더링
 */
function renderLottoView(data) {
  const resultSec = document.getElementById('lotto-result-section');
  const dateEl = document.getElementById('ticket-date');
  if (dateEl) dateEl.innerText = new Date().toLocaleDateString('ko-KR');

  const gamesContainer = document.getElementById('ticket-games');
  if (!gamesContainer) return;
  gamesContainer.innerHTML = '';

  data.games.forEach((g, idx) => {
    const row = document.createElement('div');
    row.className = 'game-compact-row';

    const ballsHtml = g.numbers.map(b => `<div class="compact-ball ${getBallClass(b)}">${b}</div>`).join('');

    row.innerHTML = `
      <div class="game-title-line">
        <span class="game-meaning-title">
          <span style="color:#d97706;">●</span> ${g.title}
        </span>
        <span class="game-meaning-desc">${g.desc}</span>
      </div>
      <div class="game-balls-line">
        <div class="compact-ball-group">${ballsHtml}</div>
      </div>
    `;
    gamesContainer.appendChild(row);
  });

  document.getElementById('ticket-direction').innerText = data.luckyDirection;
  document.getElementById('ticket-time').innerText = data.luckyTime;

  const saveBtn = document.getElementById('btn-save-numbers');
  saveBtn.onclick = () => {
    state.savedNumbers.unshift({
      date: new Date().toLocaleString('ko-KR'),
      games: data.games.map(g => g.numbers)
    });
    localStorage.setItem('saju_lotto_v2_saved', JSON.stringify(state.savedNumbers.slice(0, 20)));
    renderSavedCount();
    alert('이번 5게임 번호가 내 폰에 보관되었습니다!');
  };
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
  const badge = document.getElementById('saved-count-badge');
  if (badge) badge.innerText = state.savedNumbers.length;
}

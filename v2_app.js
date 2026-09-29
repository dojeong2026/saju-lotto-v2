/**
 * 사주로또 v2 (천기누설 넘버 연구소) - 통합 자바스크립트 엔진
 * 비용 0원 / 온디바이스 브라우저 연산 / No-DB (localStorage)
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// 전역 상태
const state = {
  currentTrack: 'lotto', // 'lotto' | 'destiny'
  sajuResult: null,
  savedNumbers: JSON.parse(localStorage.getItem('saju_lotto_v2_saved') || '[]')
};

// 16개 주요 도시 경도 시차 (동경 135도 기준 분 단위)
const CITY_TIME_OFFSETS = {
  'seoul': -32,
  'busan': -24,
  'daegu': -26,
  'incheon': -33,
  'gwangju': -33,
  'daejeon': -31,
  'ulsan': -23,
  'sejong': -31,
  'gangwon': -29,
  'jeju': -34
};

// 오행 컬러 및 명칭
const OHAENG_INFO = {
  'wood':  { name: '목(木)', color: '#10b981', symbol: '성장·창의' },
  'fire':  { name: '화(火)', color: '#ef4444', symbol: '열정·확장' },
  'earth': { name: '토(土)', color: '#f59e0b', symbol: '신뢰·포용' },
  'metal': { name: '금(金)', color: '#94a3b8', symbol: '결단·정의' },
  'water': { name: '수(水)', color: '#3b82f6', symbol: '지혜·유연' }
};

// 역대 로또 최빈도 출현 번호 (동행복권 1회~1150회 통계 상위 15개)
const HOT_NUMBERS = [34, 18, 27, 12, 1, 43, 20, 13, 33, 4, 17, 26, 40, 14, 45];

// 81수리 대길수(大吉數) 목록
const LUCKY_SURI_81 = [1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41, 45, 47, 48, 52, 63, 65, 67, 68];

function initApp() {
  setupTabs();
  setupForm();
  renderSavedCount();
}

// 탭 스위치
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
    
    // 이미 사주 분석이 되어 있다면 바로 운명수 뷰 갱신
    if (state.sajuResult) {
      renderDestinyView(state.sajuResult);
    }
  });
}

// 사주 폼 제출 핸들러
function setupForm() {
  const form = document.getElementById('saju-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const userName = document.getElementById('user-name').value.trim() || '행운의 주인공';
    const birthDate = document.getElementById('birth-date').value;
    const birthHour = parseInt(document.getElementById('birth-hour').value, 10);
    const birthCity = document.getElementById('birth-city').value;
    const gender = document.getElementById('gender').value;

    if (!birthDate) {
      alert('생년월일을 선택해 주세요.');
      return;
    }

    // 분석 로직 가동
    const sajuData = calculateSaju(userName, birthDate, birthHour, birthCity, gender);
    state.sajuResult = sajuData;

    // 제1줄기 (로또 뷰) 렌더링
    renderLottoView(sajuData);

    // 제2줄기 (운명수 뷰) 렌더링 준비
    renderDestinyView(sajuData);

    // 결과 영역으로 부드럽게 스크롤
    document.getElementById('lotto-result-section').scrollIntoView({ behavior: 'smooth' });
  });
}

/**
 * 정통 사주 명리 및 수리 계산 엔진 (온디바이스 JS)
 */
function calculateSaju(name, dateStr, hour, city, gender) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const cityOffset = CITY_TIME_OFFSETS[city] || -30;
  
  // 시차 보정된 실제 명리 태양시
  const adjustedMinute = 30 + cityOffset;
  
  // 오행 기본 가중치 산출 (년월일시 기반 결정론적 해시)
  const seed = (year * 365 + month * 31 + day + hour + Math.abs(cityOffset));
  
  // 5대 오행 비율 (합 100%)
  const rawOhaeng = {
    wood:  15 + (seed * 7) % 25,
    fire:  15 + (seed * 11) % 25,
    earth: 15 + (seed * 13) % 25,
    metal: 15 + (seed * 17) % 25,
    water: 15 + (seed * 19) % 25
  };
  const total = rawOhaeng.wood + rawOhaeng.fire + rawOhaeng.earth + rawOhaeng.metal + rawOhaeng.water;
  const ohaengPercent = {
    wood:  Math.round((rawOhaeng.wood / total) * 100),
    fire:  Math.round((rawOhaeng.fire / total) * 100),
    earth: Math.round((rawOhaeng.earth / total) * 100),
    metal: Math.round((rawOhaeng.metal / total) * 100),
    water: 100 - (Math.round((rawOhaeng.wood / total) * 100) + Math.round((rawOhaeng.fire / total) * 100) + Math.round((rawOhaeng.earth / total) * 100) + Math.round((rawOhaeng.metal / total) * 100))
  };

  // 가장 부족한 기운(용신, 用神) & 넘치는 기운 도출
  let minElement = 'wood', maxElement = 'wood';
  for (let key in ohaengPercent) {
    if (ohaengPercent[key] < ohaengPercent[minElement]) minElement = key;
    if (ohaengPercent[key] > ohaengPercent[maxElement]) maxElement = key;
  }

  // 선천수(河圖: 木3,8 火2,7 土5,10 金4,9 水1,6)
  const SEONCHEON_MAP = {
    wood: [3, 8],
    fire: [2, 7],
    earth: [5, 10],
    metal: [4, 9],
    water: [1, 6]
  };

  // 후천수(洛書: 一白水, 二黑土, 三碧木, 四綠木, 五黃土, 六白金, 七赤金, 八白土, 九紫火)
  const HUCHEON_MAP = {
    wood: [3, 4],
    fire: [9],
    earth: [2, 5, 8],
    metal: [6, 7],
    water: [1]
  };

  const seoncheon = SEONCHEON_MAP[minElement];
  const hucheon = HUCHEON_MAP[minElement];

  // 사주 용신 기반 행운의 3수 (1~45 범위 매핑)
  const saju3Nums = [
    seoncheon[0] + ((seed % 4) * 10),
    (seoncheon[1] || seoncheon[0] * 2) + ((seed % 3) * 10),
    hucheon[0] + ((seed % 5) * 8)
  ].map(n => ((n - 1) % 45) + 1);

  // 로또 5게임 (A~E) 하이브리드 조합 생성
  const games = [];
  for (let g = 0; g < 5; g++) {
    const gameSeed = seed + g * 37;
    // 사주 기반 3수 추출
    const mySajuNums = [...saju3Nums];
    // 최빈도 빅데이터 풀에서 중복 없이 3수 선택
    const shuffledHot = [...HOT_NUMBERS].sort(() => 0.5 - Math.sin(gameSeed + g));
    const hot3Nums = [];
    for (let num of shuffledHot) {
      if (!mySajuNums.includes(num)) {
        hot3Nums.push(num);
        if (hot3Nums.length === 3) break;
      }
    }
    const full6 = [...mySajuNums, ...hot3Nums].sort((a, b) => a - b);
    games.push(full6);
  }

  // 명당 방위 & 구매 시간대 산출
  const DIRECTIONS = {
    wood:  { dir: '동쪽(東)', desc: '푸른 나무나 공원이 보이는 로또방' },
    fire:  { dir: '남쪽(南)', desc: '햇볕이 잘 들고 활기찬 번화가 복권방' },
    earth: { dir: '중앙·동북쪽(東北)', desc: '단단한 석재 건물이나 언덕길 인근 복권방' },
    metal: { dir: '서쪽(西)', desc: '금융가, 은행 및 도로변 접근성이 좋은 복권방' },
    water: { dir: '북쪽(北)', desc: '차분하고 유동인구가 꾸준한 골목길 복권방' }
  };
  const luckyDirection = DIRECTIONS[minElement];

  const HOURS_MAP = ['오전 10시~12시', '오후 2시~4시', '오후 4시~6시', '오후 6시~8시'];
  const luckyTime = HOURS_MAP[seed % HOURS_MAP.length];

  // 전화번호 4자리 큐레이션 (81수리 대길수 기반)
  const phoneNumbers = [
    generateLuckyDigits(seed, minElement, 1),
    generateLuckyDigits(seed + 17, minElement, 2),
    generateLuckyDigits(seed + 43, minElement, 3)
  ];

  // 생활 추천 번호
  const bankPass = String(1000 + (seed * 19) % 8999);
  const carNum = String(1000 + (seed * 29) % 8999);
  const businessNum = String(100000 + (seed * 31) % 899999);

  return {
    name,
    dateStr,
    hour,
    city,
    gender,
    ohaengPercent,
    minElement,
    maxElement,
    seoncheon,
    hucheon,
    games,
    luckyDirection,
    luckyTime,
    phoneNumbers,
    bankPass,
    carNum,
    businessNum
  };
}

// 81수리 대길수 기반 4자리 생성
function generateLuckyDigits(seed, element, variant) {
  const d1 = (seed * 3 + variant) % 9 + 1;
  const d2 = (seed * 7 + variant * 2) % 10;
  const d3 = (seed * 11 + variant * 3) % 10;
  const sumTarget = LUCKY_SURI_81[(seed + variant) % LUCKY_SURI_81.length];
  let d4 = (sumTarget - (d1 + d2 + d3)) % 10;
  if (d4 < 0) d4 += 10;
  return `${d1}${d2}${d3}${d4}`;
}

/**
 * 제1줄기: 로또 뷰 렌더링
 */
function renderLottoView(data) {
  const resultSec = document.getElementById('lotto-result-section');
  resultSec.style.display = 'block';

  // 1. 오행 도넛 차트 SVG
  renderOhaengChart(data.ohaengPercent);

  // 2. 오행 분석 텍스트
  const infoText = document.getElementById('ohaeng-analysis-text');
  infoText.innerHTML = `
    <strong>${data.name}</strong> 님의 사주는 <strong>${OHAENG_INFO[data.maxElement].name}</strong> 기운이 풍부하고, 
    상대적으로 <strong>${OHAENG_INFO[data.minElement].name}</strong>(${OHAENG_INFO[data.minElement].symbol}) 기운의 조화가 필요한 형국입니다. 
    이에 부족한 오행을 상생 보완하는 길수와 역대 빅데이터를 정밀 결합하였습니다.
  `;

  // 3. 황금 영수증 티켓 렌더링
  document.getElementById('ticket-user-name').innerText = `${data.name} 님의 사주 조화 티켓`;
  document.getElementById('ticket-date').innerText = new Date().toLocaleDateString('ko-KR');

  const gamesContainer = document.getElementById('ticket-games');
  gamesContainer.innerHTML = '';
  const labels = ['A', 'B', 'C', 'D', 'E'];
  data.games.forEach((balls, idx) => {
    const row = document.createElement('div');
    row.className = 'game-row';
    const ballsHtml = balls.map(b => `<div class="game-ball-mini ${getBallClass(b)}">${b}</div>`).join('');
    row.innerHTML = `
      <span class="game-label">${labels[idx]} 자·선</span>
      <div class="game-balls">${ballsHtml}</div>
    `;
    gamesContainer.appendChild(row);
  });

  document.getElementById('ticket-direction').innerText = data.luckyDirection.dir;
  document.getElementById('ticket-time').innerText = data.luckyTime;

  // 번호 저장 버튼 리스너
  const saveBtn = document.getElementById('btn-save-numbers');
  saveBtn.onclick = () => {
    state.savedNumbers.unshift({
      date: new Date().toLocaleString('ko-KR'),
      games: data.games
    });
    localStorage.setItem('saju_lotto_v2_saved', JSON.stringify(state.savedNumbers.slice(0, 20)));
    renderSavedCount();
    alert('이번 회차 번호가 안전하게 내 폰 보관함에 저장되었습니다!');
  };
}

// 오행 SVG 도넛 차트
function renderOhaengChart(p) {
  const chartEl = document.getElementById('ohaeng-svg');
  const r = 45;
  const c = 2 * Math.PI * r;
  
  let offset = 0;
  const elements = [
    { key: 'wood',  pct: p.wood,  color: OHAENG_INFO.wood.color },
    { key: 'fire',  pct: p.fire,  color: OHAENG_INFO.fire.color },
    { key: 'earth', pct: p.earth, color: OHAENG_INFO.earth.color },
    { key: 'metal', pct: p.metal, color: OHAENG_INFO.metal.color },
    { key: 'water', pct: p.water, color: OHAENG_INFO.water.color }
  ];

  let circles = '';
  elements.forEach(item => {
    const strokeDash = (item.pct / 100) * c;
    circles += `
      <circle cx="65" cy="65" r="${r}" fill="none" stroke="${item.color}" stroke-width="16"
              stroke-dasharray="${strokeDash} ${c - strokeDash}" stroke-dashoffset="-${offset}" opacity="0.9"/>
    `;
    offset += strokeDash;
  });

  chartEl.innerHTML = circles;
}

function getBallClass(num) {
  if (num <= 10) return 'ball-wood';
  if (num <= 20) return 'ball-fire';
  if (num <= 30) return 'ball-earth';
  if (num <= 40) return 'ball-metal';
  return 'ball-water';
}

/**
 * 제2줄기: 사주와 운명수 뷰 렌더링
 */
function renderDestinyView(data) {
  const destinyBox = document.getElementById('destiny-content');
  if (!destinyBox) return;

  destinyBox.innerHTML = `
    <!-- 사주란 무엇인가? -->
    <div class="saju-intro-box">
      <h3 style="color:#fde68a; margin-bottom:8px; font-weight:700;">📖 사주(四柱)란 무엇인가?</h3>
      <p style="color:#cbd5e1; font-size:0.88rem; margin-bottom:10px;">
        사주(四柱)는 내가 태어난 <strong>년·월·일·시</strong>의 네 기둥을 의미하며, 그 안에 배치된 여덟 글자를 <strong>팔자(八字)</strong>라고 합니다.
        우주 삼라만상이 목·화·토·금·수 다섯 기운의 조화로 순환하듯, 나의 사주 역시 고유한 에너지 지도를 품고 있습니다.
      </p>
      <p style="color:#94a3b8; font-size:0.84rem;">
        ※ 특정 숫자가 미래를 단정하거나 기적을 일으키는 것은 아닙니다. 다만, 내 사주의 넘치는 기운을 덜어내고 부족한 기운을 채워주는 <strong>상생(相生)의 숫자</strong>를 일상에서 가까이함으로써 마음의 안정을 얻고 긍정적인 자기 암시를 기르는 현명한 지혜입니다.
      </p>
    </div>

    <!-- 선천수 & 후천수 -->
    <div class="card" style="padding:18px; margin-bottom:16px;">
      <h4 style="color:#fff; font-size:0.95rem; margin-bottom:12px;">🔢 ${data.name} 님의 선천수(先天數)와 후천수(後天數)</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.85rem;">
        <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:8px;">
          <span style="color:#94a3b8;">하도(河圖) 선천수:</span><br>
          <strong style="color:#f59e0b; font-size:1.1rem;">${data.seoncheon.join(', ')}</strong>
          <p style="color:#64748b; font-size:0.75rem; margin-top:4px;">타고난 본연의 기운수</p>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:8px;">
          <span style="color:#94a3b8;">낙서(洛書) 후천수:</span><br>
          <strong style="color:#38bdf8; font-size:1.1rem;">${data.hucheon.join(', ')}</strong>
          <p style="color:#64748b; font-size:0.75rem; margin-top:4px;">조화를 돕는 개운의 수</p>
        </div>
      </div>
    </div>

    <!-- 행운의 전화번호 큐레이션 -->
    <div class="card" style="padding:18px; margin-bottom:16px;">
      <h4 style="color:#fff; font-size:0.95rem; margin-bottom:6px;">📱 조화와 안정을 돕는 행운의 전화번호 큐레이션</h4>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:14px;">수리명리학 81길수 원리와 부족한 ${OHAENG_INFO[data.minElement].name} 기운을 보강한 추천 뒷자리</p>
      
      <div class="number-card-grid">
        ${data.phoneNumbers.map((num, i) => `
          <div class="lucky-num-card">
            <div class="lucky-info">
              <h4>추천 번호 ${i + 1}</h4>
              <p>마음의 여유와 원만한 대인관계를 응원하는 배합</p>
            </div>
            <div class="lucky-digit-badge">${num}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 생활 추천 번호 -->
    <div class="card" style="padding:18px;">
      <h4 style="color:#fff; font-size:0.95rem; margin-bottom:6px;">🔐 일상의 긍정 에너지를 더하는 생활 추천 번호</h4>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:14px;">무심코 쓰는 숫자에 긍정적인 의미와 차분한 기원을 담아보세요.</p>
      
      <div class="number-card-grid">
        <div class="lucky-num-card">
          <div class="lucky-info">
            <h4>차분한 자산 관리 추천 비번</h4>
            <p>통장 / 카드 4자리 추천</p>
          </div>
          <div class="lucky-digit-badge">${data.bankPass}</div>
        </div>
        <div class="lucky-num-card">
          <div class="lucky-info">
            <h4>안전운행 기원 차량 번호</h4>
            <p>안전운전의 마음가짐을 돕는 끝 4자리</p>
          </div>
          <div class="lucky-digit-badge">${data.carNum}</div>
        </div>
        <div class="lucky-num-card">
          <div class="lucky-info">
            <h4>새로운 도전 응원 길수</h4>
            <p>천을귀인의 상징을 담은 6자리</p>
          </div>
          <div class="lucky-digit-badge" style="font-size:1.05rem;">${data.businessNum}</div>
        </div>
      </div>
    </div>
  `;
}

function renderSavedCount() {
  const badge = document.getElementById('saved-count-badge');
  if (badge) {
    badge.innerText = state.savedNumbers.length;
  }
}

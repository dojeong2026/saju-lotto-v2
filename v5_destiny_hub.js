/* =====================================================================
 * 사주로또 v5 - 사주(운명수) 허브 렌더러 (v5_destiny_hub.js)
 * 
 * 디자인 테마: 고품격 백색/아이보리(White & Warm Paper) 테마
 * 구성:
 *   [상단 Hero] 오늘의 일진 + 3줄 요약 헤드라인 + 내일 예고 + N일 스트릭
 *   [박스 1] 오늘 좋은 일 / 피해야 할 일 (매일 변경)
 *   [박스 2] 오늘의 수호수 (하도 오행수 + 보강수 조합, 매일 변경)
 *   [박스 3] 우리 가족 오늘의 기운 (매일 변경, 다중 프로필 연동)
 *   [박스 4] 나의 사주 원국 & 10년 대운 (정적 분석 + 하도·낙서 해설)
 *   [박스 5] 나만의 실생활 행운번호 (정적 분석, 차량/전화/비번 원터치 복사)
 * 
 * 인터랙션: 원스크린 핏 아코디언 (한 번에 1개씩만 펼쳐짐)
 * ===================================================================== */

(function (global) {
  'use strict';

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 스트릭(연속 방문일수) 관리 - 로컬스토리지
  function updateStreak(todayKey) {
    const STREAK_KEY = 'saju_lotto_v5_streak';
    let data = { last: '', count: 1 };
    try {
      const saved = localStorage.getItem(STREAK_KEY);
      if (saved) data = JSON.parse(saved);
    } catch (e) {}

    if (data.last === todayKey) {
      return data.count || 1;
    }

    if (data.last) {
      const lastD = new Date(data.last);
      const currD = new Date(todayKey);
      const diffDays = Math.round((currD - lastD) / 86400000);
      if (diffDays === 1) {
        data.count = (data.count || 1) + 1;
      } else if (diffDays > 1) {
        data.count = 1;
      }
    } else {
      data.count = 1;
    }
    data.last = todayKey;
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    } catch (e) {}
    return data.count;
  }

  // 하도수 매핑 (목:3·8, 화:2·7, 토:5·10, 금:4·9, 수:1·6)
  const HADO_NUMS = {
    wood: [3, 8],
    fire: [2, 7],
    earth: [5, 10],
    metal: [4, 9],
    water: [1, 6]
  };

  /**
   * 사주 허브 메인 렌더링 함수
   */
  function renderDestinyHub(data) {
    const container = document.getElementById('destiny-content');
    if (!container) return;

    if (!data || !data.chart) {
      container.innerHTML = `
        <div class="dh-empty-card">
          <p class="dh-empty-title">사주 분석 데이터가 없습니다.</p>
          <p class="dh-empty-desc">생년월일을 입력하고 번호 뽑기를 먼저 진행해 주세요.</p>
          <button type="button" class="dh-btn-primary" onclick="showScreen('main')">기본 정보 입력하러 가기</button>
        </div>
      `;
      return;
    }

    const chart = data.chart;
    const now = new Date();
    const todayP = global.SajuEngine ? global.SajuEngine.todayPillar(now) : {
      key: now.toISOString().slice(0, 10),
      gan: '갑', ji: '자', ganEl: 'wood', jiEl: 'water',
      kor: '갑자', han: '甲子', weekday: '월', y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate(), idx: 0
    };

    // 오늘 및 내일 운세 리딩
    const todayReading = global.SajuEngine ? global.SajuEngine.dailyReading(chart.dayGan, now) : { god: '식신', godBranch: '정재' };
    const tomorrowD = new Date(now.getTime() + 86400000);
    const tomorrowReading = global.SajuEngine ? global.SajuEngine.dailyReading(chart.dayGan, tomorrowD) : { god: '정재', godBranch: '정관' };

    const content = global.DailyContent ? global.DailyContent.build(todayReading, tomorrowReading, todayP.idx) : {
      god: '식신', level: 'good', label: '순풍', plain: '복록과 여유가 샘솟는 날',
      headline: '지갑에 햇살이 들고 마음이 넉넉해지는 날',
      lines: ['마음먹은 일이 순조롭게 풀립니다.', '소소한 이득과 반가운 소식이 찾아옵니다.', '주변 사람에게 따뜻한 한마디를 건네보세요.'],
      dos: ['여유로운 산책', '가족과 식사', '기분 좋은 베풀기'],
      donts: ['서두르는 결정', '무리한 과소비', '날 선 언쟁'],
      teaser: '내일은 안정적인 결실과 정돈의 기운이 이어집니다.'
    };

    const streakDays = updateStreak(todayP.key);
    const profileName = (window.state && window.state.profile && window.state.profile.name) ? window.state.profile.name : '나';

    // 수호수 연산:
    // A수: 오늘 일진 천간 오행의 하도수 (천간 음양에 따라 배속)
    const todayGanIsYang = (todayP.idx % 2 === 0);
    const hadoListA = HADO_NUMS[todayP.ganEl] || [1, 6];
    const numA = todayGanIsYang ? hadoListA[0] : hadoListA[1];

    // B수: 내 사주의 결핍 오행 보강수
    const minEl = chart.minElement || 'metal';
    const hadoListB = HADO_NUMS[minEl] || [4, 9];
    const numB = (todayP.idx % 2 === 0) ? hadoListB[0] : hadoListB[1];

    // 오늘이 내 결핍 오행을 직접 채워주는 날인지 체크
    const isDirectRecharge = (todayP.ganEl === minEl || todayP.jiEl === minEl);

    // 가족 운세 프로필 수집
    const profiles = (window.state && Array.isArray(window.state.profiles)) ? window.state.profiles : [];

    let familyRowsHtml = '';
    let bestProfile = null;
    let bestWeight = -1;

    profiles.forEach(p => {
      let fChart = null;
      try {
        const solDate = window.resolveSolarDate ? window.resolveSolarDate(p) : p.birthDate;
        fChart = global.SajuEngine ? global.SajuEngine.computeChart(solDate, p.birthHour, p.gender) : null;
      } catch (e) {}

      if (fChart) {
        const fReading = global.SajuEngine ? global.SajuEngine.dailyReading(fChart.dayGan, now) : { god: '비견' };
        const fBrief = global.DailyContent ? global.DailyContent.brief(fReading) : { god: '비견', level: 'calm', label: '평온', headline: '평온한 하루' };
        const weight = (fBrief.level === 'good') ? 3 : (fBrief.level === 'calm' ? 2 : 1);
        if (weight > bestWeight) {
          bestWeight = weight;
          bestProfile = p.name;
        }

        const levelClass = fBrief.level === 'good' ? 'level-good' : (fBrief.level === 'calm' ? 'level-calm' : 'level-careful');
        familyRowsHtml += `
          <div class="dh-family-row">
            <div class="dh-family-left">
              <span class="dh-family-name">${esc(p.name)}</span>
              <span class="dh-family-chip ${levelClass}">${esc(fBrief.label)}</span>
            </div>
            <div class="dh-family-right">
              <span class="dh-family-desc">${esc(fBrief.headline)}</span>
            </div>
          </div>
        `;
      }
    });

    // 4주 원국 데이터 구성
    const pNames = ['시주(時柱)', '일주(日柱)', '월주(月柱)', '년주(年柱)'];
    const pKeys = ['time', 'day', 'month', 'year'];
    let pillarsHtml = '';
    pKeys.forEach((k, idx) => {
      const item = chart.pillars[k];
      if (!item) {
        pillarsHtml += `
          <div class="dh-pillar-col is-empty">
            <span class="dh-pillar-title">${pNames[idx]}</span>
            <div class="dh-pillar-card">
              <span class="dh-pillar-empty-text">미입력</span>
            </div>
          </div>
        `;
      } else {
        const ganElClass = 'el-' + item.ganEl;
        const jiElClass = 'el-' + item.jiEl;
        const ganGodText = item.ganGod ? esc(item.ganGod) : (k === 'day' ? '본원' : '-');
        const jiGodText = item.jiGod ? esc(item.jiGod) : '-';

        pillarsHtml += `
          <div class="dh-pillar-col">
            <span class="dh-pillar-title">${pNames[idx]}</span>
            <div class="dh-pillar-card">
              <span class="dh-god-sub">${ganGodText}</span>
              <div class="dh-char-box ${ganElClass}">
                <span class="dh-char-kor">${item.ganKor || (global.SajuEngine ? global.SajuEngine.GAN[item.gan] : item.gan)}</span>
                <span class="dh-char-han">${item.ganHan || (global.SajuEngine ? global.SajuEngine.GAN_H[item.gan] : '')}</span>
              </div>
              <div class="dh-char-box ${jiElClass}">
                <span class="dh-char-kor">${item.jiKor || (global.SajuEngine ? global.SajuEngine.JI[item.ji] : item.ji)}</span>
                <span class="dh-char-han">${item.jiHan || (global.SajuEngine ? global.SajuEngine.JI_H[item.ji] : '')}</span>
              </div>
              <span class="dh-god-sub">${jiGodText}</span>
            </div>
          </div>
        `;
      }
    });

    // 오행 게이지 바 구성
    const elOrder = ['wood', 'fire', 'earth', 'metal', 'water'];
    const elNames = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    let ohaengBarsHtml = '';
    elOrder.forEach(el => {
      const pct = chart.ohaengPercent[el] || 0;
      const cnt = chart.counts[el] || 0;
      const isDef = (el === chart.minElement);
      const isExcess = (el === chart.maxElement && pct >= 35);
      const tagText = isDef ? '결핍 보강' : (isExcess ? '과다 조절' : '균형');
      const tagClass = isDef ? 'tag-def' : (isExcess ? 'tag-excess' : 'tag-norm');

      ohaengBarsHtml += `
        <div class="dh-oh-row">
          <div class="dh-oh-label-wrap">
            <span class="dh-oh-name">${elNames[el]}</span>
            <span class="dh-oh-cnt">${cnt}자 (${pct}%)</span>
            <span class="dh-oh-badge ${tagClass}">${tagText}</span>
          </div>
          <div class="dh-oh-track">
            <div class="dh-oh-fill fill-${el}" style="width: ${Math.max(pct, 4)}%"></div>
          </div>
        </div>
      `;
    });

    // 10년 대운 타임라인
    const currentYear = now.getFullYear();
    const koreanAge = currentYear - chart.birthYear + 1;
    let daeunTimelineHtml = '';
    let currentDaeunObj = null;

    if (chart.daeun && Array.isArray(chart.daeun.list)) {
      chart.daeun.list.forEach(d => {
        const isCurrent = (koreanAge >= d.startAge && koreanAge <= d.endAge);
        if (isCurrent) currentDaeunObj = d;
        const dPillar = d.kor || ((d.ganKor || '') + (d.jiKor || '')) || (d.gan + '' + d.ji);
        const dGod = d.god || (global.SajuEngine ? global.SajuEngine.tenGod(chart.dayGan, d.gan) : '');
        daeunTimelineHtml += `
          <div class="dh-daeun-chip ${isCurrent ? 'is-current' : ''}">
            <span class="dh-daeun-age">${d.startAge}세</span>
            <span class="dh-daeun-pillar">${dPillar}</span>
            <span class="dh-daeun-god">${dGod}</span>
          </div>
        `;
      });
    }

    const curPillar = currentDaeunObj ? (currentDaeunObj.kor || (currentDaeunObj.ganKor + currentDaeunObj.jiKor) || (currentDaeunObj.gan + '' + currentDaeunObj.ji)) : '';
    const curGod = currentDaeunObj ? (currentDaeunObj.god || '') : '';
    const daeunDesc = currentDaeunObj 
      ? `현재는 <strong>${currentDaeunObj.startAge}세~${currentDaeunObj.endAge}세 ${curPillar}${curGod ? '(' + curGod + ')' : ''}</strong> 대운의 흐름에 들어서 있습니다. ${global.DailyContent ? global.DailyContent.daeunLine(curGod) : ''}`
      : `첫 대운은 ${chart.daeun ? chart.daeun.startAge : 1}세부터 본격적으로 시작됩니다.`;

    // 실생활 행운번호 (기존 계산치 보존)
    const phoneList = Array.isArray(data.phoneNumbers) ? data.phoneNumbers : [data.bestPhone || '7788', '3388', '5599'];
    const floorList = Array.isArray(data.bestFloors) ? data.bestFloors.slice(0, 3).join(', ') : '3층, 8층, 13층';
    const roomList = Array.isArray(data.bestRooms) ? data.bestRooms.slice(0, 3).join(', ') : '3호, 8호, 13호';

    // 최종 HTML 조립 (화이트 테마)
    container.innerHTML = `
      <div class="destiny-hub-wrapper">
        
        <!-- [상단 Hero: 화이트 감성 카드] -->
        <header class="dh-hero-card">
          <div class="dh-hero-top">
            <span class="dh-date-badge">${todayP.m}월 ${todayP.d}일 (${todayP.weekday}) · ${todayP.kor}일(${todayP.han}日)</span>
            <span class="dh-streak-badge">연속 ${streakDays}일째 출석</span>
          </div>

          <div class="dh-hero-main">
            <div class="dh-hero-user">
              <span class="dh-user-name">${esc(profileName)}</span> 님의 오늘 기운
              <span class="dh-god-chip ${content.level === 'good' ? 'level-good' : (content.level === 'calm' ? 'level-calm' : 'level-careful')}">${content.label} (${content.god})</span>
            </div>
            <h2 class="dh-hero-headline">"${esc(content.headline)}"</h2>
            
            <div class="dh-summary-3lines">
              <div class="dh-line-item">
                <span class="dh-line-dot">1</span>
                <span class="dh-line-text">${esc(content.lines[0])}</span>
              </div>
              <div class="dh-line-item">
                <span class="dh-line-dot">2</span>
                <span class="dh-line-text">${esc(content.lines[1])}</span>
              </div>
              <div class="dh-line-item">
                <span class="dh-line-dot">3</span>
                <span class="dh-line-text">${esc(content.lines[2])}</span>
              </div>
            </div>

            <div class="dh-tomorrow-teaser">
              <span class="dh-teaser-label">내일 예고</span>
              <span class="dh-teaser-text">${esc(content.teaser)}</span>
            </div>
          </div>
        </header>

        <!-- [5대 주제 원스크린 아코디언] -->
        <div class="dh-accordion-container" id="dh-accordion-group">

          <!-- 1. 오늘 좋은 일 & 피해야 할 일 (매일 변경) -->
          <article class="dh-acc-item" id="dh-acc-item-1">
            <button type="button" class="dh-acc-header" onclick="toggleDhAccordion(1)">
              <div class="dh-acc-title-wrap">
                <span class="dh-acc-icon">일진</span>
                <div class="dh-acc-titles">
                  <span class="dh-acc-title">오늘 좋은 일 &amp; 피할 일</span>
                  <span class="dh-acc-sub">당일 일진(${todayP.kor})과 내 일간의 상호작용</span>
                </div>
              </div>
              <span class="dh-acc-arrow">›</span>
            </button>
            <div class="dh-acc-body">
              <div class="dh-grid-dos-donts">
                <div class="dh-col-dos">
                  <div class="dh-col-badge badge-do">오늘 하면 좋은 일</div>
                  <ul class="dh-list">
                    ${content.dos.map(d => `<li><span class="bullet-do">✔</span> ${esc(d)}</li>`).join('')}
                  </ul>
                </div>
                <div class="dh-col-donts">
                  <div class="dh-col-badge badge-dont">오늘 피하면 좋은 일</div>
                  <ul class="dh-list">
                    ${content.donts.map(d => `<li><span class="bullet-dont">✖</span> ${esc(d)}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>
          </article>

          <!-- 2. 오늘의 수호수 (매일 변경) -->
          <article class="dh-acc-item" id="dh-acc-item-2">
            <button type="button" class="dh-acc-header" onclick="toggleDhAccordion(2)">
              <div class="dh-acc-title-wrap">
                <span class="dh-acc-icon">수호수</span>
                <div class="dh-acc-titles">
                  <span class="dh-acc-title">오늘의 수호수 (2개 조합)</span>
                  <span class="dh-acc-sub">오늘 일진의 천간수 + 내 결핍 오행 보강수</span>
                </div>
              </div>
              <span class="dh-acc-arrow">›</span>
            </button>
            <div class="dh-acc-body">
              <div class="dh-guardian-wrap">
                <div class="dh-guardian-balls">
                  <div class="dh-ball dh-ball-a">
                    <span class="dh-ball-num">${numA}</span>
                    <span class="dh-ball-tag">일진 천간수</span>
                  </div>
                  <div class="dh-ball-plus">+</div>
                  <div class="dh-ball dh-ball-b">
                    <span class="dh-ball-num">${numB}</span>
                    <span class="dh-ball-tag">결핍 보강수</span>
                  </div>
                </div>
                <div class="dh-guardian-desc">
                  ${isDirectRecharge 
                    ? `<p class="dh-notice-direct"><strong>기운 일치일:</strong> 오늘 일진(${todayP.kor})은 내 부족한 오행(${global.SajuEngine ? global.SajuEngine.EL_KOR[minEl] : minEl})을 직접 채워주는 뜻깊은 날입니다.</p>`
                    : `<p class="dh-notice-norm">오늘의 하늘 기운인 <strong>${todayP.kor}</strong>의 천간수(<strong>${numA}</strong>)와 내게 가장 필요한 <strong>${global.SajuEngine ? global.SajuEngine.EL_KOR[minEl] : minEl}</strong>의 보강수(<strong>${numB}</strong>)가 조화를 이룹니다.</p>`
                  }
                </div>
                <div class="dh-guardian-action">
                  <button type="button" class="dh-btn-to-lotto" onclick="showScreen(window.state && window.state.sheets && window.state.sheets.length ? 'results' : 'main')">
                    이번 주 로또 번호 뽑기로 이동 ›
                  </button>
                </div>
              </div>
            </div>
          </article>

          <!-- 3. 우리 가족 오늘의 기운 (매일 변경) -->
          <article class="dh-acc-item" id="dh-acc-item-3">
            <button type="button" class="dh-acc-header" onclick="toggleDhAccordion(3)">
              <div class="dh-acc-title-wrap">
                <span class="dh-acc-icon">가족</span>
                <div class="dh-acc-titles">
                  <span class="dh-acc-title">우리 가족 오늘의 기운</span>
                  <span class="dh-acc-sub">${bestProfile ? `오늘 가장 좋은 기운: ${esc(bestProfile)} 님` : '가족 구성원 일일 운세 요약'}</span>
                </div>
              </div>
              <span class="dh-acc-arrow">›</span>
            </button>
            <div class="dh-acc-body">
              <div class="dh-family-list">
                ${familyRowsHtml}
              </div>
              <div class="dh-family-bottom">
                <button type="button" class="dh-btn-add-fam" onclick="showScreen('main'); setTimeout(function(){ const b = document.getElementById('btn-add-family'); if(b) b.click(); }, 200);">
                  + 가족 추가하고 기운 함께 보기
                </button>
              </div>
            </div>
          </article>

          <!-- 4. 나의 사주 원국 & 대운 (정적 분석) -->
          <article class="dh-acc-item" id="dh-acc-item-4">
            <button type="button" class="dh-acc-header" onclick="toggleDhAccordion(4)">
              <div class="dh-acc-title-wrap">
                <span class="dh-acc-icon">원국</span>
                <div class="dh-acc-titles">
                  <span class="dh-acc-title">나의 사주 원국 &amp; 10년 대운</span>
                  <span class="dh-acc-sub">태어난 날의 4주 8자와 인생 흐름 타임라인</span>
                </div>
              </div>
              <span class="dh-acc-arrow">›</span>
            </button>
            <div class="dh-acc-body">
              <!-- 4주 표 -->
              <div class="dh-pillars-grid">
                ${pillarsHtml}
              </div>

              <!-- 일간 본원 설명 -->
              <div class="dh-daygan-box">
                <span class="dh-daygan-title">내 사주의 중심: <strong>${chart.dayGanKor || (global.SajuEngine ? global.SajuEngine.GAN[chart.dayGan] : '')}(${chart.dayGanHan || (global.SajuEngine ? global.SajuEngine.GAN_H[chart.dayGan] : '')}) ${global.SajuEngine ? global.SajuEngine.EL_KOR[chart.dayGanEl || global.SajuEngine.GAN_EL[chart.dayGan]] : ''}</strong></span>
                <p class="dh-daygan-desc">${esc(data.dayMasterDesc || '자신만의 곧은 주관과 생명력을 지닌 본원입니다.')}</p>
              </div>

              <!-- 오행 분포 -->
              <div class="dh-ohaeng-section">
                <span class="dh-sec-title">사주 8자 오행 분포</span>
                <div class="dh-oh-bars">
                  ${ohaengBarsHtml}
                </div>
              </div>

              <!-- 10년 대운 타임라인 -->
              <div class="dh-daeun-section">
                <span class="dh-sec-title">10년 대운(大運) 흐름 타임라인</span>
                <p class="dh-daeun-now-desc">${daeunDesc}</p>
                <div class="dh-daeun-timeline">
                  ${daeunTimelineHtml}
                </div>
              </div>

              <!-- 하도·낙서 접이식 설명 -->
              <details class="dh-details-hado">
                <summary>왜 이 숫자가 나에게 맞을까요? (하도·낙서의 원리 보기)</summary>
                <div class="dh-details-content">
                  <p><strong>하도(河圖)</strong>는 고대 동양 철학에서 오행의 기본 수를 부여한 수학적 모형입니다. 목(3·8), 화(2·7), 토(5·10), 금(4·9), 수(1·6)로 짝지어집니다.</p>
                  <p>사주로또는 내 사주에서 가장 부족한 오행(결핍 오행)을 찾아 하늘의 생성수와 땅의 완성수로 보강하여, 일상과 번호에서 기운의 균형을 이룰 수 있도록 돕습니다.</p>
                </div>
              </details>
            </div>
          </article>

          <!-- 5. 나만의 실생활 행운번호 (정적 분석) -->
          <article class="dh-acc-item" id="dh-acc-item-5">
            <button type="button" class="dh-acc-header" onclick="toggleDhAccordion(5)">
              <div class="dh-acc-title-wrap">
                <span class="dh-acc-icon">행운수</span>
                <div class="dh-acc-titles">
                  <span class="dh-acc-title">나만의 실생활 행운번호</span>
                  <span class="dh-acc-sub">전화번호 뒤 4자리, 차량번호, 통장 비밀번호</span>
                </div>
              </div>
              <span class="dh-acc-arrow">›</span>
            </button>
            <div class="dh-acc-body">
              <div class="dh-life-cards">

                <!-- 통장 비밀번호 4자리 -->
                <div class="dh-life-card">
                  <div class="dh-life-info">
                    <span class="dh-life-title">통장 비밀번호 (4자리)</span>
                    <span class="dh-life-val">${esc(data.bankPass || '3872')}</span>
                    <span class="dh-life-principle">결핍 오행 보강수 배합</span>
                  </div>
                  <button type="button" class="btn-copy-num" onclick="window.copyToClipboard('${esc(data.bankPass || '3872')}', this)">복사</button>
                </div>

                <!-- 차량번호 (4자리) -->
                <div class="dh-life-card">
                  <div class="dh-life-info">
                    <span class="dh-life-title">차량 번호 (4자리)</span>
                    <span class="dh-life-val">${esc(data.carNum || '8832')}</span>
                    <span class="dh-life-principle">안전운전 및 길상수 조합</span>
                  </div>
                  <button type="button" class="btn-copy-num" onclick="window.copyToClipboard('${esc(data.carNum || '8832')}', this)">복사</button>
                </div>

                <!-- 휴대전화 뒷번호 추천 -->
                <div class="dh-life-card">
                  <div class="dh-life-info">
                    <span class="dh-life-title">추천 휴대전화 뒷자리 (3선)</span>
                    <span class="dh-life-val">${phoneList.map(p => esc(p)).join(' · ')}</span>
                    <span class="dh-life-principle">인연운 및 재물운 상승 배합</span>
                  </div>
                  <button type="button" class="btn-copy-num" onclick="window.copyToClipboard('${phoneList[0]}', this)">1순위 복사</button>
                </div>

                <!-- 아파트 층/호수 -->
                <div class="dh-life-card">
                  <div class="dh-life-info">
                    <span class="dh-life-title">나와 맞는 층수 &amp; 호수</span>
                    <span class="dh-life-val">${esc(floorList)} / ${esc(roomList)}</span>
                    <span class="dh-life-principle">터의 기운을 살리는 오행 조화</span>
                  </div>
                </div>

              </div>
            </div>
          </article>

        </div> <!-- /dh-accordion-container -->

        <!-- 하단 네비게이션: 로또 번호 뽑기로 복귀 -->
        <div class="dh-bottom-nav">
          <button type="button" class="dh-btn-back-ticket" onclick="showScreen(window.state && window.state.sheets && window.state.sheets.length ? 'results' : 'main')">
            ← 이번 주 로또 번호 화면으로 돌아가기
          </button>
        </div>

      </div>
    `;

    // 기본적으로 1번 아코디언 열어두기 (원스크린 핏)
    toggleDhAccordion(1);
  }

  /**
   * 단일 아코디언 토글 (한 번에 1개만 열림)
   */
  global.toggleDhAccordion = function (idx) {
    const group = document.getElementById('dh-accordion-group');
    if (!group) return;
    const items = group.querySelectorAll('.dh-acc-item');
    items.forEach((item, i) => {
      const itemIdx = i + 1;
      if (itemIdx === idx) {
        const isOpen = item.classList.contains('is-open');
        if (isOpen) {
          item.classList.remove('is-open');
        } else {
          item.classList.add('is-open');
        }
      } else {
        item.classList.remove('is-open');
      }
    });
  };

  // 전역 노출
  global.renderDestinyHub = renderDestinyHub;

})(window);

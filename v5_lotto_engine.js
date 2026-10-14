/* =====================================================================
 * 사주로또 v5 - 번호 조합 엔진 (v5_lotto_engine.js)
 *
 * 원리 (사주로또_원리.md 와 1:1 대응):
 *   1) 번호의 오행: 끝자리 규칙(하도). n%5 → 1수 · 2화 · 3목 · 4금 · 0토
 *   2) 5게임 역할(A~E): 결핍 오행 보강 / 선천·후천수 / 상생 순환 / 지난 회차 흐름 / 5행 균형
 *   3) 오늘의 십신(10종)이 가중치를 바꾼다 (식신=낮은 수, 편재=높은 수·재성, 겁재=콜드 …)
 *   4) 가중 추첨은 "생년월일시+성별+지역+오늘날짜+장수"를 해시한 시드로 결정 → 같은 날 같은 입력은 항상 같은 결과
 *   5) 모든 게임은 통계 균형 필터(저고·홀짝·합계·연번·생일번호 회피)와 게임 간 중복 제한을 통과해야 한다
 *
 * [정직 고지] 로또는 모든 조합의 당첨 확률이 동일합니다. 이 엔진은 당첨 확률을 높이지 않으며,
 *   (a) 사주 원리에 따른 의미 있는 조합을 만들고 (b) 극단적이거나 남들이 많이 고르는 패턴을 피해
 *   1등이 되었을 때 당첨금을 나눠 가질 위험을 줄이는 것까지만 목적으로 합니다.
 * ===================================================================== */
(function (global) {
  'use strict';

  const EL_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
  const GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }; // 상생
  const CTL = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' }; // 상극
  const invert = (o) => Object.keys(o).reduce((r, k) => { r[o[k]] = k; return r; }, {});
  const GEN_INV = invert(GEN); // 나를 생해주는 오행(인성)
  const CTL_INV = invert(CTL); // 나를 극하는 오행(관성)

  const NUM_EL = { 1: 'water', 2: 'fire', 3: 'wood', 4: 'metal', 0: 'earth' };
  const elOf = (n) => NUM_EL[n % 5];

  const GOD_RECIPE = {
    '비견': '소신 배합', '겁재': '역발상 배합', '식신': '복록 배합', '상관': '영감 배합',
    '편재': '횡재수 배합', '정재': '안정 배합', '편관': '집중형 배합', '정관': '정통 3:3 배합',
    '편인': '틈새수 배합', '정인': '상생 보양 배합'
  };

  // ---------------------------------------------------------------
  // 결정적 난수 (같은 키 → 같은 결과)
  // ---------------------------------------------------------------
  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------
  // 가중 추첨 (비복원)
  // ---------------------------------------------------------------
  function newWeights() {
    const w = new Array(46).fill(1);
    w[0] = 0;
    return w;
  }
  function pickOne(w, rnd) {
    let total = 0;
    for (let n = 1; n <= 45; n++) total += w[n];
    if (total <= 0) return -1;
    let r = rnd() * total;
    let last = -1;
    for (let n = 1; n <= 45; n++) {
      if (w[n] <= 0) continue;
      last = n;
      r -= w[n];
      if (r < 0) return n;
    }
    return last;
  }
  function sampleSix(w0, rnd, forced) {
    const w = w0.slice();
    const chosen = [];
    (forced || []).forEach((n) => { if (n >= 1 && n <= 45 && !chosen.includes(n)) { chosen.push(n); w[n] = 0; } });
    while (chosen.length < 6) {
      const n = pickOne(w, rnd);
      if (n < 0) break;
      chosen.push(n);
      w[n] = 0;
    }
    return chosen.sort((a, b) => a - b);
  }

  // ---------------------------------------------------------------
  // 오늘의 십신 → 가중치 변형
  // ---------------------------------------------------------------
  function relations(dayEl) {
    return {
      bigeop: dayEl,               // 비견·겁재
      siksang: GEN[dayEl],         // 식신·상관
      jaeseong: CTL[dayEl],        // 편재·정재
      gwanseong: CTL_INV[dayEl],   // 편관·정관
      inseong: GEN_INV[dayEl]      // 편인·정인
    };
  }
  function boostElement(w, el, mult) {
    for (let n = 1; n <= 45; n++) if (elOf(n) === el) w[n] *= mult;
  }
  function applyGod(w, god, ctx) {
    if (!god) return;
    const rel = relations(ctx.dayEl);
    switch (god) {
      case '비견':
        boostElement(w, ctx.minElement, 2);
        break;
      case '겁재':
        (ctx.cold || []).forEach((n) => { w[n] *= 3; });
        break;
      case '식신':
        for (let n = 1; n <= 20; n++) w[n] *= 1.8;
        boostElement(w, rel.siksang, 1.6);
        break;
      case '상관':
        boostElement(w, rel.siksang, 1.6);
        break;
      case '편재':
        for (let n = 21; n <= 45; n++) w[n] *= 1.6;
        boostElement(w, rel.jaeseong, 2);
        break;
      case '정재':
        boostElement(w, rel.jaeseong, 1.6);
        break;
      case '편관':
        boostElement(w, rel.gwanseong, 2.5);
        break;
      case '정관':
        break; // 3:3 저고 규율은 검증 단계에서 강제
      case '편인': {
        const known = new Set([].concat(ctx.hot || [], ctx.recent || []));
        for (let n = 1; n <= 45; n++) if (!known.has(n)) w[n] *= 2;
        break;
      }
      case '정인':
        boostElement(w, GEN_INV[ctx.minElement], 2);
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------
  // 게임 역할(A~E)별 기본 가중치 / 강제 포함 번호
  // ---------------------------------------------------------------
  function buildRole(role, ctx, rnd) {
    const w = newWeights();
    let forced = [];
    switch (role) {
      case 'A': // 결핍 오행 보강
        boostElement(w, ctx.minElement, 6);
        break;
      case 'B': { // 선천수·후천수 (끝자리 일치) + 결핍 오행
        const digits = new Set((ctx.hucheon || []).map((d) => d % 10));
        for (let n = 1; n <= 45; n++) if (digits.has(n % 10)) w[n] *= 5;
        boostElement(w, ctx.minElement, 2);
        break;
      }
      case 'C': // 상생 순환: 나를 낳아주는 오행 + 결핍 오행
        boostElement(w, GEN_INV[ctx.minElement], 4);
        boostElement(w, ctx.minElement, 4);
        // ★ 대표님 지침: 5게임 중 2게임(C, D)은 10번대 이상부터 시원하게 시작 (단번대 1~9 제외)
        for (let n = 1; n <= 9; n++) w[n] = 0;
        break;
      case 'D': { // 사주 본원(일간) 강화 및 귀인 조력 조합 (과거 당첨 흐름수 전면 배제)
        boostElement(w, ctx.dayEl, 4); // 내 본원(일간) 오행 강화
        boostElement(w, ctx.minElement, 3); // 결핍 오행 조화
        // ★ 대표님 지침: D게임도 10번대 이상부터 시원하게 시작 (단번대 1~9 제외)
        for (let n = 1; n <= 9; n++) w[n] = 0;
        break;
      }
      case 'E': // 5행 균형: 오행별 1개씩 + 자유 1개
        break;
      default:
        break;
    }
    applyGod(w, ctx.god, ctx);

    // 오늘의 수호수 및 수호수 확장수(끝자리 일치 번호) 출현 빈도 강화
    if (ctx.guardianA) {
      if (w[ctx.guardianA] > 0) w[ctx.guardianA] *= 2.5;
      for (let n = 10; n <= 45; n++) {
        if (n % 10 === ctx.guardianA % 10 && w[n] > 0) w[n] *= 2;
      }
    }
    if (ctx.guardianB) {
      if (w[ctx.guardianB] > 0) w[ctx.guardianB] *= 2.5;
      for (let n = 10; n <= 45; n++) {
        if (n % 10 === ctx.guardianB % 10 && w[n] > 0) w[n] *= 2;
      }
    }
    if (role === 'E') {
      const tmp = w.slice();
      EL_ORDER.forEach((el) => {
        const only = new Array(46).fill(0);
        for (let n = 1; n <= 45; n++) if (elOf(n) === el) only[n] = tmp[n];
        forced.push(pickOne(only, rnd));
      });
    }
    return { w, forced };
  }

  // ---------------------------------------------------------------
  // 통계 균형 필터
  // ---------------------------------------------------------------
  function stats(nums) {
    const s = nums.slice().sort((a, b) => a - b);
    let low = 0, odd = 0, sum = 0, high = 0, pairs = 0, triple = false;
    s.forEach((n, i) => {
      if (n <= 22) low++;
      if (n % 2 === 1) odd++;
      if (n >= 32) high++;
      sum += n;
      if (i > 0 && s[i] - s[i - 1] === 1) {
        pairs++;
        if (i > 1 && s[i - 1] - s[i - 2] === 1) triple = true;
      }
    });
    return { low, odd, sum, high, pairs, triple, spread: s[5] - s[0] };
  }
  function passes(nums, god, level) {
    if (nums.length !== 6 || new Set(nums).size !== 6) return false;
    const st = stats(nums);
    if (st.triple) return false;                                   // 3연번 이상 금지 (항상)
    if (level === 'any') return true;
    if (st.pairs > (god === '상관' ? 2 : 1)) return false;
    if (god === '상관' && st.pairs < 1) return false;              // 상관: 연번 한 쌍 필수
    if (level === 'basic') return st.low >= 1 && st.low <= 5;
    const lowOk = god === '정관' ? st.low === 3 : (st.low >= 2 && st.low <= 4);
    return lowOk &&
      st.odd >= 2 && st.odd <= 4 &&
      st.sum >= 100 && st.sum <= 175 &&
      st.spread >= 25 &&
      st.high >= 2;                                                // 생일(1~31) 쏠림 회피
  }
  function overlap(a, b) {
    return a.filter((n) => b.includes(n)).length;
  }

  // ---------------------------------------------------------------
  // 5게임 생성
  // ---------------------------------------------------------------
  /**
   * @param {object} o
   *  - key         시드 문자열 (생년월일시|성별|지역|오늘날짜|장수 …)
   *  - minElement  결핍 오행 ('wood'…)
   *  - dayEl       일간 오행
   *  - god         오늘의 십신 (예: '편재') 또는 null
   *  - hucheon     후천수 배열
   *  - recent      직전 회차 당첨번호
   *  - hot, cold   참고용 번호 목록
   * @returns {{games:Array<{role,numbers}>, god, recipe}}
   */
  function generateGames(o) {
    const guardianA = o.guardianA || (o.guardian && o.guardian[0]) || null;
    const guardianB = o.guardianB || (o.guardian && o.guardian[1]) || null;
    const ctx = {
      minElement: o.minElement, dayEl: o.dayEl || o.minElement, god: o.god || null,
      hucheon: o.hucheon || [], recent: o.recent || [], hot: o.hot || [], cold: o.cold || [],
      guardianA, guardianB
    };
    const games = [];

    ['A', 'B', 'C', 'D', 'E'].forEach((role) => {
      const rnd = mulberry32(hash32(o.key + '|' + role));
      const levels = ['strict', 'basic', 'any'];
      let result = null;
      for (let li = 0; li < levels.length && !result; li++) {
        const tries = li === 0 ? 500 : 250;
        for (let t = 0; t < tries; t++) {
          const { w, forced } = buildRole(role, ctx, rnd);

          // 사주와 로또번호의 완벽한 일치: 오늘의 수호수 (2개 번호 한 게임에 동시 탑재)
          if (role === 'A') {
            if (guardianB && !forced.includes(guardianB)) forced.push(guardianB);
            if (guardianA && !forced.includes(guardianA)) forced.push(guardianA);
          }

          const nums = sampleSix(w, rnd, forced);
          if (!passes(nums, ctx.god, levels[li])) continue;

          // 게임 간 1:1 중복 검사 (최대 3개 이하)
          if (games.some((g) => overlap(g.numbers, nums) > (li === 0 ? 3 : 4))) continue;

          // ★ 대표님 지시 반영: 일반 번호는 최대 2회, 오늘의 수호수는 최대 3회까지 허용!
          if (li < 2) {
            const wouldExceedLimit = nums.some((n) => {
              const isGuardian = (n === guardianA || n === guardianB);
              const limit = isGuardian ? 3 : 2;
              const count = games.reduce((acc, g) => acc + (g.numbers.includes(n) ? 1 : 0), 0);
              return count >= limit;
            });
            if (wouldExceedLimit) continue;
          }

          result = nums;
          break;
        }
      }
      if (!result) { // 최후의 안전장치: 균등 추첨
        const rnd2 = mulberry32(hash32(o.key + '|fallback|' + role));
        result = sampleSix(newWeights(), rnd2, []);
      }
      games.push({ role, numbers: result });
    });
    return { games, god: ctx.god, recipe: ctx.god ? GOD_RECIPE[ctx.god] : null };
  }

  const api = { generateGames, stats, passes, elOf, hash32, GOD_RECIPE };
  global.LottoEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

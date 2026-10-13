/* =====================================================================
 * 사주로또 v5 - 만세력 엔진 (브라우저 내부 연산 / 외부 통신 0회)
 *
 * - 연주: 입춘 기준 / 월주: 12절(節) 기준 / 일주: 율리우스일 60갑자 / 시주: 일간 기준
 * - 절기 시각은 태양 황경(0.01도 이내) 천문 계산으로 구하고 한국 표준시(KST)로 환산
 * - 대운: 성별·연간 음양에 따른 순행/역행, 절기까지의 일수 3일 = 1년
 *
 * [한계 - 정직 고지]
 * - 출생 시각은 '시진(2시간)'만 입력받으므로 시진 중앙값으로 절기 경계를 판단합니다.
 *   절기 당일 출생자는 하루 차이가 날 수 있습니다.
 * - 과거 한국 표준시 변경(1954~61 등)과 서머타임은 반영하지 않습니다.
 * - 야자시/조자시 구분 없이 달력 날짜 기준 일주를 사용합니다.
 * ===================================================================== */
(function (global) {
  'use strict';

  const GAN   = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  const GAN_H = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const JI    = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  const JI_H  = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const EL_ORDER = ['wood', 'fire', 'earth', 'metal', 'water']; // 상생 순서
  const EL_KOR   = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
  const GAN_EL   = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
  const JI_EL    = ['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water'];
  // 지지 본기(주된 천간): 자-계, 축-기, 인-갑, 묘-을, 진-무, 사-병, 오-정, 미-기, 신-경, 유-신, 술-무, 해-임
  const JI_MAIN_GAN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

  const GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }; // 상생
  const CTL = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' }; // 상극

  const mod = (n, m) => ((n % m) + m) % m;
  const RAD = Math.PI / 180;

  // ---------------------------------------------------------------
  // 날짜 / 율리우스일
  // ---------------------------------------------------------------
  function toJDN(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const y2 = y + 4800 - a;
    const m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }

  /** 일주 60갑자 인덱스 (0=갑자). 기준: 2000-01-01 = 무오일(54), 2024-01-01 = 갑자일(0) */
  function dayIndex(y, m, d) { return mod(toJDN(y, m, d) + 49, 60); }

  function jdOfUTC(y, m, d, hour) { return toJDN(y, m, d) - 0.5 + hour / 24; }

  function jdToKst(jd) {
    const t = new Date((jd - 2440587.5) * 86400000 + 9 * 3600000);
    return {
      y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
      h: t.getUTCHours(), mi: t.getUTCMinutes()
    };
  }

  // ---------------------------------------------------------------
  // 태양 황경 / 절기
  // ---------------------------------------------------------------
  function sunLongitude(jd) {
    const T = (jd - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
            + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
            + 0.000289 * Math.sin(3 * M);
    const omega = (125.04 - 1934.136 * T) * RAD;
    return mod(L0 + C - 0.00569 - 0.00478 * Math.sin(omega), 360);
  }

  /** 해당 연도에 태양 황경이 lon도가 되는 시각(JD, UT) */
  function termJD(year, lon) {
    let jd = jdOfUTC(year, 3, 20, 12) + (lon / 360) * 365.2422;
    if (jd >= jdOfUTC(year + 1, 1, 1, 0)) jd -= 365.2422;
    for (let i = 0; i < 6; i++) {
      let diff = lon - sunLongitude(jd);
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      jd += diff / 0.9856;
    }
    return jd;
  }

  // 12절(節): 월의 시작 절기. ji = 해당 월의 지지 인덱스
  const JEOLGI = [
    { lon: 285, ji: 1,  name: '소한' }, { lon: 315, ji: 2,  name: '입춘' },
    { lon: 345, ji: 3,  name: '경칩' }, { lon: 15,  ji: 4,  name: '청명' },
    { lon: 45,  ji: 5,  name: '입하' }, { lon: 75,  ji: 6,  name: '망종' },
    { lon: 105, ji: 7,  name: '소서' }, { lon: 135, ji: 8,  name: '입추' },
    { lon: 165, ji: 9,  name: '백로' }, { lon: 195, ji: 10, name: '한로' },
    { lon: 225, ji: 11, name: '입동' }, { lon: 255, ji: 0,  name: '대설' }
  ];
  const termCache = {};
  function jeolgiList(year) {
    if (!termCache[year]) {
      termCache[year] = JEOLGI.map(t => ({ jd: termJD(year, t.lon), ji: t.ji, name: t.name, lon: t.lon }));
    }
    return termCache[year];
  }

  // ---------------------------------------------------------------
  // 간지 유틸
  // ---------------------------------------------------------------
  function ganjiIdx(gan, ji) {
    for (let i = 0; i < 60; i++) if (i % 10 === gan && i % 12 === ji) return i;
    return -1;
  }
  function pillarOf(idx) {
    const g = idx % 10;
    const j = idx % 12;
    return {
      idx, gan: g, ji: j,
      ganKor: GAN[g], jiKor: JI[j],
      ganHan: GAN_H[g], jiHan: JI_H[j],
      kor: GAN[g] + JI[j],
      han: GAN_H[g] + JI_H[j],
      ganEl: GAN_EL[g], jiEl: JI_EL[j]
    };
  }

  /** 십신: 일간(dayGan) 기준으로 다른 천간(otherGan)이 무엇인지 */
  function tenGod(dayGan, otherGan) {
    const a = GAN_EL[dayGan], b = GAN_EL[otherGan];
    const same = (dayGan % 2) === (otherGan % 2);
    if (a === b) return same ? '비견' : '겁재';
    if (GEN[a] === b) return same ? '식신' : '상관';
    if (CTL[a] === b) return same ? '편재' : '정재';
    if (CTL[b] === a) return same ? '편관' : '정관';
    return same ? '편인' : '정인';
  }

  // ---------------------------------------------------------------
  // 사주 원국 + 오행 + 대운
  // ---------------------------------------------------------------
  /**
   * @param {string} dateStr 양력 'YYYY-MM-DD'
   * @param {number} hour    시진 시작시각(0,2,...,22) 또는 -1(모름)
   * @param {string} gender  'male' | 'female'
   */
  function computeChart(dateStr, hour, gender) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const hasHour = (typeof hour === 'number' && !isNaN(hour) && hour >= 0);
    const clock = hasHour ? hour + 0.5 : 12; // 시진 중앙값 (예: 오시 11:30~13:29 → 12:30)
    const birthJD = jdOfUTC(y, m, d, 0) + (clock - 9) / 24;

    // 연주 (입춘 기준)
    const lichun = jeolgiList(y)[1].jd;
    const yearForPillar = birthJD < lichun ? y - 1 : y;
    const yearIdx = mod(yearForPillar - 4, 60);
    const yearGan = yearIdx % 10;

    // 월주 (직전 절기 기준)
    const terms = [jeolgiList(y - 1)[11]].concat(jeolgiList(y));
    let cur = terms[0];
    terms.forEach(t => { if (t.jd <= birthJD) cur = t; });
    const monthJi = cur.ji;
    const monthGan = (mod(yearGan, 5) * 2 + 2 + mod(monthJi - 2, 12)) % 10;
    const monthIdx = ganjiIdx(monthGan, monthJi);

    // 일주
    const dayIdx = dayIndex(y, m, d);
    const dayGan = dayIdx % 10;

    // 시주
    let timeIdx = null;
    if (hasHour) {
      const tJi = Math.round(hour / 2) % 12;
      const tGan = (mod(dayGan, 5) * 2 + tJi) % 10;
      timeIdx = ganjiIdx(tGan, tJi);
    }

    const pillars = {
      year: pillarOf(yearIdx), month: pillarOf(monthIdx), day: pillarOf(dayIdx),
      time: timeIdx === null ? null : pillarOf(timeIdx)
    };

    // 각 기둥별 십신 판별
    ['year', 'month', 'day', 'time'].forEach(k => {
      const p = pillars[k];
      if (!p) return;
      p.ganGod = (k === 'day') ? '본원' : tenGod(dayGan, p.gan);
      p.jiGod = tenGod(dayGan, JI_MAIN_GAN[p.ji]);
    });

    // 오행 분포: 사주 글자(천간+지지 본기)의 오행 개수
    const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    ['year', 'month', 'day', 'time'].forEach(k => {
      const p = pillars[k];
      if (!p) return;
      counts[p.ganEl]++;
      counts[p.jiEl]++;
    });
    const total = EL_ORDER.reduce((s, k) => s + counts[k], 0);
    const ohaengPercent = {};
    let used = 0;
    const rema = EL_ORDER.map(k => {
      const raw = counts[k] / total * 100;
      ohaengPercent[k] = Math.floor(raw);
      used += ohaengPercent[k];
      return { k, r: raw - Math.floor(raw) };
    }).sort((a, b) => b.r - a.r);
    for (let i = 0; i < 100 - used; i++) ohaengPercent[rema[i % 5].k]++;

    // 결핍/왕성 오행 (동률이면 일간을 돕는 쪽을 결핍으로 우선)
    const dayEl = GAN_EL[dayGan];
    const di = EL_ORDER.indexOf(dayEl);
    const prio = [mod(di - 1, 5), di, mod(di + 1, 5), mod(di + 2, 5), mod(di + 3, 5)].map(i => EL_ORDER[i]);
    let minElement = prio[0], maxElement = dayEl;
    prio.forEach(k => { if (counts[k] < counts[minElement]) minElement = k; });
    [dayEl].concat(prio.filter(k => k !== dayEl)).forEach(k => { if (counts[k] > counts[maxElement]) maxElement = k; });

    // 대운
    const yangYear = yearGan % 2 === 0;
    const forward = (yangYear && gender === 'male') || (!yangYear && gender !== 'male');
    const allTerms = jeolgiList(y - 1).concat(jeolgiList(y), jeolgiList(y + 1));
    let target = allTerms[0];
    if (forward) {
      target = allTerms.find(t => t.jd > birthJD) || target;
    } else {
      allTerms.forEach(t => { if (t.jd <= birthJD) target = t; });
    }
    const startAge = Math.max(1, Math.round(Math.abs(target.jd - birthJD) / 3));
    const list = [];
    for (let i = 0; i < 8; i++) {
      const p = pillarOf(mod(monthIdx + (forward ? i + 1 : -(i + 1)), 60));
      p.startAge = startAge + i * 10;
      p.endAge = p.startAge + 9;
      p.god = tenGod(dayGan, p.gan);
      list.push(p);
    }

    return {
      dateStr, hasHour, birthYear: y, pillars, counts, ohaengPercent, minElement, maxElement,
      dayGan, dayGanKor: GAN[dayGan], dayGanHan: GAN_H[dayGan], dayGanEl: dayEl,
      daeun: { forward, startAge, list }
    };
  }

  // ---------------------------------------------------------------
  // 오늘의 일진 (한국 표준시 기준)
  // ---------------------------------------------------------------
  function todayPillar(date) {
    const t = new Date((date || new Date()).getTime() + 9 * 3600000);
    const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate();
    const p = pillarOf(dayIndex(y, m, d));
    p.y = y; p.m = m; p.d = d; p.weekday = t.getUTCDay();
    p.key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return p;
  }

  /** 내 일간(dayGan) 기준 오늘의 십신(천간 십신 / 지지 십신) */
  function dailyReading(dayGan, date) {
    const tp = todayPillar(date);
    tp.god = tenGod(dayGan, tp.gan);
    tp.godBranch = tenGod(dayGan, JI_MAIN_GAN[tp.ji]);
    return tp;
  }

  const api = {
    GAN, GAN_H, JI, JI_H, EL_ORDER, EL_KOR, GAN_EL, JI_EL, JI_MAIN_GAN,
    computeChart, tenGod, todayPillar, dailyReading, pillarOf, dayIndex,
    _termJD: termJD, _jdToKst: jdToKst
  };
  global.SajuEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

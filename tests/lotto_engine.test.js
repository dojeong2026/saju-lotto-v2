// node tests/lotto_engine.test.js  — 번호 엔진 자동 검증
const SajuEngine = require('../v5_saju_engine.js');
const LottoEngine = require('../v5_lotto_engine.js');

const HOT = [34, 18, 27, 12, 1, 43, 20, 13, 33, 4, 17, 26, 40, 14, 45, 9, 24, 38, 44, 35];
const COLD = [7, 23, 15, 2, 31];
const RECENT = [4, 5, 25, 28, 32, 42];
const HUCHEON = { wood: [3, 4], fire: [9], earth: [2, 5, 8], metal: [6, 7], water: [1] };
const OHAENG_BALLS = {
  wood: [3, 8, 13, 18, 23, 28, 33, 38, 43], fire: [2, 7, 12, 17, 22, 27, 32, 37, 42],
  earth: [5, 10, 15, 20, 25, 30, 35, 40, 45], metal: [4, 9, 14, 19, 24, 29, 34, 39, 44],
  water: [1, 6, 11, 16, 21, 26, 31, 36, 41]
};
const GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('  ✗ FAIL:', msg); } };

// 재현 가능한 무작위 프로필
let s = 12345;
const rng = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
function randProfile() {
  const y = 1940 + Math.floor(rng() * 70), m = 1 + Math.floor(rng() * 12), d = 1 + Math.floor(rng() * 28);
  const hour = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22][Math.floor(rng() * 12)];
  return { dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, hour, gender: rng() < 0.5 ? 'male' : 'female' };
}

// 구버전 로직 (비교용)
function oldGames(minElement, seed) {
  const parent = { wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal' }[minElement];
  const mb = OHAENG_BALLS[minElement], pb = OHAENG_BALLS[parent], H = HOT, R = RECENT;
  const raw = [
    [mb[seed % 3], mb[3 + (seed % 3)], mb[6 + (seed % 3)], H[(seed + 1) % 20], H[(seed + 4) % 20], H[(seed + 7) % 20]],
    [mb[(seed + 2) % 9], mb[(seed + 5) % 9], H[(seed + 2) % 20], H[(seed + 8) % 20], H[(seed + 12) % 20], 30 + ((seed * 7) % 15) + 1],
    [pb[seed % 4], pb[4 + (seed % 5)], mb[(seed + 1) % 4], mb[4 + ((seed + 2) % 5)], H[(seed + 3) % 20], H[(seed + 9) % 20]],
    [R[seed % 6], R[(seed + 2) % 6], mb[(seed + 3) % 9], mb[(seed + 7) % 9], H[(seed + 5) % 20], H[(seed + 10) % 20]],
    [OHAENG_BALLS.wood[(seed + 1) % 9], OHAENG_BALLS.fire[(seed + 2) % 9], OHAENG_BALLS.earth[(seed + 3) % 9], OHAENG_BALLS.metal[(seed + 4) % 9], OHAENG_BALLS.water[(seed + 5) % 9], H[(seed + 6) % 20]]
  ];
  return raw.map((g) => {
    let u = Array.from(new Set(g)).slice(0, 6), i = 0;
    while (u.length < 6) { const c = H[i++ % 20]; if (!u.includes(c)) u.push(c); }
    return u.sort((a, b) => a - b);
  });
}

const N = 3000;
const profiles = Array.from({ length: N }, randProfile);
const charts = profiles.map((p) => SajuEngine.computeChart(p.dateStr, p.hour, p.gender));

// 1) 유효성 · 균형 · 게임 간 중복
console.log('① 유효성 / 통계 균형 (프로필', N, '× 십신 10종 × 5게임)');
let total = 0, strictPass = 0, maxOverlap = 0, lowSum = {}, lowCnt = {};
profiles.forEach((p, i) => {
  const c = charts[i];
  GODS.forEach((god) => {
    const r = LottoEngine.generateGames({
      key: `${p.dateStr}|${p.hour}|${p.gender}|2026-10-14|0|${god}`, minElement: c.minElement, dayEl: c.dayGanEl,
      god, hucheon: HUCHEON[c.minElement], recent: RECENT, hot: HOT, cold: COLD
    });
    ok(r.games.length === 5, '게임 수 5');
    r.games.forEach((g, gi) => {
      total++;
      const n = g.numbers;
      ok(n.length === 6 && new Set(n).size === 6, `중복/개수 오류 ${n}`);
      ok(n.every((v) => v >= 1 && v <= 45 && Number.isInteger(v)), `범위 오류 ${n}`);
      ok(n.every((v, k) => k === 0 || v > n[k - 1]), `정렬 오류 ${n}`);
      ok(!LottoEngine.stats(n).triple, `3연번 ${n}`);
      if (LottoEngine.passes(n, god, 'strict')) strictPass++;
      for (let h = 0; h < gi; h++) {
        const o = n.filter((v) => r.games[h].numbers.includes(v)).length;
        if (o > maxOverlap) maxOverlap = o;
      }
      const st = LottoEngine.stats(n);
      lowSum[god] = (lowSum[god] || 0) + st.low; lowCnt[god] = (lowCnt[god] || 0) + 1;
    });
  });
});
console.log(`  총 ${total}게임, 엄격 필터 통과율 ${(strictPass / total * 100).toFixed(2)}%, 게임 간 최대 중복 ${maxOverlap}개`);
ok(strictPass / total > 0.97, '엄격 필터 통과율 97% 이상');
ok(maxOverlap <= 4, '게임 간 중복 4개 이하');

// 2) 결정성
console.log('② 결정성 (같은 입력=같은 결과, 날짜 바뀌면 달라짐)');
const p0 = profiles[0], c0 = charts[0];
const mk = (day) => LottoEngine.generateGames({ key: `${p0.dateStr}|${day}`, minElement: c0.minElement, dayEl: c0.dayGanEl, god: '편재', hucheon: HUCHEON[c0.minElement], recent: RECENT, hot: HOT, cold: COLD }).games.map((g) => g.numbers.join(','));
ok(JSON.stringify(mk('d1')) === JSON.stringify(mk('d1')), '동일 입력 동일 결과');
ok(JSON.stringify(mk('d1')) !== JSON.stringify(mk('d2')), '날짜 다르면 다른 결과');

// 3) 십신별 성향 (문서 원리 반영 여부)
console.log('③ 십신별 낮은 수(1~22) 평균 개수');
const avgLow = (g) => (lowSum[g] / lowCnt[g]).toFixed(2);
GODS.forEach((g) => console.log(`  ${g}: ${avgLow(g)}`));
ok(avgLow('식신') > avgLow('편재'), '식신(낮은 수)이 편재(높은 수)보다 낮은 수가 많아야 함');
ok(Math.abs(avgLow('정관') - 3) < 0.001, '정관은 항상 3:3');

// 4) 역할 충실도: A게임은 결핍 오행 번호가 실제로 많은가
console.log('④ A게임 결핍 오행 번호 평균 개수 (구버전 vs 신버전)');
let newA = 0, oldA = 0;
profiles.forEach((p, i) => {
  const c = charts[i];
  const r = LottoEngine.generateGames({ key: `${p.dateStr}|${p.hour}|x`, minElement: c.minElement, dayEl: c.dayGanEl, god: '정재', hucheon: HUCHEON[c.minElement], recent: RECENT, hot: HOT, cold: COLD });
  newA += r.games[0].numbers.filter((n) => LottoEngine.elOf(n) === c.minElement).length;
  const seed = Number(p.dateStr.slice(0, 4)) * 365 + Number(p.dateStr.slice(5, 7)) * 31 + Number(p.dateStr.slice(8)) + p.hour + 32;
  oldA += oldGames(c.minElement, seed)[0].filter((n) => LottoEngine.elOf(n) === c.minElement).length;
});
console.log(`  구버전 ${(oldA / N).toFixed(2)}개  →  신버전 ${(newA / N).toFixed(2)}개`);
ok(newA / N >= 2.5, 'A게임 결핍 오행 번호 2.5개 이상');

// 5) 다양성: 서로 다른 사람이 같은 5게임을 받는 비율
console.log('⑤ 서로 다른 사람이 받은 5게임 세트 중복률');
const oldSet = new Set(), newSet = new Set(), oldNum = {}, newNum = {};
profiles.forEach((p, i) => {
  const c = charts[i];
  const seed = Number(p.dateStr.slice(0, 4)) * 365 + Number(p.dateStr.slice(5, 7)) * 31 + Number(p.dateStr.slice(8)) + p.hour + 32;
  const og = oldGames(c.minElement, seed);
  oldSet.add(og.map((g) => g.join(',')).join('/'));
  og.forEach((g) => g.forEach((n) => { oldNum[n] = (oldNum[n] || 0) + 1; }));
  const r = LottoEngine.generateGames({ key: `${p.dateStr}|${p.hour}|${p.gender}|2026-10-14|0`, minElement: c.minElement, dayEl: c.dayGanEl, god: '편재', hucheon: HUCHEON[c.minElement], recent: RECENT, hot: HOT, cold: COLD });
  newSet.add(r.games.map((g) => g.numbers.join(',')).join('/'));
  r.games.forEach((g) => g.numbers.forEach((n) => { newNum[n] = (newNum[n] || 0) + 1; }));
});
console.log(`  구버전 서로 다른 세트 ${oldSet.size}/${N},  신버전 ${newSet.size}/${N}`);
ok(newSet.size > oldSet.size, '신버전이 더 다양해야 함');
const cover = (m) => Object.keys(m).length;
console.log(`  사용된 번호 종류(1~45): 구버전 ${cover(oldNum)}개, 신버전 ${cover(newNum)}개`);
ok(cover(newNum) === 45, '45개 번호 모두 사용 가능');
const top = (m) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => `${n}(${(c / (N * 5) * 100).toFixed(1)}%)`).join(' ');
console.log(`  구버전 상위 5번호 점유율: ${top(oldNum)}`);
console.log(`  신버전 상위 5번호 점유율: ${top(newNum)}`);

console.log(fails === 0 ? '\n✅ 모든 검증 통과' : `\n❌ 실패 ${fails}건`);
process.exit(fails === 0 ? 0 : 1);

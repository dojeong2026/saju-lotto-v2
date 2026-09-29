// 60갑자 및 천간/지지 정의
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 오행 매핑 정보 및 심층 해설 DB
const ELEMENT_MAP = {
    // 천간
    '甲': { name: '木', class: 'wood-color', numbers: [3, 8, 13, 18, 23, 28, 33, 38, 43] },
    '乙': { name: '木', class: 'wood-color', numbers: [3, 8, 13, 18, 23, 28, 33, 38, 43] },
    '丙': { name: '火', class: 'fire-color', numbers: [2, 7, 12, 17, 22, 27, 32, 37, 42] },
    '丁': { name: '火', class: 'fire-color', numbers: [2, 7, 12, 17, 22, 27, 32, 37, 42] },
    '戊': { name: '土', class: 'earth-color', numbers: [5, 10, 15, 20, 25, 30, 35, 40, 45] },
    '己': { name: '土', class: 'earth-color', numbers: [5, 10, 15, 20, 25, 30, 35, 40, 45] },
    '庚': { name: '金', class: 'metal-color', numbers: [4, 9, 14, 19, 24, 29, 34, 39, 44] },
    '辛': { name: '金', class: 'metal-color', numbers: [4, 9, 14, 19, 24, 29, 34, 39, 44] },
    '壬': { name: '水', class: 'water-color', numbers: [1, 6, 11, 16, 21, 26, 31, 36, 41] },
    '癸': { name: '水', class: 'water-color', numbers: [1, 6, 11, 16, 21, 26, 31, 36, 41] },

    // 지지
    '寅': { name: '木', class: 'wood-color', numbers: [3, 8, 13, 18, 23, 28, 33, 38, 43] },
    '卯': { name: '木', class: 'wood-color', numbers: [3, 8, 13, 18, 23, 28, 33, 38, 43] },
    '巳': { name: '火', class: 'fire-color', numbers: [2, 7, 12, 17, 22, 27, 32, 37, 42] },
    '午': { name: '火', class: 'fire-color', numbers: [2, 7, 12, 17, 22, 27, 32, 37, 42] },
    '辰': { name: '土', class: 'earth-color', numbers: [5, 10, 15, 20, 25, 30, 35, 40, 45] },
    '戌': { name: '土', class: 'earth-color', numbers: [5, 10, 15, 20, 25, 30, 35, 40, 45] },
    '丑': { name: '土', class: 'earth-color', numbers: [5, 10, 15, 20, 25, 30, 35, 40, 45] },
    '未': { name: '土', class: 'earth-color', numbers: [5, 10, 15, 20, 25, 30, 35, 40, 45] },
    '申': { name: '金', class: 'metal-color', numbers: [4, 9, 14, 19, 24, 29, 34, 39, 44] },
    '酉': { name: '金', class: 'metal-color', numbers: [4, 9, 14, 19, 24, 29, 34, 39, 44] },
    '子': { name: '水', class: 'water-color', numbers: [1, 6, 11, 16, 21, 26, 31, 36, 41] },
    '亥': { name: '水', class: 'water-color', numbers: [1, 6, 11, 16, 21, 26, 31, 36, 41] }
};

// 오행 심층 해석 라이브러리
const ELEMENT_DETAILS = {
    '木': {
        title: "푸른 나무의 기운 (木)",
        desc: "목(木)은 시작과 솟구치는 생명력, 기획력을 의미합니다. 사주에 목 기운이 적절하면 무언가를 새롭게 개척하는 아이디어가 풍부해집니다. 로또 수리학적으로 **끝자리가 3과 8인 숫자**에 해당하며, 재물운의 발판을 마련해주는 시드머니 기운을 공급합니다.",
        icon: "🌲"
    },
    '火': {
        title: "붉은 불의 기운 (火)",
        desc: "화(火)는 확산, 열정, 드러남을 의미합니다. 사주에 화가 활성화되면 횡재수나 어두운 팔자를 밝게 비춰주는 촉매 역할을 하여 일확천금의 행운을 끌어당깁니다. 수리학적으로 **끝자리가 2와 7인 숫자**에 속하며, 복권 당첨의 순간적인 뇌전과 같은 짜릿한 충격을 가져다줍니다.",
        icon: "🔥"
    },
    '土': {
        title: "황색 흙의 기운 (土)",
        desc: "토(土)는 신뢰, 포용력, 중심을 의미합니다. 사주의 다양한 원소들을 중재하고 모아진 재물을 한곳에 흔들림 없이 가두어 주는 '창고(庫)' 역할을 합니다. 수리학적으로 **끝자리가 5와 0인 숫자**에 해당하며, 당첨된 행운 재산이 흩어지지 않고 단단하게 뭉치도록 지켜줍니다.",
        icon: "⛰️"
    },
    '金': {
        title: "하얀 쇠의 기운 (金)",
        desc: "금(金)은 결단, 결실, 날카로운 수확을 의미합니다. 가을철 열매를 수확하듯 인생의 큰 결실과 결단을 가져오며, 한번에 큰돈을 꽉 움켜쥐는 정밀한 판단력과 금전 복을 가져다 줍니다. 수리학적으로 **끝자리가 4와 9인 숫자**에 해당하며, 행운의 당첨 공을 움켜쥐는 강력한 당첨 운입니다.",
        icon: "💎"
    },
    '水': {
        title: "검은 물의 기운 (水)",
        desc: "수(水)는 흐름, 지혜, 유연한 순환을 의미합니다. 막히지 않고 아래로 흐르는 물처럼 금전의 유통과 기막힌 우연들이 꼬리를 물고 유기적으로 흐르도록 돕습니다. 수리학적으로 **끝자리가 1과 6인 숫자**에 해당하며, 복권방으로 향하는 발걸음과 횡재수의 물길을 열어줍니다.",
        icon: "🌊"
    }
};

// 글로벌 상태 관리
let currentStep = 5; // 즉시 5단계 점프 검수용!
let selectedWish = 'wealth'; // 기본값
let currentSajuResult = {
    analysis: { yongshin: '木', heeshin: '火', isStrong: true },
    fixedNums: [7, 24],
    excludeNums: [4, 13]
};
let membershipState = 'free'; // 기본값 free 설정 (사용자 무료 모드 테스트)
let rerollCount = 3;

// 초기화
window.addEventListener('DOMContentLoaded', () => {
    // 5단계 디버깅 데이터 주입 (더미 데이터)
    currentSajuResult = {
        analysis: { yongshin: '木', heeshin: '火', isStrong: true },
        fixedNums: [7, 24],
        excludeNums: [4, 13]
    };
    selectedWish = 'wealth';
    
    // 1. UI 렌더링을 먼저 수행하여 HTML에 번호와 상태를 바인딩합니다!
    renderStep5UI();
    
    // 2. 그 다음 5단계 섹션을 보여주고 다른 단계를 숨깁니다!
    goToStep(5);
    
    // 태어난 시간 드롭다운 초기 12시 세팅
    updateTimeDropdown(12);
});

// 태어난 시간(시) 드롭다운 선택에 따른 단순화 프리뷰 매핑
function updateTimeDropdown(hour) {
    hour = parseInt(hour);
    
    // 시지 인덱스 구하기
    const sajiIdx = Math.floor(((hour + 1) % 24) / 2);
    const sajiName = BRANCHES[sajiIdx];
    
    const timeRanges = [
        "23:30 ~ 01:30", "01:30 ~ 03:30", "03:30 ~ 05:30", "05:30 ~ 07:30",
        "07:30 ~ 09:30", "09:30 ~ 11:30", "11:30 ~ 13:30", "13:30 ~ 15:30",
        "15:30 ~ 17:30", "17:30 ~ 19:30", "19:30 ~ 21:30", "21:30 ~ 23:30"
    ];
    
    // 복잡한 오행 설명 없이 깔끔하게 한 줄로 시지 정보만 출력
    document.getElementById('time-preview').innerHTML = `
        <span class="preview-saji">${sajiName}시 (${timeRanges[sajiIdx]})</span>
    `;
}

// 시간 모름 체크박스 토글
function toggleTimeUnknown(checkbox) {
    const select = document.getElementById('birth-hour-select');
    const preview = document.getElementById('time-preview');
    
    if (checkbox.checked) {
        select.disabled = true;
        preview.classList.add('disabled');
        preview.innerHTML = `
            <span class="preview-saji">시간 모름 (가중치 자동 매핑)</span>
        `;
    } else {
        select.disabled = false;
        preview.classList.remove('disabled');
        updateTimeDropdown(select.value);
    }
}

// 1단계: 기원 선택
function selectWish(wishType) {
    selectedWish = wishType;
    // 1단계 카드에서 활성화 제거 후 다음 단계로
    nextStep();
}

// 5단계 멀티 스텝 네비게이션 제어
function goToStep(step) {
    if (step < 1 || step > 5) return;
    
    // 비활성화
    document.querySelectorAll('.card').forEach(card => card.classList.remove('active'));
    
    // 활성화
    const targetSection = document.getElementById(`step-${step}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    currentStep = step;
    updateStepUI();
}

function nextStep() {
    goToStep(currentStep + 1);
}

function prevStep() {
    goToStep(currentStep - 1);
}

// 스텝 바 UI 업데이트
function updateStepUI() {
    const dots = document.querySelectorAll('.step-dot');
    const bar = document.getElementById('indicator-bar');
    
    // 게이지 선 비율
    const percentage = ((currentStep - 1) / 4) * 100;
    bar.style.width = `${percentage}%`;
    
    dots.forEach(dot => {
        const stepNum = parseInt(dot.getAttribute('data-step'));
        dot.className = 'step-dot';
        
        if (stepNum === currentStep) {
            dot.classList.add('active');
        } else if (stepNum < currentStep) {
            dot.classList.add('completed');
        }
    });
}

// 2단계에서 3단계로 넘어갈 때 (만세력 사주 분석 가동)
function goToStep3() {
    const birthDate = document.getElementById('birth-date').value;
    const isUnknown = document.getElementById('time-unknown').checked;
    let birthTime = 'unknown';
    
    if (!isUnknown) {
        const hourVal = parseInt(document.getElementById('birth-hour-select').value);
        // 24시간대 드롭다운 값을 12지 지지 인덱스로 환산
        birthTime = Math.floor(((hourVal + 1) % 24) / 2);
    }
    
    // 💡 날짜 유효성 검사 (연, 월, 일이 불완전하게 채워졌을 때 Invalid Date 오류 방어)
    const parsedDate = new Date(birthDate);
    if (!birthDate || isNaN(parsedDate.getTime())) {
        alert("태어난 날짜를 올바르게 입력해 주십시오. (연도, 월, 일을 모두 채우셔야 합니다.)");
        return;
    }
    
    // 💡 만세력 지원 하한선 방어 (1900년 이전)
    if (parsedDate < new Date('1900-01-31')) {
        alert("명리 계산의 정밀도를 위해 1900년 1월 31일 이후의 날짜를 선택해 주십시오.");
        return;
    }
    
    // 로딩 화면 표시
    document.getElementById('step-2-section').classList.remove('active');
    document.getElementById('loading-section').classList.add('active');
    
    const loadingTexts = [
        "수석님의 기원과 우주 60갑자 좌표계를 동기화하고 있습니다...",
        "절기와 윤달을 반영한 평생의 사주 팔자를 도출하는 중입니다...",
        "천간과 지지의 상생상극을 분석하여 용신(용사) 오행을 산출 중입니다...",
        "행동 지침과 수리학적 행운 필터 조합을 준비하고 있습니다..."
    ];
    
    let textIdx = 0;
    const interval = setInterval(() => {
        if (textIdx < loadingTexts.length) {
            document.getElementById('loading-text').textContent = loadingTexts[textIdx];
            textIdx++;
        }
    }, 850);
    
    setTimeout(() => {
        clearInterval(interval);
        
        const saju = calculateSaju(birthDate, birthTime);
        const analysis = analyzeElements(saju);
        
        currentSajuResult = { saju, analysis };
        
        // 3단계 UI 바인딩
        renderStep3UI(saju, analysis);
        
        // 로딩 끄고 3단계 진입
        document.getElementById('loading-section').classList.remove('active');
        goToStep(3);
    }, 3500);
}

// 4단계에서 최종 5단계로 넘어갈 때 (수리 융합 및 최종 릴리즈)
function generateLottoFinal() {
    // 고정수 및 제외수 입력값 파싱
    const fixedInput = document.getElementById('fixed-nums').value;
    const excludeInput = document.getElementById('exclude-nums').value;
    
    const fixedNums = parseNumbers(fixedInput, 2);
    const excludeNums = parseNumbers(excludeInput, 3);
    
    // 유효성 체크
    if (fixedNums.some(n => n < 1 || n > 45) || excludeNums.some(n => n < 1 || n > 45)) {
        alert("로또 번호는 1에서 45 사이의 숫자만 입력 가능합니다.");
        return;
    }
    
    // 교집합 확인
    const intersection = fixedNums.filter(n => excludeNums.includes(n));
    if (intersection.length > 0) {
        alert(`동일한 숫자(${intersection.join(', ')})를 고정수와 제외수에 동시에 설정할 수 없습니다.`);
        return;
    }
    
    // 전역 상태에 저장
    currentSajuResult.fixedNums = fixedNums;
    currentSajuResult.excludeNums = excludeNums;
    
    // 5단계 UI 바인딩
    renderStep5UI();
    
    // 5단계로 이동
    goToStep(5);
}

// 쉼표 구분 숫자 파싱 헬퍼
function parseNumbers(inputStr, maxCount) {
    if (!inputStr.trim()) return [];
    return inputStr.split(',')
        .map(val => parseInt(val.trim()))
        .filter(val => !isNaN(val))
        .slice(0, maxCount);
}

// -------------------------------------------------------------
// 사주 계산 코어 엔진 (1차 구현 검증 성공 버전 베이스)
function calculateSaju(dateString, timeIndex) {
    const targetDate = new Date(dateString);
    const baseDate = new Date('1900-01-31');
    const diffDays = Math.floor((targetDate - baseDate) / (1000 * 60 * 60 * 24));
    
    // 연주(年柱)
    const year = targetDate.getFullYear();
    let yearOffset = (year - 4) % 60;
    if (yearOffset < 0) yearOffset += 60;
    const stemYear = STEMS[yearOffset % 10];
    const branchYear = BRANCHES[yearOffset % 12];
    
    // 월주(月柱)
    const month = targetDate.getMonth() + 1;
    const stemYearIndex = yearOffset % 10;
    const startMonthStemIndex = (stemYearIndex * 2 + 2) % 10;
    const monthOffset = (startMonthStemIndex + (month - 1)) % 10;
    const stemMonth = STEMS[monthOffset];
    const branchMonth = BRANCHES[(month + 1) % 12];
    
    // 일주(日柱)
    let dayOffset = (diffDays + 16) % 60;
    if (dayOffset < 0) dayOffset += 60;
    const stemDay = STEMS[dayOffset % 10];
    const branchDay = BRANCHES[dayOffset % 12];
    
    // 시주(時柱)
    let stemHour = '壬';
    let branchHour = '子';
    if (timeIndex !== 'unknown') {
        const idx = parseInt(timeIndex);
        branchHour = BRANCHES[idx];
        const dayStemIdx = dayOffset % 10;
        const startHourStemIdx = ((dayStemIdx % 5) * 2) % 10;
        stemHour = STEMS[(startHourStemIdx + idx) % 10];
    } else {
        branchHour = BRANCHES[(dayOffset + 4) % 12];
        const dayStemIdx = dayOffset % 10;
        stemHour = STEMS[(dayStemIdx + 2) % 10];
    }
    
    return {
        year: { stem: stemYear, branch: branchYear },
        month: { stem: stemMonth, branch: branchMonth },
        day: { stem: stemDay, branch: branchDay },
        hour: { stem: stemHour, branch: branchHour }
    };
}

// 오행 분량 및 신강신약, 용신 산출
function analyzeElements(saju) {
    const list = [
        saju.year.stem, saju.year.branch,
        saju.month.stem, saju.month.branch,
        saju.day.stem, saju.day.branch,
        saju.hour.stem, saju.hour.branch
    ];
    
    const counts = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    list.forEach(kanji => {
        const info = ELEMENT_MAP[kanji];
        if (info) counts[info.name]++;
    });
    
    const mySelfStem = saju.day.stem;
    const mySelfElement = ELEMENT_MAP[mySelfStem].name;
    
    const supporters = {
        '木': ['水', '木'],
        '火': ['木', '火'],
        '土': ['火', '土'],
        '金': ['土', '金'],
        '水': ['金', '水']
    };
    
    let myPower = 0;
    supporters[mySelfElement].forEach(el => {
        myPower += counts[el];
    });
    
    const isStrong = myPower >= 4;
    let yongshin = '木';
    let heeshin = '火';
    
    if (isStrong) {
        const offsetElements = {
            '木': ['火', '土', '金'],
            '火': ['土', '金', '水'],
            '土': ['金', '水', '木'],
            '金': ['水', '木', '火'],
            '水': ['木', '火', '土']
        };
        const targets = offsetElements[mySelfElement];
        targets.sort((a, b) => counts[a] - counts[b]);
        yongshin = targets[0];
        heeshin = targets[1];
    } else {
        const helpers = supporters[mySelfElement].slice();
        helpers.sort((a, b) => counts[a] - counts[b]);
        yongshin = helpers[0];
        heeshin = helpers[1] || mySelfElement;
    }
    
    // 결핍 오행이 존재하면 보완
    const zeroElements = Object.keys(counts).filter(el => counts[el] === 0);
    if (zeroElements.length > 0) {
        heeshin = yongshin;
        yongshin = zeroElements[0];
    }
    
    return { counts, mySelfElement, yongshin, heeshin, isStrong };
}

// -------------------------------------------------------------
// 3단계 UI 바인딩 및 인터랙티브 렌더링
function renderStep3UI(saju, analysis) {
    // 사주 천간지지 텍스트 매핑
    updatePillarElement('stem-year', saju.year.stem);
    updatePillarElement('branch-year', saju.year.branch);
    updatePillarElement('stem-month', saju.month.stem);
    updatePillarElement('branch-month', saju.month.branch);
    updatePillarElement('stem-day', saju.day.stem);
    updatePillarElement('branch-day', saju.day.branch);
    updatePillarElement('stem-hour', saju.hour.stem);
    updatePillarElement('branch-hour', saju.hour.branch);
    
    // 오행 카드 인터랙티브 리스트 생성
    const container = document.getElementById('elements-interactive-list');
    container.innerHTML = '';
    
    Object.keys(analysis.counts).forEach(elName => {
        const count = analysis.counts[elName];
        // 8자 중 퍼센트 계산
        const pct = (count / 8) * 100;
        
        const card = document.createElement('div');
        card.className = 'element-card';
        card.setAttribute('onclick', `showElementModal('${elName}')`);
        
        const symbol = document.createElement('div');
        symbol.className = `element-symbol ${getSymbolClass(elName)}`;
        symbol.textContent = elName;
        
        const barContainer = document.createElement('div');
        barContainer.className = 'element-bar-container';
        
        const barFill = document.createElement('div');
        barFill.className = `element-bar-fill ${getSymbolClass(elName)}`;
        barFill.style.width = `${pct}%`;
        barContainer.appendChild(barFill);
        
        const span = document.createElement('span');
        span.textContent = `${count}개 (${Math.round(pct)}%)`;
        
        card.appendChild(symbol);
        card.appendChild(barContainer);
        card.appendChild(span);
        container.appendChild(card);
    });
    
    // 명리 텍스트
    const myElementKo = getElementNameKo(analysis.mySelfElement);
    const yongshinKo = getElementNameKo(analysis.yongshin);
    const heeshinKo = getElementNameKo(analysis.heeshin);
    
    let analysisText = `수석님은 <strong>${saju.day.stem}(${myElementKo})</strong>의 일간을 타고나셨습니다. 기세를 분석해 본 바 본신이 <strong>${analysis.isStrong ? '굳건하고 힘찬(신강)' : '부드럽고 조화로운(신약)'}</strong> 사주입니다. `;
    
    // 기원에 따른 가산 텍스트 반영
    if (selectedWish === 'wealth') {
        analysisText += `특히 수석님의 오늘 재물운(편재) 물꼬를 열기 위해서는 사주에 부족하거나 생조를 돕는 <strong>${yongshinKo}의 횡재 기운</strong>과 <strong>${heeshinKo}의 운수</strong>를 적극 수혈해야 복권의 큰돈을 소화해 낼 수 있습니다. `;
    } else if (selectedWish === 'business') {
        analysisText += `수석님의 귀인운 및 대기만성의 번영을 돕기 위해서는 사주 균형의 요체인 <strong>${yongshinKo}의 상생 기운</strong>을 불어넣는 것이 수리학적으로 가장 조화롭습니다. `;
    } else {
        analysisText += `변동성 있는 투자와 단기 수익 활성화를 극대화하기 위해 부족한 <strong>${yongshinKo} 오행</strong>의 날카로운 결단력을 무기로 매칭시켰습니다. `;
    }
    
    document.getElementById('saju-analysis-text').innerHTML = analysisText;
}

// 5단계 UI 바인딩 및 게이지 계산
function renderStep5UI() {
    const { analysis, fixedNums, excludeNums } = currentSajuResult;
    
    // 횡재 지수 계산 (신강유무, 기원, 용신 분포를 반영한 유니크 공식)
    let score = 75;
    if (analysis.isStrong) score += 8;
    if (selectedWish === 'wealth') score += 11;
    if (selectedWish === 'investment') score += 6;
    // 기피 오행(개수가 가장 많은 것)이 고정수로 지정되지 않았을 때 보너스
    score += (fixedNums.length * 3);
    if (score > 99) score = 99; // 맥스 99
    
    document.getElementById('gauge-score').textContent = `${score}%`;
    document.getElementById('gauge-fill').style.width = `${score}%`;
    
    // 횡재수 코멘트 매핑
    const yongshinKo = getElementNameKo(analysis.yongshin);
    let desc = `금일 수석님의 사주는 ${yongshinKo}의 기운이 활성화되어 횡재를 가로막는 기운이 사라진 상태입니다. `;
    if (fixedNums.length > 0) {
        desc += `수석님의 염원이 깃든 수리(${fixedNums.join(', ')})가 용신과 결합하여 운기를 돕습니다.`;
    } else {
        desc += `순수 명리 수리학 매핑 100% 비율로 조합이 정밀 직조되었습니다.`;
    }
    document.getElementById('gauge-desc').textContent = desc;
    
    // 멤버십 등급 뱃지 및 잠금 인터페이스 제어
    const badge = document.getElementById('membership-badge');
    const comboLock = document.getElementById('combinations-lock');
    const prescLock = document.getElementById('presc-lock');
    const btnReroll = document.getElementById('btn-reroll');
    const counterText = document.getElementById('reroll-counter-text');
    const rerollWrapper = document.getElementById('reroll-control-wrapper-element');
    
    // 클래스 초기화
    badge.className = 'membership-badge';
    
    if (membershipState === 'free') {
        badge.textContent = "무료 회원";
        badge.classList.add('badge-free');
        comboLock.style.display = 'flex';
        prescLock.style.display = 'flex';
        
        // 💡 무료 회원 상태에서는 번호 재배치 영역 자체를 완전히 숨김!
        if (rerollWrapper) rerollWrapper.style.display = 'none';
        
        btnReroll.disabled = true;
        counterText.textContent = "재배치 남은 횟수: 0회 (무료 회원)";
    } else if (membershipState === 'basic') {
        badge.textContent = "기본 회원";
        badge.classList.add('badge-basic');
        comboLock.style.display = 'none';
        prescLock.style.display = 'none';
        
        if (rerollWrapper) rerollWrapper.style.display = 'block';
        
        btnReroll.disabled = true;
        counterText.textContent = "재배치 불가 (단건 결제 회원)";
    } else if (membershipState === 'premium') {
        badge.textContent = "프리미엄 회원";
        badge.classList.add('badge-premium');
        comboLock.style.display = 'none';
        prescLock.style.display = 'none';
        
        if (rerollWrapper) rerollWrapper.style.display = 'block';
        
        if (rerollCount > 0) {
            btnReroll.disabled = false;
            counterText.textContent = `재배치 남은 횟수: ${rerollCount}회`;
        } else {
            btnReroll.disabled = true;
            counterText.textContent = "재배치 남은 횟수: 0회 (금주 기운 소진)";
        }
    }
    
    // 로또 최종 추출 및 렌더링
    generateLottoNumbersFinal();
    
    // 처방 방위/시각
    updatePrescriptions(analysis.yongshin);
}

// 격국 테마 정의 (짧고 간명한 문장 적용)
const COMBINATION_THEMES = [
    { name: "재물올인", desc: "재물 기운 집중" },
    { name: "안정추구", desc: "당첨 평균 확률" },
    { name: "투자성공", desc: "자수성가 상생" },
    { name: "천우신조", desc: "귀인 조력 유도" },
    { name: "인생역전", desc: "고위험 고수익" }
];

// 최종 명리 수리 융합 로또 추출 알고리즘 (고정수/제외수 반영)
function generateLottoNumbersFinal() {
    const { analysis, fixedNums, excludeNums } = currentSajuResult;
    const freeContainer = document.getElementById('lotto-combinations-free-list');
    const premiumContainer = document.getElementById('lotto-combinations-premium-list');
    
    freeContainer.innerHTML = '';
    premiumContainer.innerHTML = '';
    
    const yongNumbers = getNumbersByElement(analysis.yongshin);
    const heeNumbers = getNumbersByElement(analysis.heeshin);
    
    // 전체 1~45 풀 구성 (제외수 필터 차단 적용)
    let numberPool = [];
    for (let i = 1; i <= 45; i++) {
        // 제외수이면 풀에 넣지 않음
        if (excludeNums.includes(i)) continue;
        
        numberPool.push(i);
        // 용신 오행 3배 가중치
        if (yongNumbers.includes(i)) {
            numberPool.push(i, i);
        }
        // 희신 오행 2배 가중치
        if (heeNumbers.includes(i)) {
            numberPool.push(i);
        }
    }
    
    // 1. [무료 영역] 재물올인 조합 A (1게임) 생성 및 렌더링
    const sortedArrayA = generateSingleLottoCombination(numberPool, yongNumbers, excludeNums, fixedNums);
    const rowDivA = createLottoRowDOM("재물올인", "조합 A", sortedArrayA, 0);
    freeContainer.appendChild(rowDivA);
    
    // 2. [프리미엄 영역] 사주 격국 특수 조합 4종 생성 및 렌더링
    const PREMIUM_THEMES = [
        { name: "안정추구", desc: "조합 B" },
        { name: "투자성공", desc: "조합 C" },
        { name: "천우신조", desc: "조합 D" },
        { name: "인생역전", desc: "조합 E" }
    ];
    
    PREMIUM_THEMES.forEach((theme, idx) => {
        const sortedArray = generateSingleLottoCombination(numberPool, yongNumbers, excludeNums, fixedNums);
        const rowDiv = createLottoRowDOM(theme.name, theme.desc, sortedArray, idx + 1); // 애니메이션 딜레이 보정
        premiumContainer.appendChild(rowDiv);
    });
}

// 개별 로또 6자리 조합 생성 헬퍼 함수
function generateSingleLottoCombination(numberPool, yongNumbers, excludeNums, fixedNums) {
    let set = new Set();
    
    // 1. 고정수 주입 (100% 무조건 보장)
    fixedNums.forEach(n => set.add(n));
    
    // 2. 용신수 1개 이상 추가 주입 (단, 고정수에 용신수가 없다면 보장 추가)
    const hasYong = Array.from(set).some(n => yongNumbers.includes(n));
    if (!hasYong) {
        // 제외되지 않은 용신 숫자 중 무작위 주입
        const validYong = yongNumbers.filter(n => !excludeNums.includes(n));
        if (validYong.length > 0) {
            set.add(validYong[Math.floor(Math.random() * validYong.length)]);
        }
    }
    
    // 3. 가중치 풀에서 수집
    let failSafe = 0;
    while (set.size < 6 && failSafe < 600) {
        const randNum = numberPool[Math.floor(Math.random() * numberPool.length)];
        set.add(randNum);
        failSafe++;
    }
    
    // 예외 대응: 혹은 제외수가 가득 차서 오류 발생 시 보정
    while (set.size < 6) {
        const randNum = Math.floor(Math.random() * 45) + 1;
        if (!excludeNums.includes(randNum)) set.add(randNum);
    }
    
    let sortedArray = Array.from(set).sort((a, b) => a - b);
    let sum = sortedArray.reduce((acc, cur) => acc + cur, 0);
    
    // 총합 필터 적합성 검사 (95~185)
    if (sum < 95 || sum > 185) {
        set.clear();
        fixedNums.forEach(n => set.add(n));
        while (set.size < 6) {
            const randNum = Math.floor(Math.random() * 45) + 1;
            if (!excludeNums.includes(randNum)) set.add(randNum);
        }
        sortedArray = Array.from(set).sort((a, b) => a - b);
    }
    
    return sortedArray;
}

// 개별 로또 행 DOM 객체 생성 헬퍼 함수
function createLottoRowDOM(themeName, themeDesc, sortedArray, animRowIdx) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'lotto-row';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'lotto-label';
    labelDiv.innerHTML = `
        <span class="theme-name">${themeName}</span>
        <span class="theme-desc">${themeDesc}</span>
    `;
    rowDiv.appendChild(labelDiv);
    
    const ballsDiv = document.createElement('div');
    ballsDiv.className = 'lotto-balls';
    
    sortedArray.forEach((num, index) => {
        const ball = document.createElement('div');
        const ballElement = getElementByNumber(num);
        const ballClass = getBallClassByElement(ballElement);
        
        ball.className = `lotto-ball ${ballClass}`;
        ball.textContent = num;
        ball.style.animationDelay = `${(animRowIdx * 0.08) + (index * 0.04)}s`;
        ballsDiv.appendChild(ball);
    });
    
    rowDiv.appendChild(ballsDiv);
    return rowDiv;
}

// 번호 재생성 리롤 버튼
function reRollLottoNumbers() {
    if (membershipState !== 'premium') {
        alert("재배치 기능은 프리미엄 구독 회원만 사용 가능합니다.");
        return;
    }
    
    if (rerollCount <= 0) {
        alert("금주의 재배치 횟수(3회)를 모두 소진하셨습니다.");
        return;
    }
    
    // 횟수 차감
    rerollCount--;
    
    const counterText = document.getElementById('reroll-counter-text');
    const btnReroll = document.getElementById('btn-reroll');
    counterText.textContent = `재배치 남은 횟수: ${rerollCount}회`;
    
    if (rerollCount === 0) {
        btnReroll.disabled = true;
        counterText.textContent = "재배치 남은 횟수: 0회 (금주 기운 소진)";
    }
    
    // 볼 재발사 애니메이션 효과 가동
    const balls = document.querySelectorAll('.lotto-ball');
    balls.forEach(ball => {
        ball.style.animation = 'none';
        ball.offsetHeight;
        ball.style.animation = null;
    });
    generateLottoNumbersFinal();
}

// 결제창 모달 가동 함수
function openPaymentModal() {
    document.getElementById('payment-modal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}

// 데모 결제 완료 트리거
function buyDemoMembership(tier) {
    if (tier === 'basic') {
        membershipState = 'basic';
        rerollCount = 0;
        alert("🎉 데모 결제 완료!\n[기본 패키지 990원] 5대 격국 조합 번호가 전면 해제되었습니다.");
    } else if (tier === 'premium') {
        membershipState = 'premium';
        rerollCount = 3;
        alert("🎉 데모 결제 완료!\n[프리미엄 멤버십 월 4,900원] 5대 격국 및 처방 해제 + 재배치 권한 3회가 활성화되었습니다.");
    }
    
    closePaymentModal();
    renderStep5UI(); // 화면 실시간 갱신
}

// -------------------------------------------------------------
// 모달 제어 기능 (오행 터치 팝업)
function showElementModal(elName) {
    const detail = ELEMENT_DETAILS[elName];
    if (!detail || !currentSajuResult) return;
    
    const count = currentSajuResult.analysis.counts[elName];
    
    // 모달 데이터 주입
    document.getElementById('modal-el-icon').textContent = detail.icon;
    document.getElementById('modal-el-icon').className = `modal-element-icon ${getSymbolClass(elName)}`;
    document.getElementById('modal-el-title').textContent = detail.title;
    document.getElementById('modal-el-count').textContent = `내 사주 팔자 내 개수: ${count}개 (배속 점수: ${count * 10}점)`;
    document.getElementById('modal-el-desc').textContent = detail.desc;
    
    // 모달 켜기
    document.getElementById('element-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('element-modal').classList.remove('active');
}

// -------------------------------------------------------------
// 헬퍼 및 유틸 함수들
function updatePillarElement(id, kanji) {
    const el = document.getElementById(id);
    el.textContent = kanji;
    el.className = 'stem';
    if (id.startsWith('branch')) el.className = 'branch';
    const info = ELEMENT_MAP[kanji];
    if (info) el.classList.add(info.class);
}

function getSymbolClass(elementName) {
    switch (elementName) {
        case '木': return 'symbol-wood';
        case '火': return 'symbol-fire';
        case '土': return 'symbol-earth';
        case '金': return 'symbol-metal';
        case '水': return 'symbol-water';
        default: return '';
    }
}

function getElementNameKo(elementName) {
    switch (elementName) {
        case '木': return '나무(木)';
        case '火': return '불(火)';
        case '土': return '흙(土)';
        case '金': return '쇠(金)';
        case '水': return '물(水)';
        default: return '';
    }
}

function getElementByNumber(num) {
    const lastDigit = num % 10;
    if (lastDigit === 3 || lastDigit === 8) return '木';
    if (lastDigit === 2 || lastDigit === 7) return '火';
    if (lastDigit === 5 || lastDigit === 0) return '土';
    if (lastDigit === 4 || lastDigit === 9) return '金';
    return '水';
}

function getNumbersByElement(elementName) {
    const list = [];
    for (let i = 1; i <= 45; i++) {
        if (getElementByNumber(i) === elementName) list.push(i);
    }
    return list;
}

function getBallClassByElement(elementName) {
    switch (elementName) {
        case '木': return 'ball-wood';
        case '火': return 'ball-fire';
        case '土': return 'ball-earth';
        case '金': return 'ball-metal';
        case '水': return 'ball-water';
        default: return '';
    }
}

function updatePrescriptions(yongshin) {
    const directionEl = document.getElementById('presc-direction');
    const timeEl = document.getElementById('presc-time');
    
    const directions = {
        '木': '동쪽 (생명력이 차오르며 푸른 목 기운이 솟구치는 길방)',
        '火': '남쪽 (열정적인 대길운이 가득한 붉은 화 기운의 길방)',
        '土': '중앙 또는 거주지 500m 이내 (안정감이 서린 황색 흙의 기운 방위)',
        '金': '서쪽 (재물을 수확하는 단단한 쇠붙이 기운이 들어오는 길방)',
        '水': '북쪽 (재물이 모여 수량을 이루는 깊은 수 기운의 지혜로운 방위)'
    };
    
    const times = {
        '木': '오전 03:30 ~ 07:29 (인시, 묘시) - 새벽녘 나무의 활기가 넘치는 시간',
        '火': '오전 09:30 ~ 13:29 (사시, 오시) - 붉은 양기가 최고조에 달해 횡재를 깨우는 시간',
        '土': '오전 07:30 ~ 09:29 (진시) 또는 오후 13:30 ~ 15:29 (미시) - 대지의 힘이 고르게 조율되는 시간',
        '金': '오후 15:30 ~ 19:29 (신시, 유시) - 결실을 거두고 금전운을 매듭짓는 해질녘 시간',
        '水': '오후 21:30 ~ 오전 01:29 (해시, 자시) - 하루의 모든 운이 깊게 응축되어 돌아오는 심야의 시간'
    };
    
    directionEl.textContent = directions[yongshin] || '동쪽';
    timeEl.textContent = times[yongshin] || '오전 09:30 ~ 11:30 (사시)';
}

// 다시 시작 초기화
function resetForm() {
    // 1단계로 가고 폼 초기화
    document.getElementById('saju-form').reset();
    document.getElementById('fixed-nums').value = '';
    document.getElementById('exclude-nums').value = '';
    
    // 시간 드롭다운 복원
    const select = document.getElementById('birth-hour-select');
    const checkbox = document.getElementById('time-unknown');
    if (select && checkbox) {
        checkbox.checked = false;
        select.disabled = false;
        select.value = "12";
        updateTimeDropdown(12);
    }
    
    // 멤버십 상태 및 재배치 횟수 초기화 (수석님 기본값인 premium 및 3회로 세팅)
    membershipState = 'premium';
    rerollCount = 3;
    
    currentSajuResult = null;
    goToStep(1);
}

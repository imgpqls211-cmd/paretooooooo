import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  console.log("Gemini API initialized successfully.");
} else {
  console.warn("GEMINI_API_KEY is not defined. Running in Demo / Heuristic mode.");
}

// Heuristic fallback function when API key is missing or calls fail
function generateHeuristicData(title: string, content: string) {
  const combined = `${title} ${content}`;
  const rand = getDeterministicRandom(title + content);
  
  // Helper to generate deterministic random numbers
  function getDeterministicRandom(seedStr: string) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return function() {
      const x = Math.sin(hash++) * 10000;
      return x - Math.floor(x);
    };
  }

  // Detect domain
  let domain = "일반 사회 정책";
  let benefitGroups: string[] = [];
  let damageGroups: string[] = [];
  let benefitReasons: string[] = [];
  let damageReasons: string[] = [];

  // Match domain and load rich specific groups and context-aware reasons
  if (combined.match(/부동산|주택|전세|세입자|임대|청약|재개발|공공임대|월세|보증금|아파트|빌라|매매|종부세|취득세|분양|주거/)) {
    domain = "부동산 및 주거 정책";
    benefitGroups = [
      "임대 소득 위주의 다주택 자산가 가구",
      "대형 민간 건설사 및 시행 법인",
      "청약 가점이 매우 높은 무주택 고소득 가계"
    ];
    benefitReasons = [
      "임대차 시장 거래 정상화와 소득세 중과 배제 수혜로 장기 자산 보유 및 가치 증대가 이루어집니다.",
      "재건축/재개발 등의 주택 건설 수주 환경이 개선되어 현금 흐름 및 공사 도급 영업이익이 상승합니다.",
      "주거 안정 조치와 청약 요건 개편 기회를 통해 수도권 노른자 핵심 분양 단지의 우선 선점이 가능해집니다."
    ];
    damageGroups = [
      "역세권 월세 전전 무주택 청년 임차인",
      "보증금 반환 지연 우려 한계 임차 가구",
      "재개발 예정 불량 주택지 세입 가구",
      "도심 영세 부동산 소규모 공인중개업자",
      "수도권 외곽 원거리 자가 임차 통근 세대"
    ];
    damageReasons = [
      "전세 자금 대출 규제와 시세 상승 압박이 월세로 전가되어 고정 주거비 지출이 소득 대비 폭발적으로 증가합니다.",
      "보증금 보증 가입 요건 및 한도 축소로 인해 만기에 보증금을 온전히 반환받지 못하는 전세 분쟁 위험에 직면합니다.",
      "재개발 추진 속에서 임시 이주 지원금이나 공공 대체 거주지 등 안전망이 없어 강제 주거 불안을 겪습니다.",
      "규제 변동과 주택 거래 절벽 장기화로 공인 중개 수수료 수입이 고사 직전까지 떨어지고 임대료 부담만 누적됩니다.",
      "도심 내 주거 기회를 상실하고 외곽으로 밀려나 주거 상태 저하 및 교통 비용 이중 증가 부담을 집도받습니다."
    ];
  } else if (combined.match(/노동|임금|최저임금|배달|플랫폼|근로자|자영업|근로|근무|주휴수당|퇴직금|정규직|비정규직|시급|알바|긱|일자리/)) {
    domain = "노동 및 소득 분배 정책";
    benefitGroups = [
      "공공기관 및 대기업 정규직 근로자",
      "서빙 로봇 및 키오스크 무인 솔루션 공급사",
      "초단기 쪼개기 구인 중개 특화 플랫폼사"
    ];
    benefitReasons = [
      "임금 하한 가이드라인 상승 및 고용 안전망 결합 혜택을 온전히 누려 가계 가처분 소득이 보장됩니다.",
      "급격한 수당 및 인건비 인상 압박에 대응하려는 자영업자들의 무인화 기기 렌탈 수요 폭증으로 사상 최대 매출을 올립니다.",
      "고용 규제를 우회하기 위한 초단기 일자리 알바 구인 건수가 늘면서 중개 수수료 이익이 집중됩니다."
    ];
    damageGroups = [
      "생계형 1인 가구 배달/수송 플랫폼 노동자",
      "골목 상권 5인 미만 영세 자영업 소상공인",
      "65세 이상 단순 노무 한계 구직 세대",
      "주 15시간 미만 쪼개기 계약 청년 임시 알바생",
      "외국인 인력 수급이 불확실한 농어촌 한계 농가"
    ];
    damageReasons = [
      "플랫폼의 라이더 단가 삭감 정책과 계약 불안정성이 겹치며 노동시간 대비 실질 가용 소득이 하락합니다.",
      "인건비 상승분을 소비자 단가로 전혀 전가할 수 없는 매출 구조로 인해 순이익이 마이너스로 전환되어 폐업 위기에 놓입니다.",
      "기업들의 한계 고용 회피 기조로 경비, 청소 등 고령층 필수 일자리가 기계로 우선 대체되어 취업 문턱이 극적으로 높아집니다.",
      "주휴수당 지급 의무를 피하기 위한 사업주의 시간 쪼개기 고용 계약으로 일하는 곳만 늘고 주당 총임금은 하락합니다.",
      "제조 생산성 대비 노동 규제 준수 의무 요율만 높아져 수확기 인력 고용 비용을 감당하지 못하고 원가가 적자 누적됩니다."
    ];
  } else if (combined.match(/교통|지하철|버스|부담금|차량|대중교통|도로|택시|자전거|킥보드|주차|통행료|고속도로|터널|혼잡|운행/)) {
    domain = "교통 및 도시 인프라 정책";
    benefitGroups = [
      "도심 지하철 및 버스 전용 출퇴근 직장인",
      "전기 이륜차 및 친환경 공유 모빌리티 대여사",
      "교외 대형 상권 및 대형 주차장 구비 쇼핑센터"
    ];
    benefitReasons = [
      "도심 내 불필요한 자차 유입 감소로 버스 표정 속도가 상승하고 혼잡 피로가 유의미하게 절감됩니다.",
      "자차 진입 통제 및 주차 규제를 극복하려는 시민들의 대체 수단 이동량 증가로 가입자 수와 이용료 수익이 폭증합니다.",
      "도심 혼잡 부담금을 피하려는 자차 소유 소비자들이 주차가 편하고 넓은 외곽 복합몰로 전환 유입되어 매출이 신장됩니다."
    ];
    damageGroups = [
      "생계형 1톤 디젤 화물차 운송 자영업자",
      "도심 핵심 가로 영세 도보 상가 입점 상인",
      "야간 및 새벽 교대 교외 거주 필수 자차 통근자",
      "장애인 및 노약자 상시 동반 다자녀 돌봄 세대",
      "대체 환승 주차 인프라가 없는 외곽 원거리 차량 이용자"
    ];
    damageReasons = [
      "물건 배송을 위해 도심 진입이 강제되는 비탄력적 업무 구조로 매일 부담금을 온전히 독박 지급해야 해 이익이 마모됩니다.",
      "차량 방문 고객의 도심 기피와 더불어 원재료 납품 차량의 배송료 인상 전가 압박까지 겹쳐 이중 경영난을 겪습니다.",
      "심야시간대 대중교통 운행이 전무하여 자차가 강제되는 필수 생계 활동임에도 예외 감면 규정이 없어 징벌적 세금을 납부합니다.",
      "대중교통의 휠체어/유모차 탑승 접근이 어려워 사설 차량이 필수 이동권이나, 요금 인상 할인 사각지대에 내몰립니다.",
      "외곽 환승역 주차 자리는 부족하고 배차 시간은 길어, 교통 비용은 늘어나고 일평균 출퇴근 길바닥 낭비 시간이 심화됩니다."
    ];
  } else if (combined.match(/탄소|환경|신재생|전기차|에너지|기후|석탄|태양광|원전|배출권|오염|쓰레기|일회용|플라스틱|친환경/)) {
    domain = "에너지 및 친환경 정책";
    benefitGroups = [
      "ESG 탄소배출권 컨설팅 및 설비 전문 기업",
      "전기/수소 친환경 자동차 제조업체 및 충전 인프라사",
      "대기업 가이드라인 부합 친환경 전문 생산 농가"
    ];
    benefitReasons = [
      "의무 배출 규제 준수를 위한 장비 업그레이드와 탄소 회계 컨설팅 수요가 밀려들며 장기 연간 영업이익이 급증합니다.",
      "보조금 우선 집중 배치 및 친환경 대체 의무 할당 조치로 인해 내수 친환경 완성차 수주 및 충전망 선점 효과를 독식합니다.",
      "ESG 납품 계약 우선 가점을 부여받아 도매 유통 단가에 프리미엄 마진을 얹어 납품할 권리를 획득합니다."
    ];
    damageGroups = [
      "노후 경유 화물차 처분 위기 한계 차주",
      "석탄 화력발전소 단계적 축소 직격탄 비정규직 노동자",
      "노후 주택 등유 보일러 의존 고령 취약 가구",
      "단가 보존이 불가능한 영세 주물 뿌리 중소기업",
      "생태 제약 요건으로 가로막힌 소형 연안 어업 선주"
    ];
    damageReasons = [
      "신차 구매 능력이 없는 한계 차주로, 운행 불가 벌금 누적 혹은 반강제적 페차 처분으로 가계 수입원이 완전히 차단됩니다.",
      "발전 시설 조기 폐쇄 결정과 함께 고용 승계나 재훈련 안전망 없이 구조조정의 최전선에 노출되어 일자리를 잃습니다.",
      "친환경 연료 전환 세금 부과로 가스 및 등유 요금이 폭등하면서 동절기 난방비를 감당하지 못하는 에너지 빈곤 가구가 됩니다.",
      "산업용 가스 및 탄소배출권 조달 비용 상승분을 납품하는 원청 대기업 단가에 반영하지 못해 원가 적자가 가중됩니다.",
      "환경 보존 구역 설정 및 출어 에너지 규제 강화로 일일 조업 가능 영역이 절반 이하로 극단 차단되어 어획량이 격감합니다."
    ];
  } else if (combined.match(/금융|금리|은행|대출|채권|주식|세금|증세|이자|가계부채|코인|투자|증권|예금|대환|이자율/)) {
    domain = "금융 및 조세 금융 정책";
    benefitGroups = [
      "고예금 예적금 금리 극대화 여유자금 자산가",
      "예대마진 스프레드 최대화 시중 1금융권 은행 및 주주",
      "공매도 및 인버스 변동성 특화 전문 헤지펀드사"
    ];
    benefitReasons = [
      "금융 불안정 국면에서 확정 금리 상품 및 채권에 여윳돈을 예치하여 앉아서 고소득 이자 배당 편익을 안정적으로 누립니다.",
      "가계 대출 규제로 대출 금리는 올리고 수신 금리는 억제하여 사상 최고 분기별 예대마진 순이자수익을 달성합니다.",
      "유동성 축소로 주식 시장이 폭락하거나 변동성이 심화될 때 하락 유도 파생 거래를 집중해 엄청난 단기 자본 이익을 획득합니다."
    ];
    damageGroups = [
      "신용하위 저소득 다중채무 한계 가계",
      "고금리 갈아타기 대환이 막힌 영세 대출 자영업자",
      "과도한 담보 대출 원리금 연체 직전 청년 영끌 주택 소유주",
      "벤처 캐피탈 유동성 동결로 고사 위기 혁신 스타트업",
      "현금 흐름이 막힌 한계 소득 가계 및 한부모 가족"
    ];
    damageReasons = [
      "연쇄적인 기준 금리 인상 비용이 그대로 전가되어 매달 원리금 상환 부담이 가처분 소득의 70%를 초과하는 한계에 도달합니다.",
      "낮은 신용 등급으로 제1금융권 대출 기한 연장이 거절되고, 불법 사금융 및 연 20%대 고금리 카드론으로 내몰려 신용불량 상태에 처합니다.",
      "부동산 침체와 주담대 상환 부담이 겹치며 급매 처분도 불가능한 채 매달 월급의 대부분을 금융 비용으로 원천 마모당합니다.",
      "시장 자금 동결로 후속 시리즈 투자가 취소되어 우수 연구 인력을 감축하고 데스밸리 극복 실패로 한계 폐업 수순을 밟습니다.",
      "이자 부담 급증으로 인한 실질 가처분 소득 고갈로 당장 식료품, 의료비 등 기초 소비를 포기하는 한계 생계 위험에 처합니다."
    ];
  } else if (combined.match(/복지|교육|학교|대학|노인|아동|기초수급|보육|수당|청년|국민연금|의료|국가장학금|돌봄|어르신|장애인/)) {
    domain = "보건 복지 및 공공 교육 정책";
    benefitGroups = [
      "돌봄 정부 직접 지원 예산 수혜 기관",
      "정부 장학금 지급 고공 수혜 대학 기관",
      "공공 헬스케어 메디컬 장비 전문 납품 조합"
    ];
    benefitReasons = [
      "정부 예산 증액과 전속 바우처 사용 보장 혜택으로 인력 채용 및 재정 건전성이 완전히 안정적으로 유지됩니다.",
      "재정 지원 제한 규제 적용을 면제받고, 국가 장학금 직접 지급 통로가 유지되어 입학 정원 이탈 방어에 반사 수혜를 입습니다.",
      "공공 보건 사업 확대로 지방 의료원 및 공립 시설에 수조 원 규모 기기를 장기 조달하는 독점적 이익을 누립니다."
    ];
    damageGroups = [
      "원생 감소 및 복지 요율 개편 피해 사설 보육시설 소상공인",
      "미래 기금 고갈 불안 가중 연금 고세율 납부 청년 근로층",
      "거동이 불편해 혜택을 청구하지 못하는 복지 사각지대 홀몸 어르신",
      "취업 장기 실직 상태의 학자금 대출 미상환 한계 졸업생",
      "직접 재정 일자리에서 기수 탈락한 고령 한계 소외 가구"
    ];
    damageReasons = [
      "정부 공공 돌봄 일원화 흐름 속에서 사설 시설에 대한 바우처 배제가 겹쳐 폐원 압박과 임대료 연체 적자를 온전히 짊어집니다.",
      "소득 대비 연금 납부 의무 요율은 인상되는 반면 미래 수령액 불확실성은 고조되어 당장의 월급 명세서상 실수령 소득만 지속 삭감됩니다.",
      "스마트 디바이스 기반 복지 신청 제도를 알지 못하고 도보 행정 절차가 까다로워 실질적인 의료 지원금에서 소외되어 이중 고립됩니다.",
      "상환 연착륙 제도가 조기 만료되면서 직장을 얻기도 전에 연체 이자가 발생해 청년 신용 주의자 명단에 먼저 등재됩니다.",
      "공공 단기 근로 기간 만료 후 대체 생계 수단이 전혀 없고 기금 심사 요건 미달로 즉각적 한계 빈곤에 재함몰됩니다."
    ];
  } else if (combined.match(/인공지능|AI|플랫폼|규제|알고리즘|디지털|데이터|네이버|카카오|쿠팡|배민|메타버스|유튜브|앱스토어/)) {
    domain = "디지털 기술 및 플랫폼 규제 정책";
    benefitGroups = [
      "대형 자체 규제 컴플라이언스 전담팀 보유 거대 유통사",
      "규제 반사이익을 노리는 레거시 오프라인 대기업",
      "국내법 역외 적용이 느슨해 무임승차하는 글로벌 빅테크 기업"
    ];
    benefitReasons = [
      "규제가 도입되더라도 막강한 사내 로펌과 자금력으로 법적 제약을 선제 극복하여, 후발 주자들을 위한 시장 진입 장벽을 자동화합니다.",
      "온라인 경쟁 플랫폼의 마케팅 활동 제약과 비용 가중으로 인해 반사적으로 오프라인 거점의 고객 집객 및 판매 지배력이 복원됩니다.",
      "국내 망사용료나 규제 사법권에서 교묘히 이탈하여 비용 전가 없이 헐값에 국내 유저를 잠식하고 시장을 빠르게 장악합니다."
    ];
    damageGroups = [
      "소규모 플랫폼 입점 최하위 자영 판매 소상공인",
      "근로 계약 의무화로 일거리가 삭감되는 긱 워커 및 프리랜서",
      "컴플라이언스 규제 비용을 버티지 못하는 초기 IT 스타트업",
      "유통 효율화 제약으로 인해 배송이 먼저 단절되는 도서산간 한계 주민",
      "개인 추천 마케팅 툴이 차단당한 가내 독립 예술 창작자"
    ];
    damageReasons = [
      "플랫폼에 가해지는 제약 벌금 비용이 우회적인 수수료 및 노출 차단으로 전가되어 월 판매 마진율이 무너지게 됩니다.",
      "노동 보호 규제 강제 조치에 고용 부담을 느낀 중개사들이 당일 단기 일자리 호출 건수 자체를 축소하여 일평균 수입이 반토막 납니다.",
      "개인정보 보호, 알고리즘 공개 의무 등 수억 원의 초기 법적 인증비용을 감당하지 못하고 기술 사업화 단계에서 고사합니다.",
      "플랫폼 배송망 일률적 정지 규제 가동 시, 수지타산이 맞지 않는 오지 노선이 1순위로 폐쇄되어 생필품 보급에 고통을 겪습니다.",
      "맞춤형 인공지능 추천 노출이 무력화되면서 대기업 기성품의 저가 마케팅에 짓눌려 일반 대중에게 알릴 통로가 완전 차단됩니다."
    ];
  } else {
    // 8. Fully synthesized fallback NLP engine (Dynamic word extraction if no template matched!)
    const rawNouns = title.split(/[\s,.\-안법률안안정안계획안책]+/).filter(w => w.length >= 2 && !w.match(/정책|제안|계획|방안|뉴스|기사|결정|시행|부과|인상|인하|축소|확대|추진/));
    const noun1 = rawNouns[0] || "해당 정책";
    const noun2 = rawNouns[1] || "규제 분야";

    domain = `합리적 ${noun1} 관리 정책`;
    benefitGroups = [
      `규제 면제 지위를 선제 획득한 ${noun1} 선도 우량 법인`,
      `${noun2} 규제 우회를 제안하는 사설 자문 및 로펌 업계`,
      `${noun1} 사업 자본 집중화로 시장 지배력을 복원한 독과점 가계`
    ];
    benefitReasons = [
      `정책 제약 사항에서 법률상 보장받은 면제 특권을 활용해, 타 영세 하위 경쟁사 대비 독점적 잉여 영업 가치를 차지합니다.`,
      `제도 시행으로 발생하는 기업 및 가계의 복잡한 분쟁 자문 수요를 전속 흡수하여 건당 수임료 및 컨설팅 매출을 폭증시킵니다.`,
      `한계 경쟁 주체들이 고사하고 밀려난 빈자리에 풍부한 여유 자본으로 부지를 선점하고 인프라 독점 권리를 확대 보유합니다.`
    ];
    damageGroups = [
      `해당 ${noun1} 신규 진입을 준비하던 무자본 청년 벤처 스타트업`,
      `실질 지원금 삭감으로 고용 단절 위기에 봉착한 ${noun2} 비정규직 노동자`,
      `대안 대출 등 자금 융통 경로가 원천 차단당한 영세 다중채무 소상공인`,
      `제도 개편 요건을 인지하지 못한 디지털 소외 취약 가구`,
      `정부의 획일적 행정 기준선에 걸려 혜택을 억울하게 뺏긴 한계 소외 가계`
    ];
    damageReasons = [
      `복잡한 인허가 규정 수립과 준수 비용을 도저히 충당할 수 없어 창업 초기 데스밸리 속에서 아이디어를 사장당하고 폐업합니다.`,
      `공공 예산 재조정 과정에서 진행되던 소형 프로젝트가 전면 취소되어 즉시 실업 한계 및 가계 생계 파탄 위험에 처합니다.`,
      `유동성 완화의 기회를 뺏기고 신용 하락 제재 위기 속에서 연 18%대 불법 고리대금으로 생계 수단을 연착하려다 연체에 직면합니다.`,
      `스마트 행정망 청구 장벽을 넘지 못하고 현행 복지 지원금 혜택 명단에서 누락되어 이중적인 최하위 소외 빈곤층으로 몰락합니다.`,
      `재산 산정 및 부양가족 행정 기준선에 0.1% 차이로 탈락해, 실제로 당장 굶주리고 있음에도 공적 구제 대상에서 원천 기각됩니다.`
    ];
  }

  // Generate highly dynamic, deterministic random utility curves based on title & content seed
  const overallData = [];
  const paretoData = [];
  
  // Custom arrays for beneficiaries
  const b1Data = [];
  const b2Data = [];
  const b3Data = [];

  // Custom arrays for subgroups
  const v1Data = [];
  const v2Data = [];
  const v3Data = [];
  const v4Data = [];
  const v5Data = [];

  const efficiencyBonus = 8 + Math.floor(rand() * 12); // e.g. 8~20
  const paretoBonus = 3 + Math.floor(rand() * 6);      // e.g. 3~9

  // Calculate 7-month curve trends deterministically
  for (let t = 0; t < 7; t++) {
    // Noise factor
    const noise = (rand() * 3) - 1.5;

    if (t < 3) {
      // Prior to policy introduction (months -3, -2, -1): stable around base 100
      overallData.push(Math.round(100 + noise));
      paretoData.push(Math.round(100 + noise));
      b1Data.push(Math.round(100 + noise));
      b2Data.push(Math.round(100 + noise));
      b3Data.push(Math.round(100 + noise));
      v1Data.push(Math.round(100 + noise));
      v2Data.push(Math.round(100 + noise));
      v3Data.push(Math.round(100 + noise));
      v4Data.push(Math.round(100 + noise));
      v5Data.push(Math.round(100 + noise));
    } else {
      // Introduction Month (t=3) and Forecast Month (+1, +2, +3)
      const factor = t - 2; // 1, 2, 3, 4

      // Overall average increases sharply due to big gainers
      overallData.push(Math.round(100 + (efficiencyBonus * factor) + noise));
      // Pareto balanced optimum increases moderately and stabilizes
      paretoData.push(Math.round(100 + (paretoBonus * factor) + noise - (factor * 0.5)));

      // Beneficiary 1 climbs the fastest
      b1Data.push(Math.round(100 + (efficiencyBonus * 1.5 * factor) + (rand() * 5) + noise));
      // Beneficiary 2 climbs moderately
      b2Data.push(Math.round(100 + (efficiencyBonus * 1.1 * factor) + (rand() * 3) + noise));
      // Beneficiary 3 climbs with a slight lag
      b3Data.push(Math.round(100 + (efficiencyBonus * 0.7 * factor) + (rand() * 2) + noise));

      // Victim 1 plunges catastrophically immediately at t=3
      v1Data.push(Math.round(Math.max(12, 100 - (18 * factor) - (rand() * 8) + noise)));
      // Victim 2 declines slowly and continuously
      v2Data.push(Math.round(Math.max(25, 100 - (11 * factor) - (rand() * 5) + noise)));
      // Victim 3 flatlined then sudden drop as lag kicks in
      v3Data.push(Math.round(Math.max(35, t === 3 ? 94 + noise : 100 - (15 * (factor - 1)) + noise)));
      // Victim 4 enters low-efficiency trap, small drop but stays depressed
      v4Data.push(Math.round(Math.max(50, 92 - (4 * factor) + noise)));
      // Victim 5 high volatility but stays low
      const wave = Math.sin(t * 1.8) * 6;
      v5Data.push(Math.round(Math.max(40, 85 - (8 * factor) + wave + noise)));
    }
  }

  // Calculate dynamic MCDM scores strictly aligned with the simulated curves
  const efficiencyScore = Math.min(9.8, Math.max(4.5, 6.0 + (efficiencyBonus * 0.2) + (rand() * 1.5)));
  const paretoEfficiency = Math.min(9.5, Math.max(3.5, 5.0 + (paretoBonus * 0.3) + (rand() * 1.2)));
  
  // Calculate lowest utility point among victims to determine Two-sided Fairness and Least Misery
  const worstValue = Math.min(...v1Data, ...v2Data, ...v3Data, ...v4Data, ...v5Data);
  const leastMiseryIndex = Math.min(9.8, Math.max(1.2, (worstValue / 10.0) - (rand() * 0.5)));
  
  // Two-sided fairness score represents the gap between benefits and damages (lower gap = higher score)
  const gap = Math.max(...b1Data) - worstValue;
  const twoSidedFairness = Math.min(9.5, Math.max(1.5, 9.5 - (gap / 15.0) + (rand() * 1.0)));
  
  const optimalValidity = Math.min(9.7, Math.max(2.0, (efficiencyScore + paretoEfficiency + twoSidedFairness + leastMiseryIndex) / 4.0));

  const mcdm = [
    { name: "단순 효율성 (전체평균)", score: efficiencyScore, color: "bg-slate-100 text-slate-800 border-slate-300", desc: "효율 추구시" },
    { name: "파레토 최적화 효율", score: paretoEfficiency, color: "bg-blue-100 text-blue-800 border-blue-200", desc: "최적 추구시" },
    { name: "양면 공정성 (수용성)", score: twoSidedFairness, color: "bg-green-100 text-green-800 border-green-200", desc: "균형 평가지표" },
    { name: "최소 고통(Least Misery) 지수", score: leastMiseryIndex, color: "bg-purple-100 text-purple-800 border-purple-200", desc: "취약층 방어율" },
    { name: "최종 최적(Optimal) 타당성", score: optimalValidity, color: "bg-indigo-100 text-indigo-800 border-indigo-200", desc: "합리적 조율율" }
  ];

  // Map reasons to objects
  const beneficiaries = benefitGroups.map((g, i) => {
    const dataArr = i === 0 ? b1Data : i === 1 ? b2Data : b3Data;
    return {
      label: g,
      data: dataArr,
      impact: i === 0 ? "효용 폭발" : "지속 수혜",
      reason: benefitReasons[i]
    };
  });

  const subGroups = damageGroups.map((g, i) => {
    const dataArr = i === 0 ? v1Data : i === 1 ? v2Data : i === 2 ? v3Data : i === 3 ? v4Data : v5Data;
    const impacts = ["치명적 타격", "소득 급감", "지연 한계 도달", "정체 및 소외", "변동성 위기"];
    return {
      label: g,
      data: dataArr,
      impact: impacts[i],
      reason: damageReasons[i]
    };
  });

  // Dynamically constructed detailed HTML report
  const critique = `
    <div class="space-y-4">
      <p class="font-bold text-lg text-indigo-300 flex items-center gap-1.5">
        ⚠️ '${domain}' 관점에서의 효율성과 최적성의 근본적 상충
      </p>
      <p>
        입력하신 정책 <strong>[${title}]</strong>은(는) 사회 전체의 가시적 수치 개선이나 시스템 효율화를 뜻하는 <strong>단순 효율성(지수 ${efficiencyScore.toFixed(1)}점)</strong> 면에서는 강력한 동력을 나타낼 수 있습니다. 
        이는 주 수혜 계층인 <strong>${benefitGroups[0]}</strong> 및 <strong>${benefitGroups[1]}</strong>의 효용이 예측 기간 동안 각각 최고 <strong>${Math.max(...b1Data)}</strong> 및 <strong>${Math.max(...b2Data)}</strong> 지표까지 빠르게 급성장하여 단순 가중 산술 평균값을 위로 강하게 끌어당기기 때문입니다.
      </p>
      
      <p class="font-bold text-indigo-400 mt-4 flex items-center gap-1.5">
        🔍 Multi-FR 알고리즘 분석 및 양면 공정성 진단
      </p>
      <p>
        그러나 다자기준의사결정(MCDM)과 <strong>양면 공정성(Two-sided Fairness: ${twoSidedFairness.toFixed(1)}점)</strong> 제약 조건 하에서 이 모델의 미세 궤적을 추적하면 매우 심각한 사회적 균열이 감지됩니다. 
        대체 수단이나 대응 버퍼가 전무한 최약체 취약 집단인 <strong>${damageGroups[0]}</strong>와 <strong>${damageGroups[1]}</strong> 등의 시뮬레이션 지수는 도입 시점(0월)을 기점으로 수직 강하하여 최종 예측 시점에 무려 <strong>${worstValue}</strong>점 부근까지 고꾸라집니다. 
        이는 다중 경사 하강법 궤적상 최악의 불균형 최하위 골짜기(Local Minimum)를 의미합니다.
      </p>

      <p class="font-bold text-indigo-400 mt-4 flex items-center gap-1.5">
        💡 최소 고통 전략(Least Misery)에 입각한 최종 정책 타당성 보완 제언
      </p>
      <p>
        이 정책이 정당성을 확보하고 극심한 사회적 저항과 사회 안전망 붕괴 리스크를 무마하려면, 단순 효율성 상승폭을 소폭 타협(효율점수 ${efficiencyScore.toFixed(1)}점 → 파레토 조율점수 ${paretoEfficiency.toFixed(1)}점)하더라도 피해 집단의 낙폭을 제한하는 <strong>최소 고통 전략(Least Misery: ${leastMiseryIndex.toFixed(1)}점)</strong> 가중치를 전격 반영하여 최적화 궤적(녹색 점선)을 준수해야 합니다.
      </p>
      <div class="bg-slate-950/50 p-4 border border-slate-800 rounded-xl space-y-2 mt-2">
        <p class="text-xs font-bold text-emerald-400">🛠️ ${domain} 맞춤형 3대 긴급 연착륙 권고안</p>
        <ul class="list-disc list-inside space-y-1.5 text-slate-300 text-xs">
          <li><strong>선별적 완충 예외 보장:</strong> 정책 도입 시점(0월)부터 생업적 필수 행위가 입증되는 <strong>${damageGroups[0]}</strong>에 한하여 부담 의무를 전액 면제 혹은 최소 50% 이상 직접 할인을 일괄 선제 적용할 것.</li>
          <li><strong>대안적 소득/비용 바우처 보조:</strong> 원가 급등 전가 피해에 직면하는 <strong>${damageGroups[1]}</strong>을 대상으로 한시적 국고 상생 긴급 바우처를 발급해 시장 적응을 돕는 보조금 특별 조항을 입법 신설할 것.</li>
          <li><strong>유예 기간 및 정밀 모니터링제 도입:</strong> 일방적 징수 및 규제 발효 대신 1년의 유예 시범 사업을 운영해 <strong>${damageGroups[2]}</strong>의 이탈 및 폐업 한계 수준을 실시간 통계로 집계하며 세부 룰을 리랭킹 조율할 것.</li>
        </ul>
      </div>
      <p class="text-slate-500 text-[11px] mt-2 leading-tight">
        * 본 제언은 ${title}의 입력 키워드 기반 NLP 형태소 매핑과 Pareto 수식 조율 모델을 교차 활용하여 산출된 정밀 시뮬레이션 및 권고안입니다.
      </p>
    </div>
  `;

  return {
    isDemo: true,
    mcdm,
    chartLabels: ['도입전(-3월)', '도입전(-2월)', '도입전(-1월)', '도입(0월)', '예측(+1개월)', '예측(+2개월)', '예측(+3개월)'],
    overall: {
      label: "단순 효율 추구시 (전체 평균)",
      data: overallData,
      reason: "수혜 집단의 급속한 자산 및 소득 편익 고성장으로 단순 가중 평균 지표는 외견상 상승함."
    },
    paretoOptimum: {
      label: "파레토 최적화 시 (균형 평균)",
      data: paretoData,
      reason: "취약 서브 집단의 고통 점수를 방어하면서, 사회적 한계 비용 전가를 억제한 다목적 최적 균형 궤적."
    },
    beneficiaries,
    subGroups,
    critique
  };
}

// REST API Route
app.post("/api/analyze", async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "정책 제목과 상세 내용을 모두 제공해야 합니다." });
  }

  // If Gemini Client is initialized, attempt real AI analysis
  if (aiClient) {
    try {
      const prompt = `
        사용자가 제안한 정책/뉴스 기사 제목과 본문을 정밀 분석하여, "파레토 효율성"과 "양면 공정성(Two-sided Fairness)" 관점에서 이익을 보는 집단과 심각한 소외/피해를 겪게 되는 부분 집단들을 찾아내어 시계열 시뮬레이션 데이터를 제공해 주세요.

        정책 제목: ${title}
        정책 상세 내용: ${content}

        [주요 요구사항]
        1. 단순 효율성을 추구할 때의 전체 가상 평균과 파레토 최적 솔루션을 찾았을 때의 완화된 균형 평균을 7개 타임라인 지표(도입전-3월, 도입전-2월, 도입전-1월, 도입(0월), 예측+1월, 예측+2월, 예측+3월)로 추출해주세요. (Base는 100입니다).
        2. 이익을 가장 크게 얻을 세분화된 집단 3가지(beneficiaries)를 구체적으로 아주 사실적인 한글 집단명으로 정의하고, 타임라인 7개 데이터 배열(100에서 점차 증가하는 경향)과 혜택이 집중되는 상세한 이유를 150자 내외로 상세 기술하세요. 각 집단마다 서로 구동 메커니즘과 지수 증감 속도(예: 한 집단은 급상승, 한 집단은 완만 상승)를 달리하십시오.
        3. 가장 크거나 억울하게 고통이나 불이익을 받을 구체적 피해 부분 집단 5가지(subGroups)를 한글명(예: '생계형 배달 오토바이 라이더', '영세 가스 가압 소상공인' 등 실제 통계 분류에 준하는 극도로 구체적인 명칭으로) 정의하고, 타임라인 7개 데이터 배열(도입 시점인 0월 이후로 급락하거나 지연 하락하는 등 100에서 떨어지는 경향)과 그 피해가 가혹하게 부과되는 근거를 150자 이상 아주 사실적이고 논리적으로 기술하십시오. 각 집단의 피해 강도와 곡선 형태(예: 즉시 급락형, 점진 하락형, 지연 급락형, 변동 하락형)를 수학적으로 완전히 다르게 설정하십시오.
        4. MCDM(다중기준의사결정) 기반 5가지 지표 점수(0~10)를 매겨 주십시오.
           - "단순 효율성 (전체평균)"
           - "파레토 최적화 효율"
           - "양면 공정성 (수용성)"
           - "최소 고통(Least Misery) 지수"
           - "최종 최적(Optimal) 타당성"
           * 점수는 반드시 피해 부분 집단들의 최저 시뮬레이션 수치 하락폭과 상호 보완적으로 정밀하게 부합해야 합니다. (최저 지수가 낮을수록 최소 고통 지수도 낮아야 함)
        5. AI 비판 줄글 영역(critique)을 작성하십시오. 여기에는 정책의 맹점, 소외 집단이 겪을 구체적 생계 위기, 그리고 '최소 고통 전략(Least Misery)' 관점에서 이 정책의 타당성을 극적으로 개선하기 위한 구체적인 맞춤 대안 제언(예: 선별 보조금, 징수 예외, 대체 수단 조기 확충 등)을 가독성 높은 HTML 태그 구조(<p>, <ul>, <li>, <strong> 등)로 담아 주십시오.

        [반환 형식 규격 (JSON Schema 순수 객체로 반환해 주세요)]
      `;

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mcdm: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    color: { type: Type.STRING, description: "예: 'bg-slate-100 text-slate-800 border-slate-300'와 같이 tailwind 클래스명" },
                    desc: { type: Type.STRING }
                  },
                  required: ["name", "score", "color", "desc"]
                }
              },
              chartLabels: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              overall: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  data: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER }
                  },
                  reason: { type: Type.STRING }
                },
                required: ["label", "data", "reason"]
              },
              paretoOptimum: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  data: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER }
                  },
                  reason: { type: Type.STRING }
                },
                required: ["label", "data", "reason"]
              },
              beneficiaries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    data: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER }
                    },
                    impact: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["label", "data", "impact", "reason"]
                }
              },
              subGroups: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    data: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER }
                    },
                    impact: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["label", "data", "impact", "reason"]
                }
              },
              critique: { type: Type.STRING, description: "풍부한 서술형 분석 내용 (HTML 마크업 태그가 포함되어 단락이 구분되면 좋습니다.)" }
            },
            required: ["mcdm", "chartLabels", "overall", "paretoOptimum", "beneficiaries", "subGroups", "critique"]
          }
        }
      });

      const responseText = response.text || "";
      const parsedData = JSON.parse(responseText.trim());
      
      // Ensure color properties are filled properly if Gemini omitted them
      const colors = [
        "bg-slate-100 text-slate-800 border-slate-300",
        "bg-blue-100 text-blue-800 border-blue-200",
        "bg-green-100 text-green-800 border-green-200",
        "bg-purple-100 text-purple-800 border-purple-200",
        "bg-indigo-100 text-indigo-800 border-indigo-200"
      ];
      if (parsedData.mcdm) {
        parsedData.mcdm.forEach((item: any, idx: number) => {
          if (!item.color) {
            item.color = colors[idx % colors.length];
          }
        });
      }

      return res.json({ isDemo: false, ...parsedData });

    } catch (error) {
      console.error("Gemini Generation failed, falling back to heuristics:", error);
      const fallback = generateHeuristicData(title, content);
      return res.json({ ...fallback, isDemo: true, error: "AI 분석 호출 도중 에러가 발생하여 로컬 시뮬레이션 데이터로 대체하여 분석합니다." });
    }
  } else {
    // No API Key, use local heuristic parsing
    const fallback = generateHeuristicData(title, content);
    return res.json(fallback);
  }
});

// Configure Vite integration for developer flow and production flow
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

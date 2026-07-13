import { useState, useEffect, useRef } from "react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  Scale, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle, 
  Layers, 
  ArrowRight, 
  Compass, 
  Briefcase, 
  Home, 
  Leaf, 
  TrendingDown,
  Info,
  ChevronRight,
  RefreshCw,
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types for backend response
interface McdmCriterion {
  name: string;
  score: number;
  color: string;
  desc: string;
}

interface UtilityGroup {
  label: string;
  data: number[];
  impact: string;
  reason: string;
}

interface OverallAverage {
  label: string;
  data: number[];
  reason: string;
}

interface AnalysisResult {
  isDemo?: boolean;
  mcdm: McdmCriterion[];
  chartLabels: string[];
  overall: OverallAverage;
  paretoOptimum: OverallAverage;
  beneficiaries: UtilityGroup[];
  subGroups: UtilityGroup[];
  critique: string;
  error?: string;
}

// 5 Quick Templates for the user
const QUICK_TEMPLATES = [
  {
    id: "traffic",
    title: "도심 환경부담금 5천원 부과 및 5부제 제한안",
    icon: Compass,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50 hover:bg-blue-100/70 border-blue-200",
    content: "출퇴근 시간대 도심 진입 차량에 대해 고정 환경부담금 5,000원을 부과하고, 차량 끝자리에 따른 5부제 운행 제한을 전격 시행합니다. 대기질을 정화하고 도심 내 만성 교통 혼잡을 해소하겠다는 목표입니다.",
    category: "교통"
  },
  {
    id: "labor",
    title: "최저임금 연 12,000원 전격 인상안",
    icon: Briefcase,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50 hover:bg-amber-100/70 border-amber-200",
    content: "전체 업종을 대상으로 최저 시급을 12,000원으로 인상하고, 주휴수당 제도를 유지합니다. 한계 근로자들의 최소 실질 소득을 보장하고 양극화를 해소하여 소득 주도 성장을 가속화한다는 취지입니다.",
    category: "노동"
  },
  {
    id: "realestate",
    title: "청년 역세권 공공임대 대량 공급 및 전세대출 규제 강화",
    icon: Home,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200",
    content: "주요 역세권 내 3km 반경에 청년 대상 공공임대 주택 10만 호를 신속 공급하고, 1주택 초과자에 대한 전세자금 대출 보증 한도를 전면 회수 및 제한하여 투기 수요를 억제하고 청년 주거 안정을 도모합니다.",
    category: "부동산"
  },
  {
    id: "climate",
    title: "석탄화력발전 전면 중단 및 탄소 배출권 요율 300% 인상",
    icon: Leaf,
    iconColor: "text-green-500",
    bgColor: "bg-green-50 hover:bg-green-100/70 border-green-200",
    content: "기후 위기 대응을 위해 2027년까지 국내 석탄화력발전소를 조기 폐쇄 및 중단하고, 중대형 이산화탄소 배출 기업에 대한 탄소 배출권 톤당 부과요율을 기존 대비 300% 강제 인상합니다.",
    category: "환경"
  },
  {
    id: "finance",
    title: "가계대출 억제를 위한 기준 금리 연 4.25% 전격 인상",
    icon: Coins,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-50 hover:bg-purple-100/70 border-purple-200",
    content: "급증하는 가계부채와 영끌 부동산 버블 붕괴를 예방하기 위해 금융통화위원회가 한 차례에 기준 금리를 0.75%p 인상하여 최종 연 4.25%로 긴축 통화 정책을 전격 선언했습니다.",
    category: "금융"
  }
];

const LOADING_STEPS = [
  "KOSIS 및 공공 통계 데이터셋 매핑 중...",
  "양면 공정성(Two-sided Fairness) 다목적 만족도 연산 중...",
  "다중 경사 하강법 기반 파레토 최적 솔루션 궤적 도출 중...",
  "최소 고통 전략(Least Misery) 적용 및 다목적 최적 조율 모델 구동 중...",
  "AI 비판 논문 및 도메인별 권고안 취합 중..."
];

export default function App() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  const resultsRef = useRef<HTMLDivElement>(null);

  // Rotate loading messages smoothly
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const selectTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setTitle(tpl.title);
    setContent(tpl.content);
    setErrorMsg("");
  };

  const handleAnalyze = async () => {
    if (!title.trim() || !content.trim()) {
      setErrorMsg("⚠️ 정책/뉴스 제목과 상세 본문을 모두 입력해 주세요.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
      });

      if (!res.ok) {
        throw new Error("서버 분석 도중 에러가 발생했습니다.");
      }

      const data: AnalysisResult = await res.json();
      setResult(data);

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

    } catch (e: any) {
      setErrorMsg(`⚠️ 분석 과정에 오류가 발생했습니다. (${e.message})`);
    } finally {
      setLoading(false);
    }
  };

  // Convert raw array data of overall & groups to Recharts readable format
  const getChartData = () => {
    if (!result) return [];
    
    return result.chartLabels.map((label, idx) => {
      const dataPoint: any = { name: label };
      
      // Overall Average
      if (result.overall) {
        dataPoint[result.overall.label] = result.overall.data[idx];
      }
      
      // Pareto Optimum
      if (result.paretoOptimum) {
        dataPoint[result.paretoOptimum.label] = result.paretoOptimum.data[idx];
      }

      // Beneficiaries (B1, B2, B3)
      result.beneficiaries.forEach((b) => {
        dataPoint[b.label] = b.data[idx];
      });

      // Victims/Subgroups (V1, V2, V3, V4, V5)
      result.subGroups.forEach((v) => {
        dataPoint[v.label] = v.data[idx];
      });

      return dataPoint;
    });
  };

  const chartData = getChartData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white" id="main-container">
      {/* Decorative top lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Layout Wrap */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 relative z-10">
        
        {/* Elegant Header */}
        <header className="mb-12 text-center md:text-left md:flex md:items-center md:justify-between border-b border-slate-800/80 pb-8" id="app-header">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-400 mb-3">
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Objective Decision Making 기반 분석 엔진 v2.5</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-300">
              심층 정책 파레토 분석기
            </h1>
            <p className="text-slate-400 mt-3 max-w-3xl text-sm md:text-base leading-relaxed">
              정책이 내세우는 단순 '효율성'의 맹점을 고발하고, 다양한 세부 사회 집단들이 겪게 될 이익과 고통을 시뮬레이션합니다. 
              최종적으로 양면 공정성 제약 조건 하에서 최소 고통 전략(Least Misery)이 반영된 파레토 최적 솔루션을 찾습니다.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end text-right border-l border-slate-800 pl-8 ml-8">
            <span className="text-xs text-slate-500 font-mono">CRITICAL RATIO EVALUATOR</span>
            <span className="text-lg font-bold text-indigo-400 font-mono mt-1">Two-sided Fairness</span>
            <span className="text-xs text-emerald-400 font-mono mt-0.5">Least Misery Applied</span>
          </div>
        </header>

        {/* Input & Form Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12" id="input-section">
          
          {/* Form Side */}
          <div className="lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2" id="policy-input-title">
              <Layers className="w-5 h-5 text-indigo-400" />
              분석 대상 정책 또는 기사 입력
            </h2>

            {/* Quick Templates Selection */}
            <div className="mb-8" id="quick-templates">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                빠른 분석 템플릿 테스트
              </span>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {QUICK_TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => selectTemplate(tpl)}
                      className={`p-3 border rounded-xl flex flex-col items-center text-center transition-all cursor-pointer ${tpl.bgColor}`}
                      id={`template-btn-${tpl.id}`}
                    >
                      <Icon className={`w-5 h-5 ${tpl.iconColor} mb-2`} />
                      <span className="text-xs font-bold text-slate-200 block truncate w-full">{tpl.category}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tpl.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  정책안 / 뉴스 기사 제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  id="policy-title-input"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-base shadow-inner"
                  placeholder="예: 최저임금 급격 인상안 또는 도심 환경부담금 부과 법률안"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  상세 세부 내용 (뉴스 전문, 요약본, 혹은 본인의 구상안)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  id="policy-content-textarea"
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm leading-relaxed shadow-inner"
                  placeholder="분석하고자 하는 구체적인 내용을 상세히 작성해 주세요. 통계 기반으로 수혜 집단과 한계 피해 집단을 극적으로 대조 분석해냅니다..."
                />
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl flex items-start gap-3"
                    id="error-alert"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-200">입력 오류가 있습니다</p>
                      <p className="text-xs text-red-300 mt-1">{errorMsg}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button */}
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/30 flex justify-center items-center gap-2 text-base cursor-pointer"
                id="analyze-submit-btn"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>심층 다목적 최적 분석 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                    <span>다목적 최적화(Multi-FR) 심층 분석 시작</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Theory / Manual Side */}
          <div className="lg:col-span-4 bg-slate-900/30 border border-slate-800/60 rounded-2xl p-6 md:p-8 flex flex-col justify-between" id="theory-guide-panel">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                분석 한계 극복 이론
              </h3>
              
              <div className="space-y-4">
                <div className="border-l-2 border-indigo-500 pl-4 py-1">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase">파레토 효율성 (Pareto Trap)</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    전체 수치 평균(GDP, 교통속도 등)이 올랐다고 해서 좋은 정책이 아닙니다. 이면에서 생존을 보장받지 못할 정도로 효용이 추락하는 집단이 생긴다면 이는 가짜 Pareto 최적입니다.
                  </p>
                </div>

                <div className="border-l-2 border-emerald-500 pl-4 py-1">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase">양면 공정성 (Two-sided Fairness)</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    생산자와 소비자, 혹은 고소득층과 소외 부분 집단 모두의 최저 수용 임계치를 넘는 다자 균형 조건을 모델링합니다.
                  </p>
                </div>

                <div className="border-l-2 border-purple-500 pl-4 py-1">
                  <h4 className="text-xs font-bold text-purple-400 uppercase">최소 고통 전략 (Least Misery)</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    가장 열악한 위치에 처한 서브 집단의 손실 극대치(Max Loss)를 제한하는 고도의 수식적 랭킹 페널티 제약입니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 mt-6">
              <div className="flex gap-2 items-start">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  본 분석기는 Gemini Generative AI를 기반으로 KOSIS(국가통계포털)의 공식 통계 집단 분류 기준을 적용하여, 해당 정책 도입 시 예상되는 실제 소외 계층의 피해를 엄밀하게 예측합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Loading State Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center my-12 shadow-2xl relative overflow-hidden"
              id="loading-indicator-section"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 animate-pulse" />
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6" />
                
                <h3 className="text-xl font-bold text-white mb-2">정책 다자 최적화 평가 엔진 구동 중</h3>
                
                {/* Stepped animated text */}
                <div className="h-6 overflow-hidden relative w-full max-w-md">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingStep}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                      className="text-indigo-400 text-sm font-mono"
                    >
                      {LOADING_STEPS[loadingStep]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <p className="text-xs text-slate-500 mt-4 max-w-sm mx-auto leading-relaxed">
                  사용자가 기술한 내용의 키워드를 대조하여, 이익 및 피해 집단의 상대적 시계열 가중치를 산정하고 있습니다. 잠시만 기다려 주십시오.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="space-y-10"
              id="results-outer-section"
            >
              {/* Banner indicating real AI or Demo fallback */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                result.isDemo 
                  ? "bg-amber-950/20 border-amber-900/60" 
                  : "bg-indigo-950/20 border-indigo-900/60"
              }`} id="result-source-banner">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${result.isDemo ? "bg-amber-900/30" : "bg-indigo-900/30"}`}>
                    <Sparkles className={`w-5 h-5 ${result.isDemo ? "text-amber-400" : "text-indigo-400"}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">
                      {result.isDemo ? "실시간 Heuristic 모드 적용" : "Gemini AI 정밀 실시간 분석 통계 가동"}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {result.isDemo 
                        ? "API 환경 미검출 혹은 연결 한계로 인해, 내장된 정책 정규식 기반 정합 룰셋이 동작하여 집단 및 평균 예측치를 구성하였습니다." 
                        : "Gemini 3.5-Flash 모델이 입력받은 정책 내용을 분석하고, 가상 KOSIS 통계 매핑 기법으로 7개월 시뮬레이션 데이터를 실시간 생성하였습니다."}
                    </p>
                  </div>
                </div>
                {result.error && (
                  <div className="text-xs bg-red-950/40 border border-red-900/40 text-red-300 py-1.5 px-3 rounded-lg max-w-xs leading-relaxed">
                    {result.error}
                  </div>
                )}
              </div>

              {/* 1. MCDM Dashboard Indicators */}
              <div id="mcdm-dashboard">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    다목적 의사결정(MCDM) 타당성 진단 지표
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">VALUES SCALE: 0 - 10</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {result.mcdm.map((criterion, idx) => {
                    const scorePercentage = (criterion.score / 10) * 100;
                    return (
                      <div 
                        key={idx}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-700 shadow-lg"
                        id={`mcdm-item-${idx}`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-indigo-400 font-bold uppercase font-mono tracking-wider">
                              {criterion.desc}
                            </span>
                            <span className="text-lg font-black text-white">
                              {criterion.score.toFixed(1)}
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-slate-200 mt-2 leading-tight">
                            {criterion.name}
                          </h3>
                        </div>

                        {/* Custom visual progress micro-bar */}
                        <div className="w-full bg-slate-850 h-1.5 rounded-full mt-4 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              idx === 0 ? "bg-slate-500" :
                              idx === 1 ? "bg-blue-500" :
                              idx === 2 ? "bg-emerald-500" :
                              idx === 3 ? "bg-purple-500" : "bg-indigo-500"
                            }`} 
                            style={{ width: `${scorePercentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Recharts Dynamic Visualizer */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="utility-chart-container">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      양면 공정성 기반 부분 집단 효용 예측 (Base 100)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      정책 도입 시점(0월)을 기준으로 전후 3개월씩, 각 집단이 받게 될 사회적 효용 점수 추이입니다.
                      <strong>굵은 검정선(단순 전체 효율 평균)</strong>이 상승할 때, <strong>피해 집단의 점선들</strong>이 어떻게 고꾸라지는지 비교해 보십시오.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs bg-slate-950 p-2.5 border border-slate-850 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-1 bg-slate-400 block rounded" />
                      <span className="text-slate-300">전체 산술 평균</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-1 border-t-2 border-dashed border-emerald-500 block" />
                      <span className="text-slate-300">파레토 최적 솔루션</span>
                    </div>
                  </div>
                </div>

                {/* Actual Recharts Chart */}
                <div className="h-[400px] w-full" id="regression-chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={chartData} 
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={11} 
                        domain={["auto", "auto"]} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#0f172a", 
                          borderColor: "#334155", 
                          borderRadius: "12px",
                          color: "#f1f5f9"
                        }} 
                        labelStyle={{ fontWeight: "bold", color: "#818cf8", fontSize: "12px" }}
                        itemStyle={{ fontSize: "11px", padding: "1px 0" }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={45} 
                        iconType="circle" 
                        iconSize={8}
                        wrapperStyle={{ fontSize: "11px", paddingTop: "15px" }}
                      />
                      
                      {/* Overall average - thick solid grey */}
                      <Line 
                        type="monotone" 
                        dataKey={result.overall.label} 
                        stroke="#94a3b8" 
                        strokeWidth={4.5} 
                        dot={{ r: 4 }}
                        activeDot={{ r: 7 }}
                      />

                      {/* Pareto optimum - thick dashed emerald */}
                      <Line 
                        type="monotone" 
                        dataKey={result.paretoOptimum.label} 
                        stroke="#10b981" 
                        strokeWidth={4} 
                        strokeDasharray="8 4"
                        dot={{ r: 4 }}
                      />

                      {/* Beneficiary groups (Thin continuous line) */}
                      {result.beneficiaries.map((group, idx) => {
                        const colors = ["#0ea5e9", "#06b6d4", "#22d3ee"];
                        return (
                          <Line 
                            key={`b-${idx}`}
                            type="monotone" 
                            dataKey={group.label} 
                            stroke={colors[idx % colors.length]} 
                            strokeWidth={1.8} 
                            dot={{ r: 2 }}
                          />
                        );
                      })}

                      {/* Victim / Subgroups (Thin dashed crimson/orange) */}
                      {result.subGroups.map((group, idx) => {
                        const colors = ["#ef4444", "#f97316", "#f59e0b", "#f43f5e", "#ec4899"];
                        return (
                          <Line 
                            key={`v-${idx}`}
                            type="monotone" 
                            dataKey={group.label} 
                            stroke={colors[idx % colors.length]} 
                            strokeWidth={1.5} 
                            strokeDasharray="4 4"
                            dot={{ r: 2 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Beneficiaries vs. Subgroups Detail Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="groups-comparison">
                
                {/* Beneficiary Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" id="beneficiary-panel">
                  <h3 className="text-lg font-black text-emerald-400 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    수혜를 입는 기득 및 수혜 부분 집단 (Top 3)
                  </h3>

                  <div className="space-y-4">
                    {result.beneficiaries.map((b, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-950/70 border border-emerald-950 rounded-xl p-4 flex gap-4 hover:border-emerald-800/40 transition-all"
                        id={`beneficiary-item-${idx}`}
                      >
                        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-900 text-emerald-400 font-bold text-sm">
                          B{idx + 1}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-200 text-sm md:text-base">{b.label}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-800 text-emerald-400">
                              {b.impact}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            <span className="text-emerald-500 font-semibold font-mono">원리:</span> {b.reason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subgroups (Victims) Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" id="subgroups-panel">
                  <h3 className="text-lg font-black text-rose-400 mb-6 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                    극단적 고통/소외 및 한계 피해 부분 집단 (Top 5)
                  </h3>

                  <div className="space-y-4">
                    {result.subGroups.map((v, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-950/70 border border-red-950 rounded-xl p-4 flex gap-4 hover:border-red-900/40 transition-all"
                        id={`victim-item-${idx}`}
                      >
                        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-950/80 border border-red-900 text-red-400 font-bold text-sm">
                          V{idx + 1}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-200 text-sm md:text-base">{v.label}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/40 border border-red-800 text-red-400">
                              {v.impact}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            <span className="text-red-500 font-semibold font-mono">원리:</span> {v.reason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* 4. AI Deep Critique & Recommendation */}
              <div className="bg-gradient-to-br from-indigo-950/30 to-purple-950/20 border border-indigo-800/40 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-lg" id="ai-critique-section">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />
                
                <h3 className="text-lg md:text-xl font-black text-indigo-300 mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  Multi-FR 최적화 논리 비판 및 타당성 권고안
                </h3>

                {/* Safe render of HTML provided by AI or Fallback */}
                <div 
                  className="prose prose-invert prose-indigo text-slate-300 text-sm md:text-base leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: result.critique }}
                  id="critique-content"
                />
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Elegant Footer Info */}
      <footer className="text-center py-12 text-xs text-slate-600 border-t border-slate-900 mt-20 relative z-10" id="app-footer-info">
        <p>© 2026 심층 정책 파레토 분석기 (Two-Sided Pareto Optimum Engine).</p>
        <p className="mt-1.5 text-slate-700">KOSIS 가상 매핑 및 다중기준 의사결정(MCDM) 연계 시스템</p>
      </footer>
    </div>
  );
}

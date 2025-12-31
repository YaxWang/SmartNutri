
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, NutritionInfo, ExerciseInfo } from './types';
import { analyzeMenu, analyzeExercise } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('smartnutri_v4_data');
      return saved ? JSON.parse(saved) : {
        profile: { age: 25, gender: 'male', weight: 70, height: 175, activityFactor: 1.2 },
        meals: [],
        exercises: []
      };
    } catch (e) {
      return { profile: { age: 25, gender: 'male', weight: 70, height: 175, activityFactor: 1.2 }, meals: [], exercises: [] };
    }
  });

  const [inputFood, setInputFood] = useState('');
  const [inputExercise, setInputExercise] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<{ diet: string; exercise: string } | null>(null);
  const [loading, setLoading] = useState<{ food: boolean; exercise: boolean; recs: boolean }>({ food: false, exercise: false, recs: false });

  // 自动清除错误信息
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    localStorage.setItem('smartnutri_v4_data', JSON.stringify(state));
  }, [state]);

  const bmr = useMemo(() => {
    const { weight, height, age, gender } = state.profile;
    if (gender === 'male') return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    return (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }, [state.profile]);

  const tdee = bmr * state.profile.activityFactor;

  const targets = useMemo(() => {
    const { weight, gender } = state.profile;
    return {
      calories: tdee,
      protein: weight * 1.5,
      fat: (tdee * 0.25) / 9,
      carbs: (tdee * 0.55) / 4,
      water: weight * 35,
      fiber: 30,
      sugar: 50,
      sodium: 2300,
      '维生素A': 800, '维生素C': 100, '维生素D': 15, '维生素E': 15, '维生素B12': 2.4, '叶酸': 400,
      '钙': 1000, '铁': gender === 'female' ? 18 : 8, '锌': gender === 'female' ? 8 : 11, '镁': gender === 'female' ? 320 : 420, '钾': 3500, '硒': 55,
    };
  }, [tdee, state.profile.weight, state.profile.gender]);

  const stats = useMemo(() => {
    const totals = state.meals.reduce((acc, m) => ({
      calories: acc.calories + (Number(m.calories) || 0),
      protein: acc.protein + (Number(m.protein) || 0),
      carbs: acc.carbs + (Number(m.carbs) || 0),
      fat: acc.fat + (Number(m.fat) || 0),
      fiber: acc.fiber + (Number(m.fiber) || 0),
      sugar: acc.sugar + (Number(m.sugar) || 0),
      sodium: acc.sodium + (Number(m.sodium) || 0),
      water: acc.water + (Number(m.waterContent) || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, water: 0 });

    const burned = state.exercises.reduce((s, e) => s + (Number(e.caloriesBurned) || 0), 0) + bmr;
    const net = totals.calories - burned;
    const fatChangeGrams = net / 7.7;
    const musclePotential = (totals.protein > (targets.protein as number) && state.exercises.some(e => e.intensity === 'High')) ? 'High' : 'Low';

    const allMicros: Record<string, { value: number, unit: string }> = {};
    state.meals.forEach(m => {
      [...(m.vitamins || []), ...(m.minerals || []), ...(m.others || [])].forEach(n => {
        if (!n || !n.name) return;
        const key = n.name.replace(/\s+/g, '');
        if (!allMicros[key]) allMicros[key] = { value: 0, unit: n.unit || 'mg' };
        allMicros[key].value += (Number(n.value) || 0);
      });
    });

    return { ...totals, burned, net, fatChangeGrams, musclePotential, allMicros };
  }, [state.meals, state.exercises, bmr, targets]);

  const handleAddFood = async () => {
    if (!inputFood.trim()) return;
    setLoading(prev => ({ ...prev, food: true }));
    setErrorMessage(null);
    try {
      const results = await analyzeMenu(inputFood);
      if (results && results.length > 0) {
        setState(s => ({ ...s, meals: [...s.meals, ...results] }));
        setInputFood('');
      } else {
        throw new Error("未能从输入中识别出有效的饮食信息");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "饮食分析失败，请检查输入描述");
    } finally {
      setLoading(prev => ({ ...prev, food: false }));
    }
  };

  const handleAddExercise = async () => {
    if (!inputExercise.trim()) return;
    setLoading(prev => ({ ...prev, exercise: true }));
    setErrorMessage(null);
    try {
      const result = await analyzeExercise(inputExercise);
      setState(s => ({ ...s, exercises: [...s.exercises, result] }));
      setInputExercise('');
    } catch (e: any) {
      setErrorMessage(e.message || "运动计算失败");
    } finally {
      setLoading(prev => ({ ...prev, exercise: false }));
    }
  };

  const deleteMeal = (index: number) => {
    setState(s => ({ ...s, meals: s.meals.filter((_, i) => i !== index) }));
  };

  const deleteExercise = (index: number) => {
    setState(s => ({ ...s, exercises: s.exercises.filter((_, i) => i !== index) }));
  };

  const getAiRecommendations = async () => {
    if (!process.env.API_KEY) {
      setErrorMessage("请先配置 API Key");
      return;
    }
    setLoading(prev => ({ ...prev, recs: true }));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `根据以下数据给出今日建议：
      个人：${state.profile.gender === 'male' ? '男' : '女'}, ${state.profile.age}岁, 体重${state.profile.weight}kg, BMR ${bmr.toFixed(0)}
      今日已摄入：${stats.calories.toFixed(0)}kcal (蛋白质 ${stats.protein.toFixed(1)}g)
      今日已运动：${(stats.burned - bmr).toFixed(0)}kcal
      目标热量：${targets.calories.toFixed(0)}kcal
      请给出简短的：1. 接下来的饮食建议 2. 接下来的运动方案。以 JSON 格式返回: {"diet": "...", "exercise": "..."}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      setRecommendations(JSON.parse(response.text || "{}"));
    } catch (e) {
      setErrorMessage("建议生成失败，请稍后重试");
    } finally {
      setLoading(prev => ({ ...prev, recs: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative">
      {/* 全局错误提示栏 */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top-4">
          <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-bold">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-white/20 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200">
               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">SmartNutri <span className="text-emerald-600">Pro</span></h1>
          </div>
          <button onClick={() => { if(confirm("重置今日数据？")) setState(s => ({...s, meals: [], exercises: []})) }} className="text-xs font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest">Reset Day</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Body Profile</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ProfileInput label="身高 (cm)" value={state.profile.height} onChange={(v) => setState(s => ({...s, profile: {...s.profile, height: v}}))} />
              <ProfileInput label="体重 (kg)" value={state.profile.weight} onChange={(v) => setState(s => ({...s, profile: {...s.profile, weight: v}}))} />
              <ProfileInput label="年龄" value={state.profile.age} onChange={(v) => setState(s => ({...s, profile: {...s.profile, age: v}}))} />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">性别</label>
                <select 
                  value={state.profile.gender} 
                  onChange={e => setState(s => ({...s, profile: {...s.profile, gender: e.target.value as 'male' | 'female'}}))}
                  className="w-full bg-slate-50 p-3 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-800 appearance-none cursor-pointer"
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl flex justify-between items-center">
              <span className="text-sm font-bold text-emerald-800 tracking-tight">基础代谢 (BMR)</span>
              <span className="text-xl font-black text-emerald-900">{bmr.toFixed(0)} <span className="text-[10px] uppercase font-bold opacity-50">kcal</span></span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Smart Input</h2>
            <div className="space-y-3">
              <label className="text-xs font-bold text-emerald-600 flex items-center gap-1">记录饮食</label>
              <textarea 
                value={inputFood} 
                onChange={e => setInputFood(e.target.value)} 
                disabled={loading.food}
                placeholder="吃了什么？例如：两个水煮蛋，一杯牛奶" 
                className="w-full h-24 p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 resize-none transition-all disabled:opacity-50" 
              />
              <button onClick={handleAddFood} disabled={loading.food} className="w-full py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100 transition-all uppercase tracking-widest overflow-hidden relative">
                <span className={loading.food ? 'opacity-0' : 'opacity-100'}>Log Nutrition</span>
                {loading.food && <span className="absolute inset-0 flex items-center justify-center animate-pulse">Analyzing...</span>}
              </button>
            </div>

            <div className="pt-5 border-t border-slate-50 space-y-3">
              <label className="text-xs font-bold text-blue-600 flex items-center gap-1">记录运动</label>
              <input 
                type="text" 
                value={inputExercise} 
                onChange={e => setInputExercise(e.target.value)} 
                disabled={loading.exercise}
                placeholder="例如：快走 30 分钟" 
                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50" 
              />
              <button onClick={handleAddExercise} disabled={loading.exercise} className="w-full py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-100 transition-all uppercase tracking-widest relative overflow-hidden">
                <span className={loading.exercise ? 'opacity-0' : 'opacity-100'}>Log Activity</span>
                {loading.exercise && <span className="absolute inset-0 flex items-center justify-center animate-pulse">Calculating...</span>}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
             <div className="flex justify-between items-center">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">今日 AI 建议</h2>
                <button onClick={getAiRecommendations} disabled={loading.recs} className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-black hover:bg-indigo-100 transition-colors uppercase tracking-tight disabled:opacity-50">
                   {loading.recs ? '生成中...' : '刷新建议'}
                </button>
             </div>
             {recommendations ? (
               <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                 <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="text-[10px] font-black text-amber-600 uppercase mb-1">推荐饮食</div>
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">{recommendations.diet}</p>
                 </div>
                 <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="text-[10px] font-black text-blue-600 uppercase mb-1">推荐运动</div>
                    <p className="text-xs text-blue-900 leading-relaxed font-medium">{recommendations.exercise}</p>
                 </div>
               </div>
             ) : (
               <div className="py-8 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-300 font-bold italic">点击上方按钮获取建议</p>
               </div>
             )}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <PredictionCard title="今日能量平衡" mainValue={`${Math.abs(stats.fatChangeGrams).toFixed(1)}g`} desc={`预期脂肪 ${stats.net > 0 ? '储备' : '消耗'} (缺口: ${Math.abs(stats.net).toFixed(0)} kcal)`} isPositive={stats.net > 0} />
             <PredictionCard title="代谢状态" mainValue={stats.musclePotential === 'High' ? '🔥 旺盛' : '💤 基础'} desc={`蛋白摄入: ${stats.protein.toFixed(1)}g / 目标: ${targets.protein.toFixed(0)}g`} isPositive={stats.musclePotential === 'High'} />
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-12">
            <div>
              <h3 className="text-lg font-black mb-8 flex items-center gap-2">核心宏量营养</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <ProgressBar label="热量 (kcal)" current={stats.calories} target={targets.calories} color="bg-emerald-500" unit="" />
                <ProgressBar label="蛋白质 (g)" current={stats.protein} target={targets.protein} color="bg-indigo-500" unit="g" />
                <ProgressBar label="碳水化合物 (g)" current={stats.carbs} target={targets.carbs} color="bg-amber-500" unit="g" />
                <ProgressBar label="脂肪 (g)" current={stats.fat} target={targets.fat} color="bg-rose-500" unit="g" />
                <ProgressBar label="水分 (ml)" current={stats.water} target={targets.water} color="bg-blue-500" unit="ml" />
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50">
              <h3 className="text-lg font-black mb-8">微量营养达成度</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {Object.keys(targets).filter(k => !['calories','protein','fat','carbs','water','fiber','sugar','sodium'].includes(k)).map(nutrient => {
                  const currentData = stats.allMicros[nutrient] || { value: 0, unit: 'mg' };
                  return <ProgressBar key={nutrient} label={nutrient} current={currentData.value} target={(targets as any)[nutrient]} color="bg-violet-500" unit={currentData.unit} />;
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-4">今日流水账单</h3>
            <div className="grid grid-cols-1 gap-2">
               {state.meals.map((m, i) => (
                 <div key={`m-${i}`} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-slate-100 group animate-in fade-in">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-emerald-50">🍱</div>
                     <div>
                        <div className="font-black text-slate-800">{m.foodName}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">AI 饮食识别</div>
                     </div>
                   </div>
                   <div className="flex items-center gap-6">
                     <div className="text-sm font-black text-emerald-600">+{m.calories} kcal</div>
                     <button onClick={() => deleteMeal(i)} className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 scale-90 hover:scale-110">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                   </div>
                 </div>
               ))}
               {state.exercises.map((e, i) => (
                 <div key={`e-${i}`} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-slate-100 group animate-in fade-in">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-blue-50">🏃</div>
                     <div>
                        <div className="font-black text-slate-800">{e.activityName}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">AI 运动解析</div>
                     </div>
                   </div>
                   <div className="flex items-center gap-6">
                     <div className="text-sm font-black text-blue-600">-{e.caloriesBurned} kcal</div>
                     <button onClick={() => deleteExercise(i)} className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 scale-90 hover:scale-110">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                   </div>
                 </div>
               ))}
               {state.meals.length === 0 && state.exercises.length === 0 && (
                 <div className="py-12 text-center text-slate-200 font-bold border-2 border-dashed border-slate-100 rounded-3xl">暂无今日记录</div>
               )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const ProfileInput = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">{label}</label>
    <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full bg-slate-50 p-3 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-800 transition-all" />
  </div>
);

const PredictionCard = ({ title, mainValue, desc, isPositive }: any) => (
  <div className={`p-6 rounded-[2rem] border transition-all ${isPositive ? 'bg-orange-50/50 border-orange-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{title}</div>
    <div className="flex items-end gap-2 mb-2">
      <span className="text-4xl font-black text-slate-800 tracking-tighter">{mainValue}</span>
    </div>
    <p className="text-xs font-bold text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

interface ProgressBarProps { label: string; current: number; target: number; color: string; unit: string; isLimit?: boolean; }

const ProgressBar: React.FC<ProgressBarProps> = ({ label, current, target, color, unit, isLimit = false }) => {
  const percentage = Math.min((current / target) * 100, 100);
  const isOver = current > target;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[11px] font-black text-slate-700">{label}</span>
        <div className="text-right">
          <span className={`text-[11px] font-black ${isOver && isLimit ? 'text-rose-500' : 'text-slate-800'}`}>{current.toFixed(1)}<span className="text-[9px] font-bold text-slate-400 uppercase ml-0.5">{unit}</span></span>
          <span className="text-[9px] font-bold text-slate-300 mx-1">/</span>
          <span className="text-[9px] font-bold text-slate-300">{target.toFixed(0)}<span className="uppercase ml-0.5">{unit}</span></span>
        </div>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color} ${isOver && isLimit ? 'bg-rose-500' : (percentage >= 100 ? 'bg-emerald-500' : '')}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default App;

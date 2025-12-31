
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { NutritionInfo, ExerciseInfo } from '../types';

interface Props {
  meals: NutritionInfo[];
  exercises: ExerciseInfo[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const SummaryDashboard: React.FC<Props> = ({ meals, exercises }) => {
  const totalIntake = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalBurned = exercises.reduce((sum, e) => sum + e.caloriesBurned, 0);
  const netCalories = totalIntake - totalBurned;

  const macroData = [
    { name: '蛋白质', value: meals.reduce((sum, m) => sum + m.protein, 0) },
    { name: '碳水', value: meals.reduce((sum, m) => sum + m.carbs, 0) },
    { name: '脂肪', value: meals.reduce((sum, m) => sum + m.fat, 0) },
  ];

  const barData = [
    { name: '能量 (kcal)', 摄入: totalIntake, 消耗: totalBurned },
  ];

  const allVitamins = Array.from(new Set(meals.flatMap(m => m.vitamins)));
  const allMinerals = Array.from(new Set(meals.flatMap(m => m.minerals)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
      {/* Overview Cards */}
      <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium">总摄入</div>
          <div className="text-3xl font-bold text-emerald-600">{totalIntake} <span className="text-sm font-normal text-slate-400">kcal</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium">总消耗</div>
          <div className="text-3xl font-bold text-blue-600">{totalBurned} <span className="text-sm font-normal text-slate-400">kcal</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium">净能量</div>
          <div className={`text-3xl font-bold ${netCalories > 0 ? 'text-orange-500' : 'text-indigo-600'}`}>
            {netCalories} <span className="text-sm font-normal text-slate-400">kcal</span>
          </div>
        </div>
      </div>

      {/* Macro Breakdown */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
        <h4 className="font-semibold text-slate-800 mb-4 text-center">三大营养素分配 (克)</h4>
        <ResponsiveContainer width="100%" height="80%">
          <PieChart>
            <Pie
              data={macroData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {macroData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Calorie Balance */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
        <h4 className="font-semibold text-slate-800 mb-4 text-center">能量收支对比</h4>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={barData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend verticalAlign="bottom" height={36}/>
            <Bar dataKey="摄入" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="消耗" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Micro Nutrients */}
      <div className="col-span-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h4 className="font-semibold text-slate-800 mb-4">今日微量元素摄入</h4>
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">维生素</div>
            <div className="flex flex-wrap gap-2">
              {allVitamins.length > 0 ? allVitamins.map((v, i) => (
                <span key={i} className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full border border-yellow-100">
                  {v}
                </span>
              )) : <span className="text-slate-300 text-sm">暂无数据</span>}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">矿物质</div>
            <div className="flex flex-wrap gap-2">
              {allMinerals.length > 0 ? allMinerals.map((m, i) => (
                <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-100">
                  {m}
                </span>
              )) : <span className="text-slate-300 text-sm">暂无数据</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryDashboard;

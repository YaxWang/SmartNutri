
import React, { useState } from 'react';
import { analyzeExercise } from '../services/geminiService';
import { ExerciseInfo } from '../types';

interface Props {
  onAddExercise: (exercise: ExerciseInfo) => void;
}

const ExerciseSection: React.FC<Props> = ({ onAddExercise }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await analyzeExercise(input);
      onAddExercise(result);
      setInput('');
    } catch (error) {
      console.error("Failed to analyze exercise:", error);
      alert("分析失败，请描述得更具体一些（例如：慢跑30分钟）。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">输入您的运动</h3>
        <input
          type="text"
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="例如：在跑步机上以10km/h的速度跑了30分钟"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !input.trim()}
          className={`mt-4 w-full py-3 px-6 rounded-xl font-medium text-white transition-all ${
            loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
          }`}
        >
          {loading ? 'AI 计算中...' : '计算消耗能量'}
        </button>
      </div>
      
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-700">
          💡 提示：描述越详细（速度、重量、距离等），AI 计算的卡路里越准确。
        </p>
      </div>
    </div>
  );
};

export default ExerciseSection;

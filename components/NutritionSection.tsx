
import React, { useState } from 'react';
import { analyzeMenu } from '../services/geminiService';
import { NutritionInfo } from '../types';

interface Props {
  onAddMeals: (meals: NutritionInfo[]) => void;
}

const NutritionSection: React.FC<Props> = ({ onAddMeals }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<NutritionInfo[]>([]);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const results = await analyzeMenu(input);
      setPreview(results);
    } catch (error) {
      console.error("Failed to analyze menu:", error);
      alert("分析失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onAddMeals(preview);
    setPreview([]);
    setInput('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">输入您的饮食内容</h3>
        <textarea
          className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
          placeholder="例如：早餐吃了两个水煮蛋，一片全麦面包，一个苹果..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !input.trim()}
          className={`mt-4 w-full py-3 px-6 rounded-xl font-medium text-white transition-all ${
            loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
          }`}
        >
          {loading ? 'AI 分析中...' : 'AI 智能分析'}
        </button>
      </div>

      {preview.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">分析结果预览</h3>
          <div className="space-y-3 mb-6">
            {preview.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                <div>
                  <div className="font-medium text-emerald-900">{item.foodName}</div>
                  <div className="text-xs text-emerald-600">
                    碳水 {item.carbs}g · 蛋白质 {item.protein}g · 脂肪 {item.fat}g
                  </div>
                </div>
                <div className="text-emerald-700 font-bold">{item.calories} kcal</div>
              </div>
            ))}
          </div>
          <button
            onClick={handleConfirm}
            className="w-full py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 font-medium transition-colors"
          >
            确认并加入日志
          </button>
        </div>
      )}
    </div>
  );
};

export default NutritionSection;

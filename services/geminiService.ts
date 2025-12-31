
import { GoogleGenAI, Type } from "@google/genai";
import { NutritionInfo, ExerciseInfo } from "../types";

// 辅助函数：确保 API Key 存在
const checkApiKey = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY_MISSING");
  }
};

export const analyzeMenu = async (menuText: string): Promise<NutritionInfo[]> => {
  try {
    checkApiKey();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: menuText,
      config: {
        systemInstruction: "你是一位资深临床营养师。请分析饮食并提取极详尽的数据。对于微量元素，请提供具体的数值和单位。请严格返回 JSON 数组，不要包含任何 Markdown 标记或多余文字。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              fiber: { type: Type.NUMBER },
              sugar: { type: Type.NUMBER },
              sodium: { type: Type.NUMBER },
              waterContent: { type: Type.NUMBER },
              vitamins: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: { 
                    name: { type: Type.STRING }, 
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING } 
                  }
                } 
              },
              minerals: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: { 
                    name: { type: Type.STRING }, 
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING } 
                  }
                } 
              },
              others: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: { 
                    name: { type: Type.STRING }, 
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING } 
                  }
                } 
              },
            },
            required: ['foodName', 'calories', 'protein', 'carbs', 'fat'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");
    
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("INVALID_FORMAT");
    
    return data;
  } catch (error: any) {
    console.error("Menu Analysis Detailed Error:", error);
    if (error.message === "API_KEY_MISSING") throw new Error("请先配置 API Key");
    if (error.status === 429) throw new Error("请求过于频繁，请稍后再试");
    throw new Error("AI 解析失败，请检查网络或输入内容");
  }
};

export const analyzeExercise = async (exerciseText: string): Promise<ExerciseInfo> => {
  try {
    checkApiKey();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: exerciseText,
      config: {
        systemInstruction: "你是一位专业运动科学专家。请根据描述计算热量消耗和强度。严格返回 JSON 对象。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            activityName: { type: Type.STRING },
            durationMinutes: { type: Type.NUMBER },
            caloriesBurned: { type: Type.NUMBER },
            intensity: { type: Type.STRING, enum: ['Low', 'Moderate', 'High'] },
          },
          required: ['activityName', 'durationMinutes', 'caloriesBurned', 'intensity'],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Exercise Analysis Detailed Error:", error);
    throw new Error("运动消耗计算失败");
  }
};

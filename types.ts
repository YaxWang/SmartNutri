
export interface MicroNutrient {
  name: string;
  value: number; // Numeric value for calculation
  unit: string;  // e.g., "mg", "mcg"
}

export interface NutritionInfo {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number; // mg
  waterContent: number; // in ml
  vitamins: MicroNutrient[];
  minerals: MicroNutrient[];
  others: MicroNutrient[];
}

export interface ExerciseInfo {
  activityName: string;
  durationMinutes: number;
  caloriesBurned: number;
  intensity: 'Low' | 'Moderate' | 'High';
}

export interface UserProfile {
  age: number;
  gender: 'male' | 'female';
  weight: number; // kg
  height: number; // cm
  activityFactor: number; // 1.2 - 1.9
}

export interface AppState {
  profile: UserProfile;
  meals: NutritionInfo[];
  exercises: ExerciseInfo[];
}

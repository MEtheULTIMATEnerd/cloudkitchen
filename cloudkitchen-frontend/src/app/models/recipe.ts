export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type CuisineType = 'Italian' | 'Asian' | 'Mexican' | 'American' | 'French' | 'Indian' | 'Mediterranean' | 'Other';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Recipe {
  recipeId: string;
  userId?: string;
  title: string;
  chef: string;
  ingredients: string[];
  instructions: string[];
  mealType: MealType;
  cuisineType: CuisineType;
  prepTime: number;
  difficulty: Difficulty;
  servings: number;
  createdDate?: string | Date;
}

export function toLines(s: string | null | undefined): string[] {
  return String(s ?? '')
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean);
}
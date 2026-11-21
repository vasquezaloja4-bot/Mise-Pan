export type IngredientCategory =
  | 'Produce'
  | 'Protein'
  | 'Dairy & Eggs'
  | 'Grains & Bread'
  | 'Pantry & Sauces'
  | 'Herbs & Spices';

export interface IngredientItem {
  id: string;
  name: string;
  category: IngredientCategory;
  quantityEstimate?: string;
  source: 'camera' | 'photo' | 'manual' | 'sample';
}

export interface RecipeSuggestion {
  id: string;
  title: string;
  cuisine: string;
  mealType: string;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Chef';
  servings: number;
  summary: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  ingredientsWithAmounts: string[];
  steps: string[];
  chefTip: string;
}

export type MealFilter = 'All' | 'Quick (< 20 min)' | 'Breakfast' | 'Lunch & Dinner' | 'Light & Snack';

export type DietaryFilter = 'Any' | 'Vegetarian' | 'High-Protein' | 'Dairy-Free' | 'Gluten-Free';

export interface SampleKit {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ingredients: Array<{
    name: string;
    category: IngredientCategory;
    quantityEstimate: string;
  }>;
}

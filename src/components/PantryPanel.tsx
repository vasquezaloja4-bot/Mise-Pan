import React, { useState } from 'react';
import { Plus, X, ChefHat, Loader2, Trash2 } from 'lucide-react';
import type { DietaryFilter, IngredientItem, MealFilter } from '../types.ts';

interface PantryPanelProps {
  ingredients: IngredientItem[];
  selectedStaples: string[];
  allStaples: string[];
  mealFilter: MealFilter;
  dietaryFilter: DietaryFilter;
  isSuggesting: boolean;
  onAddIngredients: (names: string[]) => void;
  onRemoveIngredient: (id: string) => void;
  onClearIngredients: () => void;
  onToggleStaple: (staple: string) => void;
  onMealFilterChange: (filter: MealFilter) => void;
  onDietaryFilterChange: (filter: DietaryFilter) => void;
  onSuggestRecipes: () => void;
}

const MEAL_OPTIONS: MealFilter[] = [
  'All',
  'Quick (< 20 min)',
  'Breakfast',
  'Lunch & Dinner',
  'Light & Snack',
];

const DIETARY_OPTIONS: DietaryFilter[] = [
  'Any',
  'Vegetarian',
  'High-Protein',
  'Dairy-Free',
  'Gluten-Free',
];

export function PantryPanel({
  ingredients,
  selectedStaples,
  allStaples,
  mealFilter,
  dietaryFilter,
  isSuggesting,
  onAddIngredients,
  onRemoveIngredient,
  onClearIngredients,
  onToggleStaple,
  onMealFilterChange,
  onDietaryFilterChange,
  onSuggestRecipes,
}: PantryPanelProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = inputValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      onAddIngredients(parts);
      setInputValue('');
    }
  };

  const totalItems = ingredients.length + selectedStaples.length;

  return (
    <aside
      id="pantry"
      className="bg-white border border-[#E5E5E0] rounded-xl p-6 flex flex-col gap-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171717]">
            Your Ingredients
          </h2>
          <p className="text-xs text-[#52524E] mt-1 tabular-nums">
            {ingredients.length} captured or added · {selectedStaples.length} pantry staples
          </p>
        </div>

        {ingredients.length > 0 && (
          <button
            type="button"
            onClick={onClearIngredients}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52524E] hover:text-[#991B1B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Quick manual add */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="manual-ingredient-input" className="sr-only">
          Add ingredients manually
        </label>
        <input
          id="manual-ingredient-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add items (e.g. chicken, lemon, rice)"
          className="flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#D4D3CC] rounded-lg text-[#171717] placeholder:text-[#787771] focus:outline-none focus:border-[#1F5132]"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-[#171717] text-white rounded-lg hover:bg-[#2E2E2B] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </form>

      {/* Captured / added ingredients list */}
      <div>
        {ingredients.length === 0 ? (
          <div className="py-8 px-4 rounded-lg border border-dashed border-[#E5E5E0] bg-[#FAF9F6] text-center">
            <p className="text-sm font-medium text-[#171717]">
              No ingredients added yet
            </p>
            <p className="text-xs text-[#52524E] mt-1">
              Scan a photo on the left, try a sample photo, or type ingredients above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#EFECE4] border-y border-[#EFECE4] max-h-72 overflow-y-auto">
            {ingredients.map((item) => (
              <li
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-[#171717]">{item.name}</span>
                  <span className="text-xs text-[#787771] ml-2">
                    {[item.quantityEstimate, item.category].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveIngredient(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="p-1.5 text-[#787771] hover:text-[#171717] rounded-md hover:bg-[#F4F3EE] transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Everyday household staples toggle */}
      <div>
        <p className="text-xs font-medium text-[#52524E] mb-2.5">
          Household staples on hand
        </p>
        <div className="flex flex-wrap gap-1.5">
          {allStaples.map((staple) => {
            const active = selectedStaples.includes(staple);
            return (
              <button
                key={staple}
                type="button"
                onClick={() => onToggleStaple(staple)}
                aria-pressed={active}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#1F5132]/10 border-[#1F5132] text-[#1F5132]'
                    : 'bg-[#FAF9F6] border-[#E5E5E0] text-[#52524E] hover:border-[#D4D3CC] hover:text-[#171717]'
                }`}
              >
                {staple}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EFECE4]">
        <div>
          <label
            htmlFor="meal-filter"
            className="block text-xs font-medium text-[#52524E] mb-1.5"
          >
            Meal style
          </label>
          <select
            id="meal-filter"
            value={mealFilter}
            onChange={(e) => onMealFilterChange(e.target.value as MealFilter)}
            className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D4D3CC] rounded-lg text-[#171717] focus:outline-none focus:border-[#1F5132]"
          >
            {MEAL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="diet-filter"
            className="block text-xs font-medium text-[#52524E] mb-1.5"
          >
            Dietary preference
          </label>
          <select
            id="diet-filter"
            value={dietaryFilter}
            onChange={(e) => onDietaryFilterChange(e.target.value as DietaryFilter)}
            className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D4D3CC] rounded-lg text-[#171717] focus:outline-none focus:border-[#1F5132]"
          >
            {DIETARY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Action */}
      <button
        type="button"
        disabled={isSuggesting || totalItems === 0}
        onClick={onSuggestRecipes}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-[#1F5132] text-white rounded-lg hover:bg-[#173E26] disabled:opacity-45 transition-colors cursor-pointer"
      >
        {isSuggesting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Finding Dishes You Can Cook...</span>
          </>
        ) : (
          <>
            <ChefHat className="w-4 h-4" />
            <span>Suggest Dishes to Cook</span>
          </>
        )}
      </button>
    </aside>
  );
}

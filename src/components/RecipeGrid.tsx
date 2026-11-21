import React, { useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ShoppingBag,
  ArrowUpRight,
  AlertCircle,
  Utensils,
} from 'lucide-react';
import type { RecipeSuggestion } from '../types.ts';

interface RecipeGridProps {
  recipes: RecipeSuggestion[];
  savedIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  hasIngredients: boolean;
  activeTab: 'suggested' | 'saved';
  savedRecipes: RecipeSuggestion[];
  onTabChange: (tab: 'suggested' | 'saved') => void;
  onSelectRecipe: (recipe: RecipeSuggestion) => void;
  onToggleSave: (recipe: RecipeSuggestion) => void;
  onSuggestNow: () => void;
}

export function RecipeGrid({
  recipes,
  savedIds,
  isLoading,
  error,
  hasIngredients,
  activeTab,
  savedRecipes,
  onTabChange,
  onSelectRecipe,
  onToggleSave,
  onSuggestNow,
}: RecipeGridProps) {
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'ready'>('all');

  const sourceList = activeTab === 'saved' ? savedRecipes : recipes;
  const visibleRecipes =
    availabilityFilter === 'ready' && activeTab === 'suggested'
      ? sourceList.filter((r) => r.missingIngredients.length === 0)
      : sourceList;

  return (
    <section id="dishes" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#E5E5E0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#171717]">
            {activeTab === 'saved' ? 'Saved Cookbook' : 'Dishes You Can Cook'}
          </h2>
          <p className="text-sm text-[#52524E] mt-1">
            {activeTab === 'saved'
              ? 'Recipes bookmarked on this device for quick return.'
              : 'Ranked to prioritize dishes using only what you already have.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'suggested' && recipes.length > 0 && (
            <div className="inline-flex items-center gap-1 p-1 bg-[#F4F3EE] rounded-lg">
              <button
                type="button"
                onClick={() => setAvailabilityFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  availabilityFilter === 'all'
                    ? 'bg-white text-[#171717] shadow-xs'
                    : 'text-[#52524E] hover:text-[#171717]'
                }`}
              >
                All Matches ({recipes.length})
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('ready')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  availabilityFilter === 'ready'
                    ? 'bg-white text-[#171717] shadow-xs'
                    : 'text-[#52524E] hover:text-[#171717]'
                }`}
              >
                Cook Now ({recipes.filter((r) => r.missingIngredients.length === 0).length})
              </button>
            </div>
          )}

          <div className="inline-flex items-center gap-1 p-1 bg-[#F4F3EE] rounded-lg">
            <button
              type="button"
              onClick={() => onTabChange('suggested')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'suggested'
                  ? 'bg-white text-[#171717] shadow-xs'
                  : 'text-[#52524E] hover:text-[#171717]'
              }`}
            >
              Suggestions
            </button>
            <button
              type="button"
              onClick={() => onTabChange('saved')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-white text-[#171717] shadow-xs'
                  : 'text-[#52524E] hover:text-[#171717]'
              }`}
            >
              Saved ({savedRecipes.length})
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-[#E5E5E0] rounded-xl p-6 flex flex-col gap-4 animate-pulse"
            >
              <div className="h-3.5 w-28 bg-[#EFECE4] rounded" />
              <div className="h-6 w-3/4 bg-[#EFECE4] rounded" />
              <div className="h-12 w-full bg-[#F4F3EE] rounded" />
              <div className="h-4 w-1/2 bg-[#EFECE4] rounded mt-auto" />
            </div>
          ))}
        </div>
      ) : visibleRecipes.length === 0 ? (
        <div className="bg-white border border-[#E5E5E0] rounded-xl p-10 text-center">
          <div className="w-11 h-11 rounded-full bg-[#FAF9F6] border border-[#E5E5E0] flex items-center justify-center mx-auto mb-3 text-[#1F5132]">
            <Utensils className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-[#171717]">
            {activeTab === 'saved'
              ? 'No saved recipes yet'
              : availabilityFilter === 'ready' && recipes.length > 0
                ? 'No 100%-ready recipes in this batch'
                : 'Ready when your ingredients are'}
          </h3>
          <p className="text-sm text-[#52524E] max-w-md mx-auto mt-1.5 mb-5">
            {activeTab === 'saved'
              ? 'Bookmark any suggested dish to keep its steps and measurements handy.'
              : availabilityFilter === 'ready' && recipes.length > 0
                ? 'Switch to All Matches to see dishes needing just one extra item, or toggle more household staples.'
                : hasIngredients
                  ? 'Your ingredients are lined up. Click below to generate tailored dishes you can cook right now.'
                  : 'Capture a photo of your fridge or counter, or pick a sample countertop kit above to see matching dishes.'}
          </p>
          {activeTab === 'suggested' && hasIngredients && recipes.length === 0 && (
            <button
              type="button"
              onClick={onSuggestNow}
              className="px-4 py-2.5 text-sm font-medium bg-[#1F5132] text-white rounded-lg hover:bg-[#173E26] transition-colors cursor-pointer"
            >
              Suggest Dishes Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleRecipes.map((recipe) => {
            const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;
            const isReady = recipe.missingIngredients.length === 0;
            const isSaved = savedIds.has(recipe.id);

            return (
              <article
                key={recipe.id}
                className="bg-white border border-[#E5E5E0] rounded-xl p-6 flex flex-col justify-between gap-5 hover:border-[#C7C6BE] transition-colors"
              >
                <div className="flex flex-col gap-3">
                  {/* Quiet unboxed metadata line */}
                  <div className="flex items-center justify-between gap-2 text-xs text-[#52524E]">
                    <span className="truncate">
                      {recipe.cuisine} · {recipe.mealType}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSave(recipe)}
                      aria-label={isSaved ? `Unsave ${recipe.title}` : `Save ${recipe.title}`}
                      className={`p-1.5 rounded-md transition-colors shrink-0 cursor-pointer ${
                        isSaved
                          ? 'text-[#1F5132] bg-[#1F5132]/10'
                          : 'text-[#787771] hover:text-[#171717] hover:bg-[#F4F3EE]'
                      }`}
                    >
                      <Bookmark
                        className="w-4 h-4"
                        fill={isSaved ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-[#171717] leading-snug">
                      <button
                        type="button"
                        onClick={() => onSelectRecipe(recipe)}
                        className="text-left hover:text-[#1F5132] transition-colors cursor-pointer"
                      >
                        {recipe.title}
                      </button>
                    </h3>
                    <p className="text-xs text-[#52524E] mt-1 tabular-nums">
                      {totalMinutes} min total · {recipe.difficulty} · Serves {recipe.servings}
                    </p>
                  </div>

                  <p className="text-sm text-[#40403C] leading-relaxed">
                    {recipe.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#EFECE4] flex flex-col gap-3">
                  <div className="flex items-start gap-2 text-xs">
                    {isReady ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#1F5132] shrink-0 mt-0.5" />
                        <span className="text-[#1F5132] font-medium">
                          Cook now — uses {recipe.matchedIngredients.length} of your ingredients
                        </span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                        <span className="text-[#52524E]">
                          Missing {recipe.missingIngredients.length}:{' '}
                          <span className="text-[#171717] font-medium">
                            {recipe.missingIngredients.join(', ')}
                          </span>
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectRecipe(recipe)}
                    className="w-full inline-flex items-center justify-between px-3.5 py-2 text-sm font-medium bg-[#FAF9F6] border border-[#E5E5E0] text-[#171717] rounded-lg hover:bg-[#F4F3EE] hover:border-[#D4D3CC] transition-colors cursor-pointer"
                  >
                    <span>Open Recipe Steps</span>
                    <ArrowUpRight className="w-4 h-4 text-[#52524E]" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

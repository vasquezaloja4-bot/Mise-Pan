import React, { useEffect, useState } from 'react';
import { X, Bookmark, Check, Clock, Users } from 'lucide-react';
import type { RecipeSuggestion } from '../types.ts';

interface RecipeDrawerProps {
  recipe: RecipeSuggestion | null;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: (recipe: RecipeSuggestion) => void;
}

export function RecipeDrawer({
  recipe,
  isSaved,
  onClose,
  onToggleSave,
}: RecipeDrawerProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setCheckedIngredients({});
    setCompletedSteps({});
  }, [recipe?.id]);

  useEffect(() => {
    if (!recipe) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [recipe, onClose]);

  if (!recipe) return null;

  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-drawer-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white h-full overflow-y-auto border-l border-[#E5E5E0] flex flex-col"
      >
        {/* Sticky Drawer Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-[#E5E5E0] px-6 py-4 flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-[#52524E] truncate">
            {recipe.cuisine} · {recipe.mealType}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleSave(recipe)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-[#1F5132]/10 border-[#1F5132] text-[#1F5132]'
                  : 'bg-white border-[#D4D3CC] text-[#171717] hover:bg-[#F4F3EE]'
              }`}
            >
              <Bookmark
                className="w-3.5 h-3.5"
                fill={isSaved ? 'currentColor' : 'none'}
              />
              {isSaved ? 'Saved' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close recipe"
              className="p-2 text-[#52524E] hover:text-[#171717] rounded-lg hover:bg-[#F4F3EE] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-8">
          <div>
            <h2
              id="recipe-drawer-title"
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#171717] leading-tight"
            >
              {recipe.title}
            </h2>
            <p className="text-sm text-[#40403C] leading-relaxed mt-3">
              {recipe.summary}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 py-3.5 border-y border-[#EFECE4] text-sm">
              <div className="flex items-center gap-2 text-[#171717] tabular-nums">
                <Clock className="w-4 h-4 text-[#52524E]" />
                <span>{totalMinutes} min</span>
              </div>
              <div className="flex items-center gap-2 text-[#171717] tabular-nums">
                <Users className="w-4 h-4 text-[#52524E]" />
                <span>Serves {recipe.servings}</span>
              </div>
              <div className="text-[#171717] font-medium text-right">
                {recipe.difficulty}
              </div>
            </div>
          </div>

          {/* Ingredients Checklist */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#171717]">
                Ingredients
              </h3>
              <span className="text-xs text-[#52524E]">
                Tap to check off as you prep
              </span>
            </div>
            <ul className="divide-y divide-[#EFECE4] border-y border-[#EFECE4]">
              {recipe.ingredientsWithAmounts.map((line, index) => {
                const checked = Boolean(checkedIngredients[index]);
                return (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() =>
                        setCheckedIngredients((prev) => ({
                          ...prev,
                          [index]: !prev[index],
                        }))
                      }
                      className="w-full py-2.5 flex items-start gap-3 text-left cursor-pointer group"
                    >
                      <span
                        className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          checked
                            ? 'bg-[#1F5132] border-[#1F5132] text-white'
                            : 'border-[#C7C6BE] bg-white group-hover:border-[#1F5132]'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                      <span
                        className={`text-sm leading-relaxed ${
                          checked ? 'line-through text-[#787771]' : 'text-[#171717]'
                        }`}
                      >
                        {line}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Preparation Steps */}
          <div>
            <h3 className="text-lg font-semibold text-[#171717] mb-3">
              Method
            </h3>
            <ol className="flex flex-col gap-4">
              {recipe.steps.map((step, index) => {
                const done = Boolean(completedSteps[index]);
                return (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() =>
                        setCompletedSteps((prev) => ({
                          ...prev,
                          [index]: !prev[index],
                        }))
                      }
                      className={`w-full p-4 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-3.5 ${
                        done
                          ? 'bg-[#FAF9F6] border-[#E5E5E0] opacity-70'
                          : 'bg-white border-[#E5E5E0] hover:border-[#C7C6BE]'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums ${
                          done
                            ? 'bg-[#1F5132] text-white'
                            : 'bg-[#F4F3EE] text-[#171717]'
                        }`}
                      >
                        {done ? <Check className="w-3.5 h-3.5" /> : index + 1}
                      </span>
                      <span
                        className={`text-sm leading-relaxed ${
                          done ? 'line-through text-[#52524E]' : 'text-[#171717]'
                        }`}
                      >
                        {step}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {recipe.chefTip && (
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E5E0]">
              <p className="text-xs font-semibold text-[#1F5132] mb-1">
                Kitchen Note
              </p>
              <p className="text-sm text-[#40403C] leading-relaxed">
                {recipe.chefTip}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

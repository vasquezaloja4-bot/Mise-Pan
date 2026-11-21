/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { CaptureStudio } from './components/CaptureStudio.tsx';
import { PantryPanel } from './components/PantryPanel.tsx';
import { RecipeGrid } from './components/RecipeGrid.tsx';
import { RecipeDrawer } from './components/RecipeDrawer.tsx';
import {
  HERO_IMAGE_URL,
  HOUSEHOLD_STAPLES,
  SAMPLE_KITS,
} from './data/samples.ts';
import type {
  DietaryFilter,
  IngredientCategory,
  IngredientItem,
  MealFilter,
  RecipeSuggestion,
  SampleKit,
} from './types.ts';

const PANTRY_STORAGE_KEY = 'mise_pan_pantry_v1';
const SAVED_RECIPES_STORAGE_KEY = 'mise_pan_saved_v1';

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private mode failures
  }
}

export default function App() {
  const [ingredients, setIngredients] = useState<IngredientItem[]>(() =>
    readStoredJson<IngredientItem[]>(PANTRY_STORAGE_KEY, [])
  );
  const [selectedStaples, setSelectedStaples] = useState<string[]>([
    'Salt & Black Pepper',
    'Cooking Oil',
    'Garlic',
  ]);
  const [mealFilter, setMealFilter] = useState<MealFilter>('All');
  const [dietaryFilter, setDietaryFilter] = useState<DietaryFilter>('Any');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [lastScanNote, setLastScanNote] = useState<string | null>(null);
  const [lastPreviewUrl, setLastPreviewUrl] = useState<string | null>(null);

  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'suggested' | 'saved'>('suggested');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSuggestion | null>(null);

  const [savedRecipes, setSavedRecipes] = useState<RecipeSuggestion[]>(() =>
    readStoredJson<RecipeSuggestion[]>(SAVED_RECIPES_STORAGE_KEY, [])
  );
  const [heroImageError, setHeroImageError] = useState(false);

  const dishesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    writeStoredJson(PANTRY_STORAGE_KEY, ingredients);
  }, [ingredients]);

  useEffect(() => {
    writeStoredJson(SAVED_RECIPES_STORAGE_KEY, savedRecipes);
  }, [savedRecipes]);

  const savedIds = useMemo(
    () => new Set(savedRecipes.map((r) => r.id)),
    [savedRecipes]
  );

  const mergeIngredients = (
    incoming: Array<{
      name: string;
      category?: IngredientCategory;
      quantityEstimate?: string;
      source: IngredientItem['source'];
    }>
  ): IngredientItem[] => {
    const existingByLower = new Map<string, IngredientItem>();
    for (const item of ingredients) {
      existingByLower.set(item.name.trim().toLowerCase(), item);
    }

    for (const raw of incoming) {
      const cleanName = raw.name.trim();
      if (!cleanName) continue;
      const key = cleanName.toLowerCase();
      if (!existingByLower.has(key)) {
        existingByLower.set(key, {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
          category: raw.category ?? 'Produce',
          quantityEstimate: raw.quantityEstimate,
          source: raw.source,
        });
      }
    }

    const next = Array.from(existingByLower.values());
    setIngredients(next);
    return next;
  };

  const fetchRecipeSuggestions = async (
    ingredientList: IngredientItem[],
    staplesList: string[],
    meal: MealFilter = mealFilter,
    dietary: DietaryFilter = dietaryFilter
  ) => {
    if (ingredientList.length === 0 && staplesList.length === 0) return;

    setIsSuggesting(true);
    setSuggestError(null);
    setActiveTab('suggested');

    try {
      const response = await fetch('/api/suggest-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ingredientList.map((i) => i.name),
          staples: staplesList,
          mealType: meal,
          dietary,
        }),
      });

      const data = (await response.json()) as {
        recipes?: RecipeSuggestion[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Could not generate recipe suggestions.');
      }

      setRecipes(data.recipes ?? []);
    } catch (err) {
      setSuggestError(
        err instanceof Error
          ? err.message
          : 'Unable to fetch dish suggestions right now.'
      );
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAnalyzeImage = async (
    base64: string,
    mimeType: string,
    previewUrl: string,
    source: 'camera' | 'photo'
  ) => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setLastPreviewUrl(previewUrl);

    try {
      const response = await fetch('/api/analyze-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = (await response.json()) as {
        sceneNote?: string;
        ingredients?: Array<{
          name: string;
          category: IngredientCategory;
          quantityEstimate?: string;
        }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Could not identify ingredients from photo.');
      }

      const detected = data.ingredients ?? [];
      if (detected.length === 0) {
        setLastScanNote(
          data.sceneNote ||
            'No clear edible ingredients were spotted in that frame. Try brighter lighting or add items manually.'
        );
        return;
      }

      setLastScanNote(
        data.sceneNote || `Detected ${detected.length} ingredients from your photo.`
      );

      const updated = mergeIngredients(
        detected.map((item) => ({
          name: item.name,
          category: item.category,
          quantityEstimate: item.quantityEstimate,
          source,
        }))
      );

      await fetchRecipeSuggestions(updated, selectedStaples);
    } catch (err) {
      setAnalyzeError(
        err instanceof Error
          ? err.message
          : 'Unable to scan that image right now.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSampleKit = (kit: SampleKit) => {
    setAnalyzeError(null);
    setLastPreviewUrl(kit.imageUrl);
    setLastScanNote(`Loaded ${kit.ingredients.length} ingredients from ${kit.title}.`);

    const nextItems: IngredientItem[] = kit.ingredients.map((item, idx) => ({
      id: `sample-${kit.id}-${idx}-${Date.now()}`,
      name: item.name,
      category: item.category,
      quantityEstimate: item.quantityEstimate,
      source: 'sample',
    }));

    setIngredients(nextItems);
    void fetchRecipeSuggestions(nextItems, selectedStaples);
  };

  const handleAddManualIngredients = (names: string[]) => {
    mergeIngredients(
      names.map((name) => ({
        name,
        category: 'Produce',
        source: 'manual',
      }))
    );
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearIngredients = () => {
    setIngredients([]);
    setLastPreviewUrl(null);
    setLastScanNote(null);
  };

  const handleToggleStaple = (staple: string) => {
    setSelectedStaples((prev) =>
      prev.includes(staple) ? prev.filter((s) => s !== staple) : [...prev, staple]
    );
  };

  const handleToggleSaveRecipe = (recipe: RecipeSuggestion) => {
    setSavedRecipes((prev) => {
      const exists = prev.some((r) => r.id === recipe.id);
      if (exists) {
        return prev.filter((r) => r.id !== recipe.id);
      }
      return [recipe, ...prev];
    });
  };

  const scrollToSection = (id: string, tab?: 'suggested' | 'saved') => {
    if (tab) {
      setActiveTab(tab);
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFCFA] text-[#171717]">
      {/* 3-Zone Top Bar Contract (No login/Gmail buttons) */}
      <header className="sticky top-0 z-30 bg-[#FCFCFA]/95 backdrop-blur-xs border-b border-[#E5E5E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-semibold tracking-tight text-[#171717] whitespace-nowrap shrink-0"
          >
            Mise &amp; Pan
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#52524E]"
          >
            <button
              type="button"
              onClick={() => scrollToSection('capture')}
              className="hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pantry')}
              className="hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ingredients
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('dishes', 'suggested')}
              className="hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Dishes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('dishes', 'saved')}
              className="hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Saved
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection('capture')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-[#1F5132] text-white rounded-lg hover:bg-[#173E26] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Scan Ingredients
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Editorial Hero */}
        <section className="border-b border-[#E5E5E0] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium text-[#1F5132] mb-3">
                Camera · Photo Upload · Everyday Pantry
              </p>
              <h1
                className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#171717] leading-[1.1]"
                style={{ textWrap: 'balance' }}
              >
                Show what is in your kitchen, cook what fits tonight.
              </h1>
              <p className="text-base text-[#52524E] leading-relaxed mt-4 max-w-xl">
                Snap your fridge shelf, grocery haul, or countertop ingredients. Mise &amp; Pan
                reads what you have on hand and suggests real dishes with step-by-step
                instructions—zero sign-in required.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollToSection('capture')}
                  className="px-5 py-2.5 text-sm font-semibold bg-[#1F5132] text-white rounded-lg hover:bg-[#173E26] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Capture a Photo
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSampleKit(SAMPLE_KITS[0])}
                  className="px-5 py-2.5 text-sm font-medium bg-[#FAF9F6] border border-[#D4D3CC] text-[#171717] rounded-lg hover:bg-[#F4F3EE] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Try Sample Kitchen
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[240px] lg:min-h-[320px] rounded-xl overflow-hidden border border-[#E5E5E0] bg-[#EFECE4]">
                {heroImageError ? (
                  <div className="w-full h-full flex items-center justify-center p-8 text-center text-[#52524E]">
                    <span className="text-sm font-medium">
                      Fresh kitchen ingredients ready for prep
                    </span>
                  </div>
                ) : (
                  <img
                    src={HERO_IMAGE_URL}
                    alt="Fresh heirloom tomatoes, garlic bulbs, basil, brown eggs, lemon, and cast-iron skillet on a limestone kitchen counter"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImageError(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Capture + Pantry Split Workspace */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <CaptureStudio
                isAnalyzing={isAnalyzing}
                analyzeError={analyzeError}
                lastScanNote={lastScanNote}
                lastPreviewUrl={lastPreviewUrl}
                sampleKits={SAMPLE_KITS}
                onAnalyzeImage={handleAnalyzeImage}
                onLoadSampleKit={handleLoadSampleKit}
                onClearError={() => setAnalyzeError(null)}
              />
            </div>

            <div className="lg:col-span-5">
              <PantryPanel
                ingredients={ingredients}
                selectedStaples={selectedStaples}
                allStaples={HOUSEHOLD_STAPLES}
                mealFilter={mealFilter}
                dietaryFilter={dietaryFilter}
                isSuggesting={isSuggesting}
                onAddIngredients={handleAddManualIngredients}
                onRemoveIngredient={handleRemoveIngredient}
                onClearIngredients={handleClearIngredients}
                onToggleStaple={handleToggleStaple}
                onMealFilterChange={setMealFilter}
                onDietaryFilterChange={setDietaryFilter}
                onSuggestRecipes={() => {
                  void fetchRecipeSuggestions(ingredients, selectedStaples);
                  dishesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            </div>
          </div>
        </section>

        {/* Recipe Suggestions Section */}
        <div ref={dishesRef} className="max-w-7xl mx-auto px-4 sm:px-8 pb-16">
          <RecipeGrid
            recipes={recipes}
            savedIds={savedIds}
            isLoading={isSuggesting}
            error={suggestError}
            hasIngredients={ingredients.length + selectedStaples.length > 0}
            activeTab={activeTab}
            savedRecipes={savedRecipes}
            onTabChange={setActiveTab}
            onSelectRecipe={setSelectedRecipe}
            onToggleSave={handleToggleSaveRecipe}
            onSuggestNow={() => void fetchRecipeSuggestions(ingredients, selectedStaples)}
          />
        </div>
      </main>

      <footer className="border-t border-[#E5E5E0] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#52524E]">
          <span>Mise &amp; Pan — Cook from what you already have</span>
          <span>Saved recipes and pantry lists stay on your device</span>
        </div>
      </footer>

      <RecipeDrawer
        recipe={selectedRecipe}
        isSaved={selectedRecipe ? savedIds.has(selectedRecipe.id) : false}
        onClose={() => setSelectedRecipe(null)}
        onToggleSave={handleToggleSaveRecipe}
      />
    </div>
  );
}

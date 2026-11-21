import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseJsonSafe<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

async function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '15mb' }));

  // Ensure iframe embedding works smoothly in preview and hosted environments
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Frame-Options');
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'mise-and-pan' });
  });

  app.post('/api/analyze-ingredients', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Please provide an image to analyze.' });
        return;
      }

      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const validMimeType =
        typeof mimeType === 'string' && mimeType.startsWith('image/')
          ? mimeType
          : 'image/jpeg';

      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: validMimeType,
                data: cleanBase64,
              },
            },
            {
              text:
                'Identify all visible edible food ingredients in this photograph (produce, proteins, dairy, eggs, grains, bread, herbs, spices, condiments, sauces). ' +
                'Ignore non-food props like plates, knives, napkins, or countertops. ' +
                'Use clear, everyday culinary names (e.g. "Cherry tomatoes", "Garlic", "Brown eggs", "Firm tofu"). ' +
                'Estimate approximate visible quantity concisely (e.g. "4 eggs", "1 bunch", "250g").',
            },
          ],
        },
        config: {
          systemInstruction:
            'You are a sharp culinary prep assistant. Identify visible ingredients accurately without inventing items that are not in the photo.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sceneNote: {
                type: Type.STRING,
                description: 'Brief 1-sentence summary of what was spotted in the photo.',
              },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: 'Common culinary ingredient name.',
                    },
                    category: {
                      type: Type.STRING,
                      description:
                        'One of: Produce, Protein, Dairy & Eggs, Grains & Bread, Pantry & Sauces, Herbs & Spices.',
                    },
                    quantityEstimate: {
                      type: Type.STRING,
                      description: 'Concise visual quantity estimate.',
                    },
                  },
                  required: ['name', 'category', 'quantityEstimate'],
                },
              },
            },
            required: ['sceneNote', 'ingredients'],
          },
        },
      });

      const parsed = parseJsonSafe<{
        sceneNote?: string;
        ingredients?: Array<{
          name: string;
          category: string;
          quantityEstimate?: string;
        }>;
      }>(response.text, { sceneNote: '', ingredients: [] });

      const allowedCategories = new Set([
        'Produce',
        'Protein',
        'Dairy & Eggs',
        'Grains & Bread',
        'Pantry & Sauces',
        'Herbs & Spices',
      ]);

      const normalized = (parsed.ingredients ?? [])
        .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
        .map((item) => ({
          name: item.name.trim(),
          category: allowedCategories.has(item.category) ? item.category : 'Produce',
          quantityEstimate: (item.quantityEstimate ?? '').trim(),
        }));

      res.json({
        sceneNote: parsed.sceneNote || 'Ingredients detected from your photo.',
        ingredients: normalized,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to analyze photo right now.';
      console.error('Error in /api/analyze-ingredients:', error);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/suggest-recipes', async (req: Request, res: Response) => {
    try {
      const { ingredients, staples, mealType, dietary } = req.body as {
        ingredients?: string[];
        staples?: string[];
        mealType?: string;
        dietary?: string;
      };

      const mainList = Array.isArray(ingredients)
        ? ingredients.map((s) => String(s).trim()).filter(Boolean)
        : [];
      const stapleList = Array.isArray(staples)
        ? staples.map((s) => String(s).trim()).filter(Boolean)
        : [];

      if (mainList.length === 0 && stapleList.length === 0) {
        res.status(400).json({ error: 'Add or scan at least one ingredient first.' });
        return;
      }

      const ai = getAiClient();

      const mealClause =
        mealType && mealType !== 'All' ? `Focus on ${mealType} dishes.` : 'Offer a varied mix of practical meals.';
      const dietClause =
        dietary && dietary !== 'Any'
          ? `All suggested dishes MUST strictly follow a ${dietary} diet.`
          : 'No specific dietary restriction.';

      const promptText = [
        `Available main ingredients: ${mainList.length ? mainList.join(', ') : 'None listed'}.`,
        `Available pantry staples: ${stapleList.length ? stapleList.join(', ') : 'Salt and water only'}.`,
        mealClause,
        dietClause,
        'Suggest 6 real, delicious, practical dishes the user can actually cook.',
        'Prioritize at least 3-4 recipes that require ZERO extra ingredients beyond what is listed above (missingIngredients = []).',
        'For any remaining recipes, allow at most 1-2 minor missing ingredients and clearly list them in missingIngredients.',
        'Keep instructions clear, numbered-ready, practical, and accurate with real cooking temperatures and times.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: promptText,
        config: {
          systemInstruction:
            'You are an experienced home-kitchen recipe developer. Create realistic, appetizing dishes that maximize the ingredients the user already has and avoid unnecessary shopping trips.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recipes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    cuisine: { type: Type.STRING },
                    mealType: { type: Type.STRING },
                    prepMinutes: { type: Type.INTEGER },
                    cookMinutes: { type: Type.INTEGER },
                    difficulty: { type: Type.STRING },
                    servings: { type: Type.INTEGER },
                    summary: { type: Type.STRING },
                    matchedIngredients: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    missingIngredients: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    ingredientsWithAmounts: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    steps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    chefTip: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'cuisine',
                    'mealType',
                    'prepMinutes',
                    'cookMinutes',
                    'difficulty',
                    'servings',
                    'summary',
                    'matchedIngredients',
                    'missingIngredients',
                    'ingredientsWithAmounts',
                    'steps',
                    'chefTip',
                  ],
                },
              },
            },
            required: ['recipes'],
          },
        },
      });

      const parsed = parseJsonSafe<{
        recipes?: Array<{
          title: string;
          cuisine: string;
          mealType: string;
          prepMinutes: number;
          cookMinutes: number;
          difficulty: string;
          servings: number;
          summary: string;
          matchedIngredients: string[];
          missingIngredients: string[];
          ingredientsWithAmounts: string[];
          steps: string[];
          chefTip: string;
        }>;
      }>(response.text, { recipes: [] });

      const normalized = (parsed.recipes ?? [])
        .filter((r) => r && typeof r.title === 'string' && r.title.trim().length > 0)
        .map((r, index) => {
          const difficulty =
            r.difficulty === 'Medium' || r.difficulty === 'Chef' ? r.difficulty : 'Easy';
          return {
            id: `${Date.now()}-${index}-${r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            title: r.title.trim(),
            cuisine: (r.cuisine || 'Home Kitchen').trim(),
            mealType: (r.mealType || 'Main').trim(),
            prepMinutes: Number.isFinite(r.prepMinutes) ? Math.max(1, r.prepMinutes) : 10,
            cookMinutes: Number.isFinite(r.cookMinutes) ? Math.max(0, r.cookMinutes) : 15,
            difficulty,
            servings: Number.isFinite(r.servings) ? Math.max(1, r.servings) : 2,
            summary: (r.summary || '').trim(),
            matchedIngredients: Array.isArray(r.matchedIngredients) ? r.matchedIngredients : [],
            missingIngredients: Array.isArray(r.missingIngredients) ? r.missingIngredients : [],
            ingredientsWithAmounts: Array.isArray(r.ingredientsWithAmounts)
              ? r.ingredientsWithAmounts
              : [],
            steps: Array.isArray(r.steps) ? r.steps : [],
            chefTip: (r.chefTip || '').trim(),
          };
        })
        .sort((a, b) => a.missingIngredients.length - b.missingIngredients.length);

      res.json({ recipes: normalized });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate dish suggestions right now.';
      console.error('Error in /api/suggest-recipes:', error);
      res.status(500).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(200).send('Application build not found. Run npm run build first.');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mise & Pan server listening on http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

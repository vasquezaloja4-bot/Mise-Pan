import type { SampleKit } from '../types.ts';

export const HERO_IMAGE_URL = '/src/assets/images/hero_kitchen_counter_1795262370280.jpg';

export const HOUSEHOLD_STAPLES: string[] = [
  'Salt & Black Pepper',
  'Cooking Oil',
  'Olive Oil',
  'Butter',
  'Garlic',
  'Yellow Onion',
  'Soy Sauce',
  'White Rice',
  'All-Purpose Flour',
  'Sugar',
];

export const SAMPLE_KITS: SampleKit[] = [
  {
    id: 'stirfry',
    title: 'Weeknight Stir-Fry Basket',
    subtitle: 'Tofu, broccoli, bell pepper, scallions, ginger, garlic, soy sauce',
    imageUrl: '/src/assets/images/sample_stirfry_kit_1795262370039.jpg',
    ingredients: [
      { name: 'Firm tofu', category: 'Protein', quantityEstimate: '1 block (300g)' },
      { name: 'Broccoli florets', category: 'Produce', quantityEstimate: '1 head' },
      { name: 'Red bell pepper', category: 'Produce', quantityEstimate: '1 pepper' },
      { name: 'Scallions', category: 'Produce', quantityEstimate: '1 bunch' },
      { name: 'Fresh ginger', category: 'Herbs & Spices', quantityEstimate: '1 thumb' },
      { name: 'Garlic', category: 'Herbs & Spices', quantityEstimate: '5 cloves' },
      { name: 'Soy sauce', category: 'Pantry & Sauces', quantityEstimate: '3 tbsp' },
    ],
  },
  {
    id: 'pasta',
    title: 'Mediterranean Countertop',
    subtitle: 'Cherry tomatoes, spaghetti, basil, parmesan, lemon, garlic',
    imageUrl: '/src/assets/images/sample_pasta_kit_1795262369982.jpg',
    ingredients: [
      { name: 'Cherry tomatoes', category: 'Produce', quantityEstimate: '250g on vine' },
      { name: 'Spaghetti', category: 'Grains & Bread', quantityEstimate: '250g dry' },
      { name: 'Fresh basil', category: 'Herbs & Spices', quantityEstimate: '1 handful' },
      { name: 'Parmesan cheese', category: 'Dairy & Eggs', quantityEstimate: '1 wedge' },
      { name: 'Lemon', category: 'Produce', quantityEstimate: '1 halved' },
      { name: 'Garlic', category: 'Herbs & Spices', quantityEstimate: '4 cloves' },
    ],
  },
  {
    id: 'breakfast',
    title: 'Morning Brunch Board',
    subtitle: 'Brown eggs, avocado, sourdough bread, baby spinach, chives',
    imageUrl: '/src/assets/images/sample_breakfast_kit_1795262370166.jpg',
    ingredients: [
      { name: 'Brown eggs', category: 'Dairy & Eggs', quantityEstimate: '5 eggs' },
      { name: 'Avocado', category: 'Produce', quantityEstimate: '1 ripe' },
      { name: 'Sourdough bread', category: 'Grains & Bread', quantityEstimate: '2 thick slices' },
      { name: 'Baby spinach', category: 'Produce', quantityEstimate: '2 handfuls' },
      { name: 'Fresh chives', category: 'Herbs & Spices', quantityEstimate: '1 small bunch' },
    ],
  },
];

import {
  detectBaseSpirits,
  deriveFlavorProfile,
  mapCategoryToCocktailType,
} from "@/lib/explore-helpers";
import type { ExploreCocktail, ExplorePayload } from "@/types/explore";

type CocktailDbDrink = Record<string, string | null>;

const LETTER_BUCKETS = ["a", "b", "c", "d", "e", "f", "g", "m", "n", "o", "p", "r", "s", "t"];
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

let cache:
  | {
      cocktails: ExploreCocktail[];
      fetchedAt: number;
    }
  | null = null;

async function fetchByLetter(letter: string) {
  const response = await fetch(
    `https://www.thecocktaildb.com/api/json/v1/1/search.php?f=${letter}`,
    { next: { revalidate: 0 } },
  );
  if (!response.ok) {
    throw new Error(`CocktailDB request failed for letter ${letter}`);
  }
  const payload = (await response.json()) as { drinks: CocktailDbDrink[] | null };
  return payload.drinks ?? [];
}

function buildIngredients(drink: CocktailDbDrink) {
  const items = [];
  for (let index = 1; index <= 15; index += 1) {
    const name = drink[`strIngredient${index}`];
    const measure = drink[`strMeasure${index}`];
    if (!name) continue;
    items.push({
      name: name.trim(),
      measure: measure?.trim() ?? null,
    });
  }
  return items;
}

function normalizeDrink(drink: CocktailDbDrink): ExploreCocktail | null {
  const name = drink.strDrink?.trim();
  const idDrink = drink.idDrink?.trim();
  const instructions = drink.strInstructions?.trim();

  if (!name || !idDrink || !instructions) {
    return null;
  }

  const ingredients = buildIngredients(drink);
  if (!ingredients.length) return null;

  const tags = drink.strTags
    ? drink.strTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  const ingredientNames = ingredients.map((ingredient) => ingredient.name);
  const baseSpirits = detectBaseSpirits(ingredientNames);
  const suggestedType = mapCategoryToCocktailType(drink.strCategory, drink.strDrink, ingredientNames);
  const flavorProfile = deriveFlavorProfile(tags, ingredientNames);
  const descriptionParts = [
    drink.strCategory?.trim(),
    drink.strIBA?.trim(),
    drink.strAlcoholic?.trim(),
  ].filter(Boolean);

  const popularityScore =
    4 +
    (drink.strIBA ? 3 : 0) +
    tags.length * 0.4 +
    Math.min(ingredients.length, 8) * 0.3 +
    (drink.strGlass?.toLowerCase().includes("coupe") ? 0.4 : 0);

  return {
    id: idDrink,
    name,
    category: drink.strCategory,
    alcoholic: drink.strAlcoholic,
    iba: drink.strIBA,
    glass: drink.strGlass,
    tags,
    description: descriptionParts.join(" • "),
    instructions: instructions.replace(/\r\n/g, "\n"),
    image: drink.strDrinkThumb,
    ingredients,
    baseSpirits,
    flavorProfile,
    popularityScore,
    suggestedType,
  };
}

async function getCatalog(): Promise<ExploreCocktail[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.cocktails;
  }

  const drinksPerLetter = await Promise.all(
    LETTER_BUCKETS.map(async (letter) => {
      try {
        return await fetchByLetter(letter);
      } catch (error) {
        console.error(error);
        return [];
      }
    }),
  );

  const parsed = drinksPerLetter
    .flat()
    .map((drink) => normalizeDrink(drink))
    .filter((record): record is ExploreCocktail => Boolean(record));

  // Deduplicate by ID
  const deduped = Array.from(
    parsed.reduce((map, cocktail) => map.set(cocktail.id, cocktail), new Map<string, ExploreCocktail>()).values(),
  );

  deduped.sort((a, b) => b.popularityScore - a.popularityScore);

  cache = {
    cocktails: deduped,
    fetchedAt: now,
  };

  return deduped;
}

export async function getExploreCocktails(): Promise<ExplorePayload> {
  const cocktails = await getCatalog();
  const fetchedAt = cache ? new Date(cache.fetchedAt).toISOString() : new Date().toISOString();

  return {
    cocktails,
    fetchedAt,
    source: "TheCocktailDB",
  };
}

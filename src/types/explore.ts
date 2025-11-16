import type { BaseSpirit } from "@/lib/explore-helpers";
import type { CocktailType } from "@/types/cocktail";

export type ExploreIngredient = {
  name: string;
  measure: string | null;
};

export type ExploreCocktail = {
  id: string;
  name: string;
  category: string | null;
  alcoholic: string | null;
  iba: string | null;
  glass: string | null;
  tags: string[];
  description: string;
  instructions: string;
  image: string | null;
  ingredients: ExploreIngredient[];
  baseSpirits: BaseSpirit[];
  flavorProfile: string[];
  popularityScore: number;
  suggestedType: CocktailType;
};

export type ExplorePayload = {
  cocktails: ExploreCocktail[];
  fetchedAt: string;
  source: string;
};

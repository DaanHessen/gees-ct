export type IngredientRecord = {
  id: string;
  name: string;
};

export type CocktailIngredientRecord = {
  id: string;
  detail: string;
  ingredient_id: string;
  ingredient?: IngredientRecord | null;
};

export type CocktailType =
  | "Spritz"
  | "Martini"
  | "Sour"
  | "Margarita"
  | "Negroni"
  | "Old Fashioned"
  | "Mojito"
  | "Mule"
  | "Collins"
  | "Daiquiri"
  | "Manhattan"
  | "Fizz"
  | "Punch"
  | "Highball"
  | "Shot"
  | "Other";

export const COCKTAIL_TYPE_COLORS: Record<CocktailType, string> = {
  Spritz: "#845EF7", // Purple
  Martini: "#495057", // Dark gray
  Sour: "#FCC419", // Yellow
  Margarita: "#20C997", // Teal/Green
  Negroni: "#C92A2A", // Red
  "Old Fashioned": "#E8590C", // Orange
  Mojito: "#2F9E44", // Green
  Mule: "#868E96", // Gray
  Collins: "#1C7ED6", // Blue
  Daiquiri: "#E64980", // Pink
  Manhattan: "#862E9C", // Deep purple
  Fizz: "#12B886", // Mint green
  Punch: "#F76707", // Bright orange
  Highball: "#339AF0", // Light blue
  Shot: "#D9480F", // Red-orange
  Other: "#748FFC", // Soft blue/purple - more interesting than gray
};

export type CocktailRecord = {
  id: string;
  name: string;
  description: string | null;
  recipe: string | null;
  image_url: string | null;
  color: string | null;
  cocktail_type: CocktailType | null;
  created_at: string;
  cocktail_ingredients?: CocktailIngredientRecord[] | null;
};

export type CocktailFormState = {
  name: string;
  description: string;
  recipe: string;
  imageUrl: string;
  cocktailType: CocktailType;
  ingredients: Array<{
    id?: string;
    ingredientName: string;
    detail: string;
  }>;
};

export const blankCocktailForm: CocktailFormState = {
  name: "",
  description: "",
  recipe: "",
  imageUrl: "",
  cocktailType: "Other",
  ingredients: [
    {
      ingredientName: "",
      detail: "",
    },
  ],
};

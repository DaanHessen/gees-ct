import type { CocktailType } from "@/types/cocktail";

const BASE_SPIRIT_KEYWORDS = {
  Vodka: ["vodka"],
  Gin: ["gin"],
  Rum: ["rum", "cachaca", "cachaça"],
  Tequila: ["tequila"],
  Whiskey: ["whiskey", "whisky", "rye"],
  Bourbon: ["bourbon"],
  Scotch: ["scotch"],
  Brandy: ["brandy"],
  Cognac: ["cognac"],
  Mezcal: ["mezcal"],
  Champagne: ["champagne", "prosecco", "cava", "sparkling wine"],
  Wine: ["wine", "vermouth", "porto", "port"],
} as const;

export type BaseSpirit = keyof typeof BASE_SPIRIT_KEYWORDS;

export const BASE_SPIRIT_OPTIONS: BaseSpirit[] = Object.keys(
  BASE_SPIRIT_KEYWORDS,
) as BaseSpirit[];

export function detectBaseSpirits(ingredientNames: string[]): BaseSpirit[] {
  const lowerIngredients = ingredientNames
    .filter(Boolean)
    .map((name) => name.toLowerCase());

  const spirits = new Set<BaseSpirit>();
  for (const [label, keywords] of Object.entries(BASE_SPIRIT_KEYWORDS)) {
    if (
      keywords.some((keyword) =>
        lowerIngredients.some((ingredient) => ingredient.includes(keyword)),
      )
    ) {
      spirits.add(label as BaseSpirit);
    }
  }

  return Array.from(spirits);
}

const CATEGORY_MATCHERS: Array<{ pattern: RegExp; type: CocktailType }> = [
  { pattern: /spritz|aperol spritz|campari spritz/i, type: "Spritz" },
  { pattern: /martini(?!.*(royale|french))|espresso martini|vodka martini|cosmopolitan/i, type: "Martini" },
  { pattern: /sour|whiskey sour|pisco sour|amaretto sour|midori sour/i, type: "Sour" },
  { pattern: /margarita|frozen margarita/i, type: "Margarita" },
  { pattern: /negroni|americano|boulevardier/i, type: "Negroni" },
  { pattern: /old[-\s]?fashioned/i, type: "Old Fashioned" },
  { pattern: /mojito|mint julep/i, type: "Mojito" },
  { pattern: /mule|moscow mule|mexican mule|kentucky mule|buck/i, type: "Mule" },
  { pattern: /collins|tom collins|vodka collins/i, type: "Collins" },
  { pattern: /daiquiri|frozen daiquiri/i, type: "Daiquiri" },
  { pattern: /manhattan|rob roy/i, type: "Manhattan" },
  { pattern: /fizz|gin fizz|ramos fizz|sloe gin fizz/i, type: "Fizz" },
  { pattern: /punch|planter|mai tai|zombie|tiki|hurricane|pina colada|piña colada/i, type: "Punch" },
  { pattern: /highball|vodka tonic|gin and tonic|screwdriver|cuba libre|rum and coke|whiskey ginger/i, type: "Highball" },
  { pattern: /shot|shooter|jager|jäger|kamikaze|b[-\s]?52|b52/i, type: "Shot" },
];

// Ingredient-based type detection
const INGREDIENT_TYPE_MATCHERS: Array<{ ingredients: RegExp[]; type: CocktailType }> = [
  // Highballs - spirit + mixer
  { ingredients: [/vodka/, /orange juice/i], type: "Highball" },
  { ingredients: [/vodka/, /cranberry/i], type: "Highball" },
  { ingredients: [/gin/, /tonic/i], type: "Highball" },
  { ingredients: [/rum/, /coke|cola/i], type: "Highball" },
  { ingredients: [/whiskey|whisky/, /ginger|ginger ale/i], type: "Highball" },
  { ingredients: [/vodka/, /red bull|energy/i], type: "Highball" },
  
  // Mojito family
  { ingredients: [/rum/, /lime|mint/i], type: "Mojito" },
  { ingredients: [/white rum/, /mint/i], type: "Mojito" },
  
  // Margaritas
  { ingredients: [/tequila/, /lime/i], type: "Margarita" },
  { ingredients: [/tequila/, /triple sec|cointreau/i], type: "Margarita" },
  { ingredients: [/tequila/, /grapefruit/i], type: "Margarita" },
  
  // Manhattans
  { ingredients: [/whiskey|whisky|bourbon|rye/, /sweet vermouth/i], type: "Manhattan" },
  { ingredients: [/whiskey|whisky/, /vermouth/, /bitters/i], type: "Manhattan" },
  
  // Negronis
  { ingredients: [/gin/, /campari/i], type: "Negroni" },
  { ingredients: [/gin/, /vermouth/, /campari/i], type: "Negroni" },
  
  // Martinis
  { ingredients: [/vodka/, /coffee|kahlua|espresso/i], type: "Martini" },
  { ingredients: [/gin/, /dry vermouth/i], type: "Martini" },
  { ingredients: [/vodka/, /dry vermouth/i], type: "Martini" },
  { ingredients: [/vodka/, /cranberry/, /lime/i], type: "Martini" }, // Cosmopolitan
  
  // Punch/Tiki
  { ingredients: [/rum/, /coconut/i], type: "Punch" },
  { ingredients: [/rum/, /pineapple/i], type: "Punch" },
  { ingredients: [/rum/, /orange juice/, /pineapple/i], type: "Punch" },
  { ingredients: [/rum/, /lime/, /orgeat|almond/i], type: "Punch" }, // Mai Tai
  
  // Spritz
  { ingredients: [/prosecco|champagne|sparkling/i, /aperol|campari/i], type: "Spritz" },
  { ingredients: [/prosecco|sparkling/i, /elderflower/i], type: "Spritz" },
  
  // Old Fashioned
  { ingredients: [/bourbon|whiskey|rye/, /sugar|simple syrup/i, /bitters/i], type: "Old Fashioned" },
  { ingredients: [/whiskey|bourbon/, /bitters/i], type: "Old Fashioned" },
  
  // Sours
  { ingredients: [/whiskey|bourbon/, /lemon juice/i, /sugar|syrup/i], type: "Sour" },
  { ingredients: [/amaretto/, /lemon/i], type: "Sour" },
  { ingredients: [/pisco/, /lemon|lime/i, /egg white/i], type: "Sour" },
  
  // Daiquiri
  { ingredients: [/white rum|light rum/, /lime/i, /sugar|syrup/i], type: "Daiquiri" },
];

export function mapCategoryToCocktailType(
  category?: string | null,
  name?: string | null,
  ingredients?: string[],
): CocktailType {
  const haystack = `${name ?? ""} ${category ?? ""}`.toLowerCase();

  // First try name/category matching
  for (const matcher of CATEGORY_MATCHERS) {
    if (matcher.pattern.test(haystack)) {
      return matcher.type;
    }
  }

  // Then try ingredient-based detection
  if (ingredients && ingredients.length > 0) {
    const ingredientText = ingredients.map(i => i.toLowerCase()).join(" ");
    
    for (const matcher of INGREDIENT_TYPE_MATCHERS) {
      const matches = matcher.ingredients.every(pattern => pattern.test(ingredientText));
      if (matches) {
        return matcher.type;
      }
    }

    // Fallback: Use base spirits and ingredients to make liberal guesses
    const spirits = detectBaseSpirits(ingredients);
    const hasLemon = /lemon/i.test(ingredientText);
    const hasLime = /lime/i.test(ingredientText);
    const hasCitrus = hasLemon || hasLime || /orange/i.test(ingredientText);
    const hasSugar = /sugar|syrup|simple/i.test(ingredientText);
    const hasBitters = /bitters/i.test(ingredientText);
    const hasCream = /cream|milk/i.test(ingredientText);
    const hasJuice = /juice/i.test(ingredientText);
    const hasSoda = /soda|tonic|ginger ale|cola|coke/i.test(ingredientText);
    const hasTropical = /pineapple|coconut|mango|passion/i.test(ingredientText);
    
    // Champagne/Sparkling = Spritz
    if (spirits.includes("Champagne")) {
      return "Spritz";
    }
    
    // Spirit + citrus + sugar = Sour
    if (spirits.length >= 1 && hasCitrus && hasSugar) {
      return "Sour";
    }
    
    // Spirit + bitters (+ sugar) = Old Fashioned
    if (hasBitters && spirits.length >= 1) {
      return "Old Fashioned";
    }
    
    // Rum + tropical = Punch
    if (spirits.includes("Rum") && hasTropical) {
      return "Punch";
    }
    
    // Multiple spirits = Punch
    if (spirits.length >= 2) {
      return "Punch";
    }
    
    // Spirit + soda/mixer = Highball
    if (spirits.length === 1 && hasSoda) {
      return "Highball";
    }
    
    // Spirit + juice (no citrus/sugar) = Highball
    if (spirits.length === 1 && hasJuice && !hasSugar) {
      return "Highball";
    }
    
    // Spirit + cream = Martini (creamy cocktails)
    if (spirits.length >= 1 && hasCream) {
      return "Martini";
    }
    
    // Single spirit + citrus (but no sugar) = Daiquiri/Collins
    if (spirits.length === 1 && hasCitrus) {
      if (spirits.includes("Rum")) {
        return "Daiquiri";
      }
      return "Collins";
    }
    
    // Gin-based without other matches = Martini
    if (spirits.includes("Gin")) {
      return "Martini";
    }
    
    // Whiskey-based without other matches = Manhattan
    if (spirits.includes("Whiskey") || spirits.includes("Bourbon")) {
      return "Manhattan";
    }
    
    // Vodka-based without other matches = Martini
    if (spirits.includes("Vodka")) {
      return "Martini";
    }
    
    // Default to Highball for simple spirit-based drinks
    if (spirits.length === 1) {
      return "Highball";
    }
  }

  return "Other";
}

export function pseudoRandomFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

const PROFILE_RULES: Array<{ label: string; keywords: RegExp }> = [
  { label: "Fruity", keywords: /(juice|syrup|grenadine|puree|fruit)/i },
  { label: "Refreshing", keywords: /(mint|soda|tonic|lime|lemon)/i },
  { label: "Creamy", keywords: /(cream|milk|coconut cream|irish cream|yoghurt)/i },
  { label: "Herbal", keywords: /(vermouth|chartreuse|basil|sage|thyme|rosemary)/i },
  { label: "Spicy", keywords: /(spice|ginger|pepper|tabasco|cinnamon|nutmeg)/i },
  { label: "Bubbly", keywords: /(champagne|prosecco|soda|sparkling)/i },
  { label: "Dessert", keywords: /(chocolate|coffee|cream|vanilla|cacao)/i },
  { label: "Smoky", keywords: /(mezcal|scotch|islay|peated)/i },
  { label: "Tropical", keywords: /(coconut|pineapple|passion|mango)/i },
];

export function deriveFlavorProfile(
  tags: string[],
  ingredientNames: string[],
): string[] {
  const combined = [...tags.map((tag) => tag.toLowerCase()), ...ingredientNames.map((name) => name.toLowerCase())];
  const matched = new Set<string>();

  PROFILE_RULES.forEach((rule) => {
    if (combined.some((value) => rule.keywords.test(value))) {
      matched.add(rule.label);
    }
  });

  if (!matched.size) {
    matched.add("Signature");
  }

  return Array.from(matched);
}

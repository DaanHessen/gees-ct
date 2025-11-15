"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { type CocktailIngredientRecord, type CocktailRecord } from "@/types/cocktail";

export type CocktailWithRelations = CocktailRecord & {
  cocktail_ingredients: CocktailIngredientRecord[];
};

type CocktailCacheContextType = {
  cocktails: CocktailWithRelations[];
  loading: boolean;
  refreshCocktails: () => Promise<void>;
  getCocktailById: (id: string) => CocktailWithRelations | undefined;
};

const CocktailCacheContext = createContext<CocktailCacheContextType | undefined>(undefined);

export function CocktailCacheProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [cocktails, setCocktails] = useState<CocktailWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCocktails = useCallback(async () => {
    try {
      const { data: cocktailsData, error } = await supabase
        .from("cocktails")
        .select(
          `
          id,
          name,
          description,
          recipe,
          image_url,
          cocktail_type,
          created_at,
          cocktail_ingredients (
            id,
            detail,
            ingredient_id,
            ingredient:ingredients (
              id,
              name
            )
          )
        `,
        )
        .order("cocktail_type", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (error) throw error;

      const processedCocktails = (cocktailsData ?? []).map((record) => ({
        ...record,
        cocktail_ingredients:
          record.cocktail_ingredients?.map((ci) => ({
            ...ci,
            ingredient: Array.isArray(ci.ingredient) ? ci.ingredient[0] : ci.ingredient,
          })) ?? [],
      })) as CocktailWithRelations[];

      setCocktails(processedCocktails);
    } catch (error) {
      console.error("Failed to load cocktails:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const refreshCocktails = useCallback(async () => {
    await loadCocktails();
  }, [loadCocktails]);

  const getCocktailById = useCallback(
    (id: string) => {
      return cocktails.find((c) => c.id === id);
    },
    [cocktails],
  );

  // Load cocktails once on mount
  useEffect(() => {
    loadCocktails();
  }, [loadCocktails]);

  const value = useMemo(
    () => ({
      cocktails,
      loading,
      refreshCocktails,
      getCocktailById,
    }),
    [cocktails, loading, refreshCocktails, getCocktailById],
  );

  return <CocktailCacheContext.Provider value={value}>{children}</CocktailCacheContext.Provider>;
}

export function useCocktailCache() {
  const context = useContext(CocktailCacheContext);
  if (!context) {
    throw new Error("useCocktailCache must be used within CocktailCacheProvider");
  }
  return context;
}

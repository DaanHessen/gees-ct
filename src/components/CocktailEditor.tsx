"use client";

import { useRouter } from "next/navigation";
import { Fragment, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  blankCocktailForm,
  type CocktailFormState,
  type CocktailIngredientRecord,
  type CocktailRecord,
  type IngredientRecord,
  type CocktailType,
  COCKTAIL_TYPE_COLORS,
} from "@/types/cocktail";
import { describeError } from "@/lib/error-utils";
import { Spinner } from "@/components/Spinner";
import { StatusToast, type StatusToastState } from "@/components/StatusToast";

type CocktailWithRelations = CocktailRecord & {
  cocktail_ingredients: CocktailIngredientRecord[];
};

type CocktailEditorProps = {
  mode: "create" | "edit";
  cocktailId?: string;
};

const ingredientDatalistId = "ingredient-suggestions";

export function CocktailEditor({ mode, cocktailId }: CocktailEditorProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [formState, setFormState] = useState<CocktailFormState>(blankCocktailForm);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [allIngredients, setAllIngredients] = useState<IngredientRecord[]>([]);
  const [feedback, setFeedback] = useState<StatusToastState | null>(null);

  const ensureIngredient = useCallback(
    async (name: string) => {
      const cleaned = name.trim();
      if (!cleaned) return null;

      const { data: existing, error } = await supabase
        .from("ingredients")
        .select("id, name")
        .ilike("name", cleaned)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (existing) {
        return existing.id;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("ingredients")
        .insert({ name: cleaned })
        .select()
        .single();

      if (insertError) throw insertError;
      return inserted.id;
    },
    [supabase],
  );

  const loadIngredients = useCallback(async () => {
    const { data } = await supabase.from("ingredients").select("id, name").order("name");
    setAllIngredients(data ?? []);
  }, [supabase]);

  const loadCocktail = useCallback(async () => {
    if (mode !== "edit" || !cocktailId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cocktails")
        .select(
          `
          id,
          name,
          description,
          recipe,
          image_url,
          cocktail_type,
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
        .eq("id", cocktailId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setFeedback({
          type: "error",
          message: "Cocktail niet gevonden.",
        });
        return;
      }

      const record = data as unknown as CocktailWithRelations;
      setFormState({
        name: record.name,
        description: record.description ?? "",
        recipe: record.recipe ?? "",
        imageUrl: record.image_url ?? "",
        cocktailType: (record.cocktail_type as CocktailType) ?? "Other",
        ingredients:
          record.cocktail_ingredients?.map((row) => ({
            id: row.id,
            ingredientName: row.ingredient?.name ?? "",
            detail: row.detail ?? "",
          })) ?? [
            {
              ingredientName: "",
              detail: "",
            },
          ],
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: `Kon cocktail niet laden: ${describeError(error)}`,
      });
    } finally {
      setLoading(false);
    }
  }, [cocktailId, mode, supabase]);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  useEffect(() => {
    loadCocktail();
  }, [loadCocktail]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const updateIngredientRow = (
    index: number,
    patch: Partial<{ ingredientName: string; detail: string }>,
  ) => {
    setFormState((prev) => {
      const nextIngredients = prev.ingredients.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      );
      return { ...prev, ingredients: nextIngredients };
    });
  };

  const addIngredientRow = () => {
    setFormState((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          ingredientName: "",
          detail: "",
        },
      ],
    }));
  };

  const removeIngredientRow = (index: number) => {
    setFormState((prev) => {
      if (prev.ingredients.length === 1) return prev;
      return {
        ...prev,
        ingredients: prev.ingredients.filter((_, rowIndex) => rowIndex !== index),
      };
    });
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      setFeedback({ type: "error", message: "Naam is verplicht." });
      return;
    }

    const ingredientRows = formState.ingredients
      .map((row) => ({
        ingredientName: row.ingredientName.trim(),
        detail: row.detail.trim(),
      }))
      .filter((row) => row.ingredientName.length);

    setSaving(true);

    try {
      const payload = {
        name: formState.name.trim(),
        description: formState.description.trim() || null,
        recipe: formState.recipe.trim() || null,
        image_url: formState.imageUrl.trim() || null,
        cocktail_type: formState.cocktailType,
      };

      let targetId = cocktailId;

      if (mode === "edit" && cocktailId) {
        const { error } = await supabase.from("cocktails").update(payload).eq("id", cocktailId);
        if (error) throw error;
        await supabase.from("cocktail_ingredients").delete().eq("cocktail_id", cocktailId);
      } else {
        const { data, error } = await supabase.from("cocktails").insert(payload).select().single();
        if (error) throw error;
        targetId = data.id;
      }

      if (targetId && ingredientRows.length) {
        const rowsToInsert = [];
        for (const row of ingredientRows) {
          const ingredientId = await ensureIngredient(row.ingredientName);
          if (!ingredientId) continue;
          rowsToInsert.push({
            cocktail_id: targetId,
            ingredient_id: ingredientId,
            detail: row.detail,
          });
        }

        if (rowsToInsert.length) {
          const { error } = await supabase.from("cocktail_ingredients").insert(rowsToInsert);
          if (error) throw error;
        }
      }

      setFeedback({
        type: "success",
        message: mode === "edit" ? "Cocktail bijgewerkt." : "Cocktail opgeslagen.",
      });
      
      // For new cocktails, stay in manage mode. For edits, go back to normal view
      if (mode === "edit") {
        router.push("/");
      } else {
        setFormState(blankCocktailForm);
        router.push("/?manage=true");
      }
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: `Opslaan mislukt: ${describeError(error)}`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6 text-white">
        <header className="flex items-center justify-between pr-10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              {mode === "edit" ? "Cocktail bewerken" : "Nieuwe cocktail"}
            </p>
            <h1 className="text-2xl font-semibold">
              {formState.name || (mode === "edit" ? "Bewerken" : "Nieuw recept")}
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <form className="space-y-5" onSubmit={submitForm}>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Naam *</span>
              <input
                type="text"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Bijvoorbeeld Espresso Martini"
                className="mt-2 w-full rounded-md border border-white/10 bg-[#202226] px-4 py-3 text-base text-white placeholder:text-white/50 transition-all duration-200 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Type cocktail *</span>
                <div className="relative mt-2">
                  <select
                    value={formState.cocktailType}
                    onChange={(event) => setFormState((prev) => ({ ...prev, cocktailType: event.target.value as CocktailType }))}
                    className="w-full appearance-none rounded-md border border-white/10 bg-[#202226] px-4 py-3 pr-10 text-base text-white transition-all duration-200 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    required
                  >
                    <option value="Spritz">Spritz</option>
                    <option value="Martini">Martini</option>
                    <option value="Sour">Sour</option>
                    <option value="Margarita">Margarita</option>
                    <option value="Negroni">Negroni</option>
                    <option value="Old Fashioned">Old Fashioned</option>
                    <option value="Mojito">Mojito</option>
                    <option value="Mule">Mule</option>
                    <option value="Collins">Collins</option>
                    <option value="Daiquiri">Daiquiri</option>
                    <option value="Manhattan">Manhattan</option>
                    <option value="Fizz">Fizz</option>
                    <option value="Punch">Punch</option>
                    <option value="Highball">Highball</option>
                    <option value="Shot">Shot</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div 
                    className="mt-2 h-3 w-full rounded-full"
                    style={{ backgroundColor: COCKTAIL_TYPE_COLORS[formState.cocktailType] }}
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Afbeelding URL</span>
                <input
                  type="url"
                  value={formState.imageUrl}
                  onChange={(event) => setFormState((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-md border border-white/10 bg-[#202226] px-4 py-3 text-base text-white placeholder:text-white/50 transition-all duration-200 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Beschrijving</span>
              <textarea
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Korte toelichting over smaak of service."
                className="mt-2 min-h-20 w-full rounded-md border border-white/10 bg-[#202226] px-4 py-3 text-base text-white placeholder:text-white/50 transition-all duration-200 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 resize-none"
              />
            </label>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Ingrediënten</span>
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/15 active:scale-95"
                >
                  + Ingrediënt
                </button>
              </div>
              <div className="space-y-2">
                {formState.ingredients.map((row, index) => (
                  <div key={`ingredient-${index}`} className="flex gap-2 animate-slideUp">
                    <input
                      type="text"
                      list={ingredientDatalistId}
                      value={row.ingredientName}
                      onChange={(event) =>
                        updateIngredientRow(index, { ingredientName: event.target.value })
                      }
                      placeholder="Ingrediënt"
                      className="flex-2 rounded-md border border-white/10 bg-[#202226] px-4 py-3 text-base text-white placeholder:text-white/50 transition-all duration-200 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    />
                    <input
                      type="text"
                      value={row.detail}
                      onChange={(event) => updateIngredientRow(index, { detail: event.target.value })}
                      placeholder="45 ml"
                      className="flex-1 rounded-md border border-white/10 bg-[#202226] px-4 py-3 text-base text-white placeholder:text-white/50 transition-all duration-200 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(index)}
                      className="flex h-12 w-12 items-center justify-center rounded-md border border-white/20 text-lg transition-all duration-200 hover:bg-red-500/20 hover:border-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                      disabled={formState.ingredients.length === 1}
                      aria-label="Verwijder ingrediënt"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Bereiding</span>
              <textarea
                value={formState.recipe}
                onChange={(event) => setFormState((prev) => ({ ...prev, recipe: event.target.value }))}
                placeholder="1. Koel glas...
2. Shake 10 sec..."
                className="mt-2 min-h-40 w-full rounded-md border border-white/10 bg-[#202226] px-4 py-3 text-base text-white placeholder:text-white/50 transition-all duration-200 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 resize-none"
              />
            </label>

            <div className="flex flex-col gap-3 pt-4 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md border border-white/30 px-5 py-2 text-sm transition-all duration-200 hover:bg-white/10"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c62828] px-6 py-2 text-sm font-semibold transition-all duration-200 hover:bg-[#d32f2f] hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {saving ? (
                  <>
                    <Spinner className="border-white" size={18} />
                    Opslaan
                  </>
                ) : mode === "edit" ? (
                  "Wijzigingen opslaan"
                ) : (
                  "Cocktail opslaan"
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <datalist id={ingredientDatalistId}>
        {allIngredients.map((ingredient) => (
          <option key={ingredient.id} value={ingredient.name} />
        ))}
      </datalist>

      {feedback ? <StatusToast status={feedback} /> : null}
    </>
  );
}

"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { type CocktailIngredientRecord, type CocktailRecord, COCKTAIL_TYPE_COLORS } from "@/types/cocktail";
import { describeError } from "@/lib/error-utils";
import { StatusToast, type StatusToastState } from "@/components/StatusToast";
import { Spinner } from "@/components/Spinner";

type CocktailWithRelations = CocktailRecord & {
  cocktail_ingredients: CocktailIngredientRecord[];
};

export function CocktailBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [cocktails, setCocktails] = useState<CocktailWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [manageMode, setManageMode] = useState(false);
  const [feedback, setFeedback] = useState<StatusToastState | null>(null);
  
  // Sync manageMode with URL parameter
  useEffect(() => {
    setManageMode(searchParams.get("manage") === "true");
  }, [searchParams]);

  const filteredCocktails = useMemo(() => {
    if (!search.trim()) return cocktails;
    const term = search.trim().toLowerCase();
    return cocktails.filter((cocktail) => {
      const ingredientMatch = cocktail.cocktail_ingredients?.some((ci) =>
        ci.ingredient?.name?.toLowerCase().includes(term),
      );
      return (
        cocktail.name.toLowerCase().includes(term) ||
        (cocktail.description?.toLowerCase().includes(term) ?? false) ||
        ingredientMatch
      );
    });
  }, [cocktails, search]);

  const loadData = useCallback(
    async (withLoader = true) => {
      try {
        if (withLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

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

        setCocktails(
          (cocktailsData ?? []).map((record) => ({
            ...record,
            cocktail_ingredients:
              record.cocktail_ingredients?.map((ci) => ({
                ...ci,
                ingredient: Array.isArray(ci.ingredient) ? ci.ingredient[0] : ci.ingredient,
              })) ?? [],
          })) as CocktailWithRelations[],
        );
      } catch (error) {
        console.error(error);
        setFeedback({
          type: "error",
          message: `Supabase gaf een foutmelding: ${describeError(error)}`,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleDelete = async (cocktailId: string) => {
    const confirmation = window.confirm(
      "Cocktail verwijderen?",
    );
    if (!confirmation) return;

    try {
      await supabase.from("cocktail_ingredients").delete().eq("cocktail_id", cocktailId);
      await supabase.from("cocktails").delete().eq("id", cocktailId);
      await loadData(false);
      setFeedback({ type: "success", message: "Cocktail verwijderd." });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: `Verwijderen mislukt: ${describeError(error)}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1b1c1f] text-slate-200">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#202226] px-8 py-6 animate-scaleIn shadow-2xl">
          <Spinner />
          <p className="text-base font-semibold">Gegevens ophalen…</p>
          <p className="text-xs text-white/60">
            Als dit langer duurt dan 1 minuut, app me ff.
          </p>
        </div>
      </div>
    );
  }

  const showEmptyState = !filteredCocktails.length;

  return (
    <div className="min-h-screen bg-[#1b1c1f] pb-24 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fadeIn">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">GEES</p>
            <h1 className="text-3xl font-semibold">Cocktails</h1>
            <p className="text-sm text-white/70">
              {cocktails.length} {cocktails.length === 1 ? 'recept' : 'recepten'} beschikbaar
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                const newMode = !manageMode;
                if (newMode) {
                  router.push("/?manage=true");
                } else {
                  router.push("/");
                }
              }}
              className={clsx(
                "rounded-md border px-4 py-2 text-sm font-semibold transition-all duration-200",
                manageMode
                  ? "border-white bg-white text-[#1b1c1f] hover:bg-gray-100"
                  : "border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/5",
              )}
            >
              {manageMode ? "Stop bewerken" : "Bewerken"}
            </button>
            {manageMode ? (
              <button
                type="button"
                onClick={() => router.push("/cocktails/nieuw")}
                className="rounded-md bg-[#c62828] px-4 py-2 text-sm font-semibold transition-all duration-200 hover:bg-[#d32f2f] hover:scale-105 animate-slideUp"
              >
                Nieuwe cocktail
              </button>
            ) : null}
          </div>
        </header>

        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#202226] p-4 md:flex-row md:items-center">
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">
              Zoeken
            </span>
            <input
              type="text"
              placeholder="Zoek cocktail"
              className="rounded-md border border-white/10 bg-[#1b1c1f] px-3 py-2 text-sm text-white placeholder:text-white/50 transition-all duration-200 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
            {refreshing && (
              <div className="animate-spin">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            <span>{filteredCocktails.length} {search ? 'gevonden' : 'totaal'}</span>
          </div>
        </div>

        <section className="rounded-xl border border-white/10 bg-[#1f2024] p-4">
          {showEmptyState ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-white/70 animate-fadeIn">
              <div className="rounded-full bg-white/5 p-6 mb-2">
                <svg className="w-12 h-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-xl font-semibold">Nog geen cocktails</p>
              <p className="text-sm max-w-md">
                Gebruik de knop &quot;Bewerken&quot; om nieuwe recepten toe te voegen.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredCocktails.map((cocktail, index) => (
                <div key={cocktail.id} style={{ animationDelay: `${index * 30}ms` }}>
                  <CocktailCard
                    cocktail={cocktail}
                    manageMode={manageMode}
                    onSelect={() => router.push(`/cocktails/${cocktail.id}`)}
                    onEdit={() => router.push(`/cocktails/${cocktail.id}/bewerk`)}
                    onDelete={() => handleDelete(cocktail.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {feedback ? <StatusToast status={feedback} /> : null}
    </div>
  );
}

type CocktailCardProps = {
  cocktail: CocktailWithRelations;
  manageMode: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const CocktailCard = ({ cocktail, manageMode, onSelect, onEdit, onDelete }: CocktailCardProps) => {
  const cardColor = cocktail.cocktail_type 
    ? COCKTAIL_TYPE_COLORS[cocktail.cocktail_type]
    : COCKTAIL_TYPE_COLORS["Other"];

  return (
    <div
      className="group relative flex h-32 flex-col justify-between rounded-md border border-black/20 px-3 py-3 text-white shadow-[0_6px_12px_rgba(0,0,0,.35)] transition-all duration-200 hover:scale-105 hover:shadow-[0_12px_24px_rgba(0,0,0,.45)] hover:border-white/40 cursor-pointer animate-slideUp"
      style={{ backgroundColor: cardColor }}
      onClick={onSelect}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
        {cocktail.cocktail_ingredients?.length ?? 0} ingrediënten
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{cocktail.name}</p>
        {cocktail.description ? (
          <p className="text-xs text-white/85 line-clamp-1">{cocktail.description}</p>
        ) : null}
      </div>
      {manageMode ? (
        <div className="absolute right-3 top-3 flex gap-2 text-xs font-semibold">
          <button
            type="button"
            className="rounded-sm bg-white/80 px-2 py-1 text-[#1b1c1f] hover:bg-white transition"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            Bewerk
          </button>
          <button
            type="button"
            className="rounded-sm bg-[#b3261e] px-2 py-1 hover:bg-[#d32f2f] transition"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            Verwijder
          </button>
        </div>
      ) : null}
    </div>
  );
};


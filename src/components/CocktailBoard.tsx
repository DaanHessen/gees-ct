"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { COCKTAIL_TYPE_COLORS } from "@/types/cocktail";
import { describeError } from "@/lib/error-utils";
import { StatusToast, type StatusToastState } from "@/components/StatusToast";
import { Spinner } from "@/components/Spinner";
import { useCocktailCache, type CocktailWithRelations } from "@/lib/cocktail-cache";
import { CocktailModal } from "@/components/CocktailModal";
import { CocktailEditor } from "@/components/CocktailEditor";

export function CocktailBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { cocktails, loading, refreshCocktails } = useCocktailCache();
  const [search, setSearch] = useState("");
  const [manageMode, setManageMode] = useState(false);
  const [feedback, setFeedback] = useState<StatusToastState | null>(null);
  const [viewingCocktail, setViewingCocktail] = useState<string | null>(null);
  const [editingCocktail, setEditingCocktail] = useState<string | null>(null);
  const [creatingCocktail, setCreatingCocktail] = useState(false);
  
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
      await refreshCocktails();
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
                "rounded-md border px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95",
                manageMode
                  ? "border-white bg-white text-[#1b1c1f] hover:bg-gray-100 hover:scale-105"
                  : "border-white/30 bg-transparent text-white hover:border-white/50 hover:bg-white/10",
              )}
            >
              {manageMode ? "Stop bewerken" : "Bewerken"}
            </button>
            {manageMode ? (
              <button
                type="button"
                onClick={() => setCreatingCocktail(true)}
                className="rounded-md bg-[#c62828] px-4 py-2 text-sm font-semibold transition-all duration-200 hover:bg-[#d32f2f] hover:scale-105 animate-slideUp"
              >
                Nieuwe cocktail
              </button>
            ) : null}
          </div>
        </header>

        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#202226] p-4 md:flex-row md:items-end md:gap-4">
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
          <div className="flex items-center justify-center px-3 py-2 text-xs uppercase tracking-wide text-white/50 md:pb-[7px]">
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
                    onSelect={() => setViewingCocktail(cocktail.id)}
                    onEdit={() => setEditingCocktail(cocktail.id)}
                    onDelete={() => handleDelete(cocktail.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {feedback ? <StatusToast status={feedback} /> : null}
      
      {/* View Cocktail Modal */}
      {viewingCocktail && <ViewCocktailModal cocktailId={viewingCocktail} onClose={() => setViewingCocktail(null)} />}
      
      {/* Edit Cocktail Modal */}
      {editingCocktail && (
        <CocktailModal maxWidth="2xl" onClose={() => setEditingCocktail(null)}>
          <CocktailEditor mode="edit" cocktailId={editingCocktail} onSuccess={() => setEditingCocktail(null)} />
        </CocktailModal>
      )}
      
      {/* Create Cocktail Modal */}
      {creatingCocktail && (
        <CocktailModal maxWidth="2xl" onClose={() => setCreatingCocktail(false)}>
          <CocktailEditor mode="create" onSuccess={() => setCreatingCocktail(false)} />
        </CocktailModal>
      )}
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
      className="group relative flex h-32 flex-col justify-between rounded-lg border border-black/20 px-3 py-3 text-white shadow-[0_4px_12px_rgba(0,0,0,.25)] transition-all duration-200 hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,.35)] hover:border-white/30 cursor-pointer animate-slideUp"
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
            className="rounded bg-white/90 px-2 py-1 text-[#1b1c1f] hover:bg-white transition-all duration-150 active:scale-95 shadow-md"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            Bewerk
          </button>
          <button
            type="button"
            className="rounded bg-[#c62828] px-2 py-1 hover:bg-[#d32f2f] transition-all duration-150 active:scale-95 shadow-md"
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

type ViewCocktailModalProps = {
  cocktailId: string;
  onClose: () => void;
};

function ViewCocktailModal({ cocktailId, onClose }: ViewCocktailModalProps) {
  const { getCocktailById } = useCocktailCache();
  const cocktail = getCocktailById(cocktailId);

  if (!cocktail) {
    return (
      <CocktailModal maxWidth="md" onClose={onClose}>
        <div className="text-center py-10 animate-fadeIn">
          <h1 className="text-2xl font-semibold mb-2">Cocktail niet gevonden</h1>
          <p className="text-white/60 mb-6">Deze cocktail bestaat niet of is verwijderd.</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/30 px-4 py-2 text-sm transition-all duration-200 hover:bg-white/10"
          >
            Sluiten
          </button>
        </div>
      </CocktailModal>
    );
  }

  return (
    <CocktailModal maxWidth="4xl" onClose={onClose} showCloseButton={false}>
      <div className="mb-6 animate-slideUp">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold pr-4">{cocktail.name}</h2>
            {cocktail.cocktail_type ? (
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COCKTAIL_TYPE_COLORS[cocktail.cocktail_type] }}
                />
                <span className="text-sm text-white/60">{cocktail.cocktail_type}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
            aria-label="Sluiten"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 animate-slideUp">
        <div className="space-y-4">
          <div className="relative h-60 sm:h-72 w-full overflow-hidden rounded-md border border-white/10 bg-black/20 transition-all duration-300 hover:border-white/20">
            {cocktail.image_url ? (
              <Image
                src={cocktail.image_url}
                alt={cocktail.name}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
                unoptimized
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-white/50"
                style={{ 
                  backgroundColor: cocktail.cocktail_type 
                    ? COCKTAIL_TYPE_COLORS[cocktail.cocktail_type] 
                    : COCKTAIL_TYPE_COLORS["Other"]
                }}
              >
                Geen afbeelding
              </div>
            )}
          </div>
          {cocktail.description ? (
            <div>
              <h3 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">Beschrijving</h3>
              <p className="text-sm text-white/80 leading-relaxed">{cocktail.description}</p>
            </div>
          ) : null}
        </div>
        
        <div className="space-y-4">
          {cocktail.cocktail_ingredients.length ? (
            <div>
              <h3 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Ingrediënten</h3>
              <ul className="space-y-2 text-sm">
                {cocktail.cocktail_ingredients.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between rounded-md border border-white/10 bg-[#202226] px-4 py-3 transition-all duration-200 hover:bg-[#252830] hover:border-white/20"
                  >
                    <span className="font-semibold">{row.ingredient?.name}</span>
                    {row.detail ? <span className="text-white/70">{row.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          
          {cocktail.recipe ? (
            <div>
              <h3 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Bereiding</h3>
              <div className="whitespace-pre-line rounded-md border border-white/10 bg-[#202226] p-4 text-sm leading-relaxed text-white/80 transition-all duration-200 hover:bg-[#252830] hover:border-white/20">
                {cocktail.recipe}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </CocktailModal>
  );
}


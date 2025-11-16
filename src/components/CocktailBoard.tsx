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
import { useLanguage } from "@/lib/language-context";
import { useTeam } from "@/lib/team-context";

export function CocktailBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { cocktails, loading, refreshCocktails } = useCocktailCache();
  const { t } = useLanguage();
  const { currentRole } = useTeam();
  const isAdmin = currentRole === "admin";
  const [search, setSearch] = useState("");
  const [manageMode, setManageMode] = useState(false);
  const [feedback, setFeedback] = useState<StatusToastState | null>(null);
  const [viewingCocktail, setViewingCocktail] = useState<string | null>(null);
  const [editingCocktail, setEditingCocktail] = useState<string | null>(null);
  const [creatingCocktail, setCreatingCocktail] = useState(false);
  
  // Sync manageMode with URL parameter
  useEffect(() => {
    if (!isAdmin) {
      setManageMode(false);
      return;
    }
    setManageMode(searchParams.get("manage") === "true");
  }, [searchParams, isAdmin]);

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
    if (!isAdmin) {
      setFeedback({ type: "error", message: t("settings.teamRestricted") });
      return;
    }
    const confirmation = window.confirm("Cocktail verwijderen?");
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fadeIn">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("board.subtitle")}</h1>
            <p className="text-sm text-white/50 mt-1">
              {cocktails.length} {cocktails.length === 1 ? t("board.recipe") : t("board.recipes")}
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin ? (
              <>
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
                    "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95",
                    manageMode
                      ? "border-white bg-white text-[#1b1c1f] hover:bg-gray-100 shadow-sm"
                      : "border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/5",
                  )}
                >
                  {manageMode ? t("board.stopEditButton") : t("board.editButton")}
                </button>
                {manageMode ? (
                  <button
                    type="button"
                    onClick={() => setCreatingCocktail(true)}
                    className="rounded-lg bg-[#c62828] px-4 py-2.5 text-sm font-semibold transition-all duration-150 hover:bg-[#d32f2f] active:scale-95 shadow-sm animate-slideUp"
                  >
                    {t("board.addButton")}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </header>

        <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-[#202226] p-4 md:flex-row md:items-end md:gap-4">
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
              {t("board.searchLabel")}
            </span>
            <input
              type="text"
              placeholder={t("board.searchPlaceholder")}
              className="rounded-lg border border-white/10 bg-[#1b1c1f] px-4 py-2.5 text-sm text-white placeholder:text-white/50 transition-all duration-150 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="flex items-center justify-center px-3 py-2 text-xs font-semibold text-white/50 md:pb-[9px]">
            <span>{filteredCocktails.length} {search ? 'gevonden' : 'totaal'}</span>
          </div>
        </div>

        <section className="rounded-xl border border-white/5 bg-[#1f2024] p-5">
          {showEmptyState ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-white/70 animate-fadeIn">
              <div className="rounded-full bg-white/5 p-6 mb-2">
                <svg className="w-12 h-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-xl font-semibold">{t("board.emptyStateTitle")}</p>
              <p className="text-sm max-w-md">
                {t("board.emptyStateDescription")}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCocktails.map((cocktail, index) => (
                <div key={cocktail.id} style={{ animationDelay: `${index * 25}ms` }}>
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
      className="group relative flex h-40 flex-col justify-between rounded-lg border border-black/30 px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,.25)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,.35)] hover:border-black/50 cursor-pointer animate-slideUp"
      style={{ backgroundColor: cardColor }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {cocktail.cocktail_type && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-black/60">
              {cocktail.cocktail_type}
            </div>
          )}
          <div className="text-[10px] font-semibold text-black/50">
            {cocktail.cocktail_ingredients?.length ?? 0} ingrediënten
          </div>
        </div>
        {manageMode && (
          <div className="flex gap-1.5 text-xs font-semibold">
            <button
              type="button"
              className="rounded-md bg-black/80 px-2 py-1 text-white hover:bg-black transition-all duration-150 active:scale-95 shadow-md"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-md bg-[#c62828] px-2 py-1 text-white hover:bg-[#d32f2f] transition-all duration-150 active:scale-95 shadow-md"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-1">
        <p className="text-xl font-bold leading-tight text-black/90">{cocktail.name}</p>
        {cocktail.description && (
          <p className="text-xs font-medium text-black/70 line-clamp-2 leading-relaxed">{cocktail.description}</p>
        )}
      </div>
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

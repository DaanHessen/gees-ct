"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusToast, type StatusToastState } from "@/components/StatusToast";
import { Spinner } from "@/components/Spinner";
import { CocktailModal } from "@/components/CocktailModal";
import { useCocktailCache } from "@/lib/cocktail-cache";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { ensureIngredientRecord } from "@/lib/ingredient-service";
import { describeError } from "@/lib/error-utils";
import {
  detectBaseSpirits,
  pseudoRandomFromString,
  type BaseSpirit,
} from "@/lib/explore-helpers";
import type { ExploreCocktail, ExplorePayload } from "@/types/explore";
import type { CocktailType } from "@/types/cocktail";
import { COCKTAIL_TYPE_COLORS } from "@/types/cocktail";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";
import { useMeasurement } from "@/lib/measurement-context";
import { useTeam } from "@/lib/team-context";
import { useExploreFilters } from "@/lib/explore-filters-context";
import type { FocusMode, SortMode } from "@/lib/explore-filters-context";

const CACHE_KEY = "ctbase.explore.catalog";
const CACHE_VERSION = 2; // Increment this when type detection logic changes
const CACHE_TTL_MS = 1000 * 60 * 60 * 4;

type CachedPayload = ExplorePayload & { storedAt: number; version?: number };

type UserProfile = {
  topIngredients: Set<string>;
  topTypes: Set<CocktailType>;
  favoriteSpirits: Set<BaseSpirit>;
  ownedNames: Set<string>;
};

type SortableCocktail = {
  cocktail: ExploreCocktail;
  relevance: number;
  sortValue: number;
};

export default function ExplorePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { cocktails: userCocktails, refreshCocktails } = useCocktailCache();
  const { t, language } = useLanguage();
  const { formatMeasurement } = useMeasurement();
  const { currentRole } = useTeam();
  const canAddCocktails = currentRole === "admin";
  
  const {
    search,
    setSearch,
    alcoholFilter,
    selectedSpirits,
    selectedCategories,
    selectedGlasses,
    selectedFlavors,
    focusMode,
    sortMode,
    ingredientRange,
    setDerivedFilters,
  } = useExploreFilters();
  
  const debouncedSearch = useDebouncedValue(search, 300);

  const [catalog, setCatalog] = useState<ExploreCocktail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCocktail, setSelectedCocktail] = useState<ExploreCocktail | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<StatusToastState | null>(null);

  const loadFromCache = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedPayload;
      if (!parsed || !parsed.storedAt) return null;
      // Invalidate cache if version doesn't match
      if (parsed.version !== CACHE_VERSION) return null;
      if (Date.now() - parsed.storedAt > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const persistCache = (payload: ExplorePayload) => {
    if (typeof window === "undefined") return;
    const data: CachedPayload = {
      ...payload,
      storedAt: Date.now(),
      version: CACHE_VERSION,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  };

  const hydrate = useCallback(
    async (options?: { bypassCache?: boolean }) => {
      setErrorMessage(null);
      const shouldUseCache = !options?.bypassCache;

      if (shouldUseCache) {
        const cached = loadFromCache();
        if (cached) {
          setCatalog(cached.cocktails);
          setLoading(false);
          return;
        }
      }

      if (options?.bypassCache) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch("/api/explore");
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Explore API error:", response.status, errorText);
          throw new Error(`Failed to fetch cocktails: ${response.status}`);
        }
        const payload = (await response.json()) as ExplorePayload;
        console.log("Fetched cocktails:", payload.cocktails.length);
        setCatalog(payload.cocktails);
        persistCache(payload);
      } catch (error) {
        console.error("Explore fetch error:", error);
        setErrorMessage(describeError(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadFromCache],
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const userProfile = useMemo<UserProfile>(() => {
    const ingredientCounts = new Map<string, number>();
    const typeCounts = new Map<CocktailType, number>();
    const baseSpiritCounts = new Map<BaseSpirit, number>();
    const ownedNames = new Set<string>();

    userCocktails.forEach((cocktail) => {
      ownedNames.add(cocktail.name.toLowerCase());
      const ingredientNames =
        cocktail.cocktail_ingredients?.map((row) => row.ingredient?.name ?? "").filter(Boolean) ?? [];

      ingredientNames.forEach((name) => {
        const lowered = name.toLowerCase();
        ingredientCounts.set(lowered, (ingredientCounts.get(lowered) ?? 0) + 1);
      });

      const spirits = detectBaseSpirits(ingredientNames as string[]);
      spirits.forEach((spirit) => {
        baseSpiritCounts.set(spirit, (baseSpiritCounts.get(spirit) ?? 0) + 1);
      });

      if (cocktail.cocktail_type) {
        typeCounts.set(
          cocktail.cocktail_type,
          (typeCounts.get(cocktail.cocktail_type) ?? 0) + 1,
        );
      }
    });

    const topIngredients = new Set(
      Array.from(ingredientCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name]) => name),
    );

    const topTypes = new Set(
      Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([type]) => type),
    );

    const favoriteSpirits = new Set(
      Array.from(baseSpiritCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([spirit]) => spirit),
    );

    return {
      topIngredients,
      topTypes,
      favoriteSpirits,
      ownedNames,
    };
  }, [userCocktails]);

  const derivedFilters = useMemo(() => {
    const categories = new Set<string>();
    const glasses = new Set<string>();
    const flavors = new Set<string>();

    catalog.forEach((cocktail) => {
      if (cocktail.category) {
        categories.add(cocktail.category);
      }
      if (cocktail.glass) {
        glasses.add(cocktail.glass);
      }
      cocktail.flavorProfile.forEach((profile) => flavors.add(profile));
    });

    return {
      categories: Array.from(categories).sort(),
      glasses: Array.from(glasses).sort(),
      flavors: Array.from(flavors).sort(),
    };
  }, [catalog]);

  // Update context with derived filters
  useEffect(() => {
    setDerivedFilters(derivedFilters);
  }, [derivedFilters, setDerivedFilters]);

  const filteredCocktails = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();
    const [minIngredients, maxIngredients] = ingredientRange;

    const sortable: SortableCocktail[] = catalog
      .filter((cocktail) => {
        const alcoholDescriptor = (cocktail.alcoholic ?? "").toLowerCase();
        if (alcoholFilter === "alcoholic" && alcoholDescriptor !== "alcoholic") return false;
        if (alcoholFilter === "nonAlcoholic" && !alcoholDescriptor.includes("non")) return false;
        if (alcoholFilter === "optional" && !alcoholDescriptor.includes("optional")) return false;

        const ingredientCount = cocktail.ingredients.length;
        if (ingredientCount < minIngredients || ingredientCount > maxIngredients) return false;

        if (selectedSpirits.size > 0) {
          const hasMatch = cocktail.baseSpirits.some((spirit) => selectedSpirits.has(spirit));
          if (!hasMatch) return false;
        }

        if (selectedCategories.size > 0 && (!cocktail.category || !selectedCategories.has(cocktail.category))) {
          return false;
        }

        if (selectedGlasses.size > 0 && (!cocktail.glass || !selectedGlasses.has(cocktail.glass))) {
          return false;
        }

        if (
          selectedFlavors.size > 0 &&
          !cocktail.flavorProfile.some((profile) => selectedFlavors.has(profile))
        ) {
          return false;
        }

        if (normalizedSearch && !matchesSearch(cocktail, normalizedSearch)) {
          return false;
        }

        return true;
      })
      .map((cocktail) => {
        const relevance = computeRelevanceScore(cocktail, userProfile, focusMode, normalizedSearch);
        return {
          cocktail,
          relevance,
          sortValue: computeSortValue(cocktail, sortMode, relevance),
        };
      });

    return sortable
      .sort((a, b) => b.sortValue - a.sortValue)
      .map((entry) => entry.cocktail);
  }, [
    catalog,
    debouncedSearch,
    alcoholFilter,
    selectedSpirits,
    selectedCategories,
    selectedGlasses,
    selectedFlavors,
    userProfile,
    focusMode,
    sortMode,
    ingredientRange,
  ]);

  const handleAdd = async (cocktail: ExploreCocktail) => {
    if (!canAddCocktails) {
      setFeedback({ type: "error", message: t("explore.adminOnly") });
      return;
    }
    if (userProfile.ownedNames.has(cocktail.name.toLowerCase())) {
      setFeedback({ type: "error", message: t("explore.toast.duplicate") });
      return;
    }

    setAddingId(cocktail.id);
    try {
      const payload = {
        name: cocktail.name,
        description: cocktail.description || null,
        recipe: cocktail.instructions,
        image_url: cocktail.image,
        cocktail_type: cocktail.suggestedType,
      };

      const { data: inserted, error } = await supabase
        .from("cocktails")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      const ingredientRows = [];
      for (const ingredient of cocktail.ingredients) {
        const ingredientId = await ensureIngredientRecord(supabase, ingredient.name);
        if (!ingredientId) continue;
        ingredientRows.push({
          cocktail_id: inserted.id,
          ingredient_id: ingredientId,
          detail: ingredient.measure,
        });
      }

      if (ingredientRows.length) {
        const { error: rowsError } = await supabase
          .from("cocktail_ingredients")
          .insert(ingredientRows);
        if (rowsError) throw rowsError;
      }

      await refreshCocktails();
      setFeedback({ type: "success", message: t("explore.toast.success") });
    } catch (error) {
      setFeedback({
        type: "error",
        message: t("explore.toast.error").replace("{message}", describeError(error)),
      });
    } finally {
      setAddingId(null);
    }
  };

  const matchesLabel = t("explore.matches").replace(
    "{count}",
    filteredCocktails.length.toString(),
  );

  if (loading) {
    const loadingLabel = language === "nl" ? "Aanraders laden…" : "Loading recommendations…";
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1b1c1f]">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#202226] px-8 py-6 shadow-2xl">
          <Spinner />
          <p className="text-base font-semibold">{loadingLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1b1c1f] pb-20 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-8">
        <header className="flex items-center justify-between animate-fadeIn">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("explore.title")}</h1>
            <p className="text-sm text-white/50 mt-1">{matchesLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => hydrate({ bypassCache: true })}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-all duration-150 hover:border-white/30 hover:bg-white/10 active:scale-95"
            disabled={refreshing}
          >
            {refreshing ? "…" : t("explore.refreshButton")}
          </button>
        </header>

        <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-[#202226] p-4 md:flex-row md:items-end md:gap-4">
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
              {t("board.searchLabel")}
            </span>
            <input
              type="text"
              placeholder={t("explore.searchPlaceholder")}
              className="rounded-lg border border-white/10 bg-[#1b1c1f] px-4 py-2.5 text-sm text-white placeholder:text-white/50 transition-all duration-150 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="flex items-center justify-center px-3 py-2 text-xs font-semibold text-white/50 md:pb-[9px]">
            <span>{filteredCocktails.length} {search ? 'found' : 'total'}</span>
          </div>
        </div>

        <section className="rounded-xl border border-white/5 bg-[#1f2024] p-5">
          {errorMessage ? (
            <p className="rounded-lg border border-[#c62828]/40 bg-[#c62828]/10 px-4 py-3 text-sm text-[#ffbaba]">
              {errorMessage}
            </p>
          ) : null}
          {filteredCocktails.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-white/70">
              <p className="text-xl font-semibold">{t("explore.emptyTitle")}</p>
              <p className="text-sm max-w-md">{t("explore.emptySubtitle")}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCocktails.map((cocktail, index) => (
                <div key={cocktail.id} style={{ animationDelay: `${index * 25}ms` }}>
                  <ExploreCard
                    cocktail={cocktail}
                    alreadyAdded={userProfile.ownedNames.has(cocktail.name.toLowerCase())}
                    onSelect={() => setSelectedCocktail(cocktail)}
                    onAdd={() => handleAdd(cocktail)}
                    isAdding={addingId === cocktail.id}
                    canAdd={canAddCocktails}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedCocktail ? (
        <CocktailModal maxWidth="4xl" onClose={() => setSelectedCocktail(null)}>
          <ExploreModalContent
            cocktail={selectedCocktail}
            t={t}
            alreadyAdded={userProfile.ownedNames.has(selectedCocktail.name.toLowerCase())}
            isAdding={addingId === selectedCocktail.id}
            onAdd={() => handleAdd(selectedCocktail)}
            formatMeasurement={formatMeasurement}
            canAdd={canAddCocktails}
          />
        </CocktailModal>
      ) : null}

      {feedback ? <StatusToast status={feedback} /> : null}
    </div>
  );
}

type ExploreCardProps = {
  cocktail: ExploreCocktail;
  onSelect: () => void;
  onAdd: () => void;
  alreadyAdded: boolean;
  isAdding: boolean;
  canAdd: boolean;
};

function ExploreCard({
  cocktail,
  onSelect,
  onAdd,
  alreadyAdded,
  isAdding,
  canAdd,
}: ExploreCardProps) {
  const background = COCKTAIL_TYPE_COLORS[cocktail.suggestedType] ?? COCKTAIL_TYPE_COLORS.Other;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect();
      }}
      className="group relative flex h-40 flex-col justify-between rounded-lg border border-black/30 px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,.25)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,.35)] hover:border-black/50 cursor-pointer animate-slideUp"
      style={{ backgroundColor: background }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60">
            {cocktail.suggestedType}
          </div>
          {cocktail.glass && (
            <div className="text-[10px] text-black/50">
              {cocktail.glass}
            </div>
          )}
        </div>
        {alreadyAdded && (
          <span className="rounded-md bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black/80">
            ✓
          </span>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-1">
        <p className="text-xl font-bold leading-tight text-black/90">{cocktail.name}</p>
        <p className="text-xs font-medium text-black/70">{cocktail.baseSpirits.join(" · ") || "Mixed"}</p>
        {cocktail.flavorProfile.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {cocktail.flavorProfile.slice(0, 3).map((flavor) => (
              <span key={flavor} className="rounded-md bg-black/15 px-2 py-0.5 text-[9px] font-semibold text-black/70">
                {flavor}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="text-[10px] font-semibold text-black/50">
        {cocktail.ingredients.length} ingredients
      </div>

      {canAdd && !alreadyAdded && (
        <button
          type="button"
          disabled={isAdding}
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
          className="absolute right-3 top-3 rounded-md bg-black/80 px-3 py-1.5 text-sm font-bold text-white hover:bg-black transition-all duration-150 active:scale-95 shadow-md disabled:opacity-50"
        >
          {isAdding ? "..." : "+"}
        </button>
      )}
    </article>
  );
}

type ExploreModalContentProps = {
  cocktail: ExploreCocktail;
  t: (key: TranslationKey) => string;
  alreadyAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
  formatMeasurement: (value: string) => string;
  canAdd: boolean;
};

function ExploreModalContent({
  cocktail,
  t,
  alreadyAdded,
  isAdding,
  onAdd,
  formatMeasurement,
  canAdd,
}: ExploreModalContentProps) {
  const background = COCKTAIL_TYPE_COLORS[cocktail.suggestedType] ?? COCKTAIL_TYPE_COLORS.Other;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-bold">{cocktail.name}</h2>
            <span 
              className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm"
              style={{ backgroundColor: background, color: 'rgba(0,0,0,0.7)' }}
            >
              {cocktail.suggestedType}
            </span>
          </div>
          <p className="text-sm text-white/60">{cocktail.baseSpirits.join(" · ") || "Mixed"}</p>
        </div>
        <div className="flex items-center gap-2">
          {alreadyAdded && (
            <span className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-bold uppercase shadow-sm">
              ✓ Added
            </span>
          )}
          {canAdd && !alreadyAdded && (
            <button
              type="button"
              onClick={onAdd}
              disabled={isAdding}
              className="rounded-lg bg-[#c62828] px-5 py-2 text-sm font-bold text-white hover:bg-[#d32f2f] disabled:opacity-50 transition-all active:scale-95 shadow-sm"
            >
              {isAdding ? "..." : "+ Add"}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="relative h-64 w-full overflow-hidden rounded-lg shadow-md" style={{ backgroundColor: background }}>
          {cocktail.image && (
            <Image
              src={cocktail.image}
              alt={cocktail.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-[#202226] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
              {t("explore.modal.ingredients")}
            </h3>
            <ul className="space-y-2 text-sm">
              {cocktail.ingredients.map((ingredient) => (
                <li
                  key={`${cocktail.id}-${ingredient.name}`}
                  className="flex justify-between items-center gap-3"
                >
                  <span className="font-semibold text-white">{ingredient.name}</span>
                  <span className="text-white/70 text-sm font-medium">{ingredient.measure ? formatMeasurement(ingredient.measure) : ""}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#202226] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
              {t("explore.modal.method")}
            </h3>
            <p className="whitespace-pre-line text-sm text-white/85 leading-relaxed">
              {cocktail.instructions}
            </p>
          </div>

          {cocktail.flavorProfile.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cocktail.flavorProfile.map((profile) => (
                <span
                  key={profile}
                  className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                >
                  {profile}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function matchesSearch(cocktail: ExploreCocktail, term: string) {
  const fields = [
    cocktail.name,
    cocktail.description ?? "",
    cocktail.instructions,
    cocktail.category ?? "",
    cocktail.glass ?? "",
    ...cocktail.tags,
    ...cocktail.ingredients.map((ingredient) => ingredient.name),
  ];

  return fields.some((field) => field.toLowerCase().includes(term));
}

function computeRelevanceScore(
  cocktail: ExploreCocktail,
  profile: UserProfile,
  focusMode: FocusMode,
  searchTerm: string,
) {
  const ingredientMatches = cocktail.ingredients.filter((ingredient) =>
    profile.topIngredients.has(ingredient.name.toLowerCase()),
  ).length;
  const baseSpiritMatches = cocktail.baseSpirits.filter((spirit) =>
    profile.favoriteSpirits.has(spirit),
  ).length;
  const typeBonus = profile.topTypes.has(cocktail.suggestedType) ? 1.3 : 0;

  let score = cocktail.popularityScore + ingredientMatches * 1.5 + baseSpiritMatches * 1.2 + typeBonus;

  if (profile.ownedNames.has(cocktail.name.toLowerCase())) {
    score -= 5;
  }

  if (searchTerm) {
    if (cocktail.name.toLowerCase().startsWith(searchTerm)) {
      score += 3;
    } else if (cocktail.name.toLowerCase().includes(searchTerm)) {
      score += 1.5;
    }

    const ingredientHasTerm = cocktail.ingredients.some((ingredient) =>
      ingredient.name.toLowerCase().includes(searchTerm),
    );
    if (ingredientHasTerm) {
      score += 1;
    }
  }

  if (focusMode === "classics") {
    score += cocktail.iba ? 3 : 0;
    if (cocktail.tags.some((tag) => /classic|iba|signature/i.test(tag))) {
      score += 1;
    }
  } else if (focusMode === "adventurous") {
    score += Math.max(0, 3 - ingredientMatches);
    if (!cocktail.baseSpirits.length) {
      score += 1;
    }
  }

  score += pseudoRandomFromString(cocktail.id) * 0.8;
  return score;
}

function computeSortValue(
  cocktail: ExploreCocktail,
  sortMode: SortMode,
  relevance: number,
) {
  if (sortMode === "popular") {
    return cocktail.popularityScore;
  }
  if (sortMode === "recent") {
    const numericId = Number(cocktail.id);
    return Number.isNaN(numericId) ? relevance : numericId;
  }
  return relevance;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

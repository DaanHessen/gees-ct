"use client";

import clsx from "clsx";
import { useExploreFilters } from "@/lib/explore-filters-context";
import { BASE_SPIRIT_OPTIONS, type BaseSpirit } from "@/lib/explore-helpers";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";
import type { AlcoholFilter, FocusMode, SortMode } from "@/lib/explore-filters-context";
import type { ReactNode } from "react";

const alcoholOptions: Array<{ value: AlcoholFilter; labelKey: TranslationKey }> = [
  { value: "all", labelKey: "explore.alcoholFilter.all" },
  { value: "alcoholic", labelKey: "explore.alcoholFilter.alcoholic" },
  { value: "nonAlcoholic", labelKey: "explore.alcoholFilter.nonAlcoholic" },
  { value: "optional", labelKey: "explore.alcoholFilter.optional" },
];

const focusOptions: Array<{ value: FocusMode; labelKey: TranslationKey }> = [
  { value: "recommended", labelKey: "explore.focus.recommended" },
  { value: "classics", labelKey: "explore.focus.classics" },
  { value: "adventurous", labelKey: "explore.focus.adventurous" },
];

type ExploreFiltersProps = {
  derivedCategories?: string[];
  derivedGlasses?: string[];
  derivedFlavors?: string[];
};

type FilterSectionProps = {
  title: string;
  children: ReactNode;
};

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">{title}</p>
      {children}
    </div>
  );
}

type FilterChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-md px-2 py-1.5 text-[10px] font-semibold transition-all duration-150 text-center leading-tight",
        active 
          ? "bg-white text-[#1b1c1f] shadow-sm" 
          : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

export function ExploreFilters({ derivedCategories: propCategories, derivedGlasses: propGlasses, derivedFlavors: propFlavors }: ExploreFiltersProps) {
  const { t } = useLanguage();
  const {
    alcoholFilter,
    setAlcoholFilter,
    selectedSpirits,
    setSelectedSpirits,
    selectedCategories,
    setSelectedCategories,
    selectedGlasses,
    setSelectedGlasses,
    selectedFlavors,
    setSelectedFlavors,
    focusMode,
    setFocusMode,
    sortMode,
    setSortMode,
    ingredientRange,
    setIngredientRange,
    filtersActive,
    clearFilters,
    derivedFilters,
  } = useExploreFilters();

  const derivedCategories = propCategories || derivedFilters.categories;
  const derivedGlasses = propGlasses || derivedFilters.glasses;
  const derivedFlavors = propFlavors || derivedFilters.flavors;

  const toggleSpirit = (spirit: BaseSpirit) => {
    setSelectedSpirits((current) => {
      const next = new Set(current);
      if (next.has(spirit)) {
        next.delete(spirit);
      } else {
        next.add(spirit);
      }
      return next;
    });
  };

  const toggleStringFilter = (
    value: string,
    updater: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    updater((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="space-y-3 overflow-y-auto px-1 pb-4">
        {/* Focus Mode */}
        <div className="grid grid-cols-1 gap-1.5">
          {focusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFocusMode(option.value)}
              className={clsx(
                "rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-150 text-left",
                focusMode === option.value
                  ? "bg-white text-[#1b1c1f] shadow-sm"
                  : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
              )}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>

      {/* Alcohol Filter */}
        <FilterSection title={t("explore.alcoholFilter")}>
          <div className="grid grid-cols-2 gap-1">
            {alcoholOptions.map((option) => (
              <FilterChip
                key={option.value}
                active={alcoholFilter === option.value}
                label={t(option.labelKey)}
                onClick={() => setAlcoholFilter(option.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Base Spirits */}
        <FilterSection title={t("explore.baseSpiritFilter")}>
          <div className="grid grid-cols-2 gap-1">
            {BASE_SPIRIT_OPTIONS.map((spirit) => (
              <FilterChip
                key={spirit}
                label={spirit}
                active={selectedSpirits.has(spirit)}
                onClick={() => toggleSpirit(spirit)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Sort */}
        <FilterSection title={t("explore.sortLabel")}>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="w-full rounded-md border border-white/10 bg-[#1b1c1f] px-2 py-1.5 text-[11px] text-white focus:border-white/30 focus:outline-none"
          >
            <option value="match">{t("explore.sort.match")}</option>
            <option value="popular">{t("explore.sort.popular")}</option>
            <option value="recent">{t("explore.sort.recent")}</option>
          </select>
        </FilterSection>

        {/* Categories */}
        {derivedCategories.length > 0 && (
          <FilterSection title={t("explore.categories")}>
            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1">
              {derivedCategories.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  active={selectedCategories.has(category)}
                  onClick={() => toggleStringFilter(category, setSelectedCategories)}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Glasses */}
        {derivedGlasses.length > 0 && (
          <FilterSection title={t("explore.glasses")}>
            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1">
            {derivedGlasses.map((glass) => (
              <FilterChip
                key={glass}
                label={glass}
                active={selectedGlasses.has(glass)}
                onClick={() => toggleStringFilter(glass, setSelectedGlasses)}
              />
            ))}
          </div>
        </FilterSection>
      )}

        {/* Flavors */}
        {derivedFlavors.length > 0 && (
          <FilterSection title={t("explore.flavorProfiles")}>
            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1">
              {derivedFlavors.map((profile) => (
                <FilterChip
                  key={profile}
                  label={profile}
                  active={selectedFlavors.has(profile)}
                  onClick={() => toggleStringFilter(profile, setSelectedFlavors)}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Ingredient Count */}
        <FilterSection title={t("explore.ingredientsRange")}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={ingredientRange[1]}
              value={ingredientRange[0]}
              onChange={(event) =>
                setIngredientRange([
                  Math.max(1, Math.min(Number(event.target.value) || 1, ingredientRange[1])),
                  ingredientRange[1],
                ])
              }
              className="w-full rounded-md border border-white/10 bg-[#1b1c1f] px-2 py-1.5 text-[11px] text-white"
            />
            <span className="text-white/40 text-xs">—</span>
            <input
              type="number"
              min={ingredientRange[0]}
              max={20}
              value={ingredientRange[1]}
              onChange={(event) =>
                setIngredientRange([
                  ingredientRange[0],
                  Math.min(20, Math.max(Number(event.target.value) || 12, ingredientRange[0])),
                ])
              }
              className="w-full rounded-md border border-white/10 bg-[#1b1c1f] px-2 py-1.5 text-[11px] text-white"
            />
          </div>
        </FilterSection>

      {/* Clear Filters */}
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            {t("explore.clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}

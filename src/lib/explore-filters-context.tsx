"use client";

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import type { BaseSpirit } from "./explore-helpers";

export type AlcoholFilter = "all" | "alcoholic" | "nonAlcoholic" | "optional";
export type FocusMode = "recommended" | "classics" | "adventurous";
export type SortMode = "match" | "popular" | "recent";

type DerivedFilters = {
  categories: string[];
  glasses: string[];
  flavors: string[];
};

type ExploreFiltersContextType = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  alcoholFilter: AlcoholFilter;
  setAlcoholFilter: Dispatch<SetStateAction<AlcoholFilter>>;
  selectedSpirits: Set<BaseSpirit>;
  setSelectedSpirits: Dispatch<SetStateAction<Set<BaseSpirit>>>;
  selectedCategories: Set<string>;
  setSelectedCategories: Dispatch<SetStateAction<Set<string>>>;
  selectedGlasses: Set<string>;
  setSelectedGlasses: Dispatch<SetStateAction<Set<string>>>;
  selectedFlavors: Set<string>;
  setSelectedFlavors: Dispatch<SetStateAction<Set<string>>>;
  focusMode: FocusMode;
  setFocusMode: Dispatch<SetStateAction<FocusMode>>;
  sortMode: SortMode;
  setSortMode: Dispatch<SetStateAction<SortMode>>;
  ingredientRange: [number, number];
  setIngredientRange: Dispatch<SetStateAction<[number, number]>>;
  filtersActive: boolean;
  clearFilters: () => void;
  derivedFilters: DerivedFilters;
  setDerivedFilters: Dispatch<SetStateAction<DerivedFilters>>;
};

const ExploreFiltersContext = createContext<ExploreFiltersContextType | null>(null);

export function ExploreFiltersProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [alcoholFilter, setAlcoholFilter] = useState<AlcoholFilter>("all");
  const [selectedSpirits, setSelectedSpirits] = useState<Set<BaseSpirit>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedGlasses, setSelectedGlasses] = useState<Set<string>>(new Set());
  const [selectedFlavors, setSelectedFlavors] = useState<Set<string>>(new Set());
  const [focusMode, setFocusMode] = useState<FocusMode>("recommended");
  const [sortMode, setSortMode] = useState<SortMode>("match");
  const [ingredientRange, setIngredientRange] = useState<[number, number]>([1, 12]);
  const [derivedFilters, setDerivedFilters] = useState<DerivedFilters>({
    categories: [],
    glasses: [],
    flavors: [],
  });

  const filtersActive =
    search.trim().length > 0 ||
    selectedSpirits.size > 0 ||
    selectedCategories.size > 0 ||
    selectedGlasses.size > 0 ||
    selectedFlavors.size > 0 ||
    alcoholFilter !== "all" ||
    focusMode !== "recommended" ||
    ingredientRange[0] !== 1 ||
    ingredientRange[1] !== 12;

  const clearFilters = () => {
    setSearch("");
    setAlcoholFilter("all");
    setSelectedSpirits(new Set());
    setSelectedCategories(new Set());
    setSelectedGlasses(new Set());
    setSelectedFlavors(new Set());
    setFocusMode("recommended");
    setSortMode("match");
    setIngredientRange([1, 12]);
  };

  return (
    <ExploreFiltersContext.Provider
      value={{
        search,
        setSearch,
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
        setDerivedFilters,
      }}
    >
      {children}
    </ExploreFiltersContext.Provider>
  );
}

export function useExploreFilters() {
  const context = useContext(ExploreFiltersContext);
  if (!context) {
    throw new Error("useExploreFilters must be used within an ExploreFiltersProvider");
  }
  return context;
}

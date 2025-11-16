"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type MeasurementSystem = "metric" | "imperial";

type MeasurementContextType = {
  system: MeasurementSystem;
  setSystem: (system: MeasurementSystem) => void;
  formatMeasurement: (original: string) => string;
};

const MeasurementContext = createContext<MeasurementContextType | undefined>(undefined);

const STORAGE_KEY = "ctbase.measurement";

const unicodeFractions: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

type SupportedUnit = "ml" | "cl" | "oz";

const UNIT_REGEX = /(ml|cl|oz)/i;

function parseNumericPart(value: string) {
  if (!value) return null;
  const cleaned = value
    .replace(/[^\d\s\/\.\-¼½¾⅓⅔⅛⅜⅝⅞]/g, " ")
    .replace(/-/g, " ")
    .trim();

  if (!cleaned) return null;

  const tokens = cleaned.split(/\s+/);
  let total = 0;

  for (const token of tokens) {
    if (!token) continue;
    if (unicodeFractions[token]) {
      total += unicodeFractions[token];
      continue;
    }
    if (token.includes("/")) {
      const [numerator, denominator] = token.split("/").map(Number);
      if (numerator && denominator) {
        total += numerator / denominator;
        continue;
      }
    }
    const decimal = Number(token);
    if (!Number.isNaN(decimal)) {
      total += decimal;
    }
  }

  return total > 0 ? total : null;
}

function toMilliliters(value: number, unit: SupportedUnit) {
  switch (unit) {
    case "ml":
      return value;
    case "cl":
      return value * 10;
    case "oz":
      return value * 29.5735;
    default:
      return value;
  }
}

function formatValue(value: number) {
  if (value >= 100) {
    return `${Math.round(value)}`;
  }
  if (value >= 10) {
    return `${Math.round(value * 10) / 10}`;
  }
  return `${Math.round(value * 100) / 100}`;
}

function convertMeasurement(raw: string, system: MeasurementSystem) {
  const unitMatch = raw.match(UNIT_REGEX);
  if (!unitMatch) return null;

  const unit = unitMatch[1].toLowerCase() as SupportedUnit;
  const numericPart = raw.slice(0, unitMatch.index ?? raw.length);
  const numericValue = parseNumericPart(numericPart);

  if (!numericValue) return null;

  const mlValue = toMilliliters(numericValue, unit);

  if (system === "metric") {
    return `${formatValue(mlValue)} ml`;
  }

  const ounces = mlValue * 0.033814;
  return `${formatValue(ounces)} oz`;
}

export function MeasurementProvider({ children }: { children: ReactNode }) {
  const [system, setSystemState] = useState<MeasurementSystem>("metric");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as MeasurementSystem | null;
    if (stored === "metric" || stored === "imperial") {
      setSystemState(stored);
    }
  }, []);

  const setSystem = (next: MeasurementSystem) => {
    setSystemState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const formatMeasurement = useCallback(
    (original: string) => {
      const converted = convertMeasurement(original, system);
      return converted ?? original;
    },
    [system],
  );

  const value = useMemo(
    () => ({
      system,
      setSystem,
      formatMeasurement,
    }),
    [system, formatMeasurement],
  );

  return <MeasurementContext.Provider value={value}>{children}</MeasurementContext.Provider>;
}

export function useMeasurement() {
  const context = useContext(MeasurementContext);
  if (!context) {
    throw new Error("useMeasurement must be used within a MeasurementProvider");
  }
  return context;
}

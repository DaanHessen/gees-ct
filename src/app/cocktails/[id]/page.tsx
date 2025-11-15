"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { type CocktailIngredientRecord, type CocktailRecord, COCKTAIL_TYPE_COLORS } from "@/types/cocktail";
import { describeError } from "@/lib/error-utils";
import { Spinner } from "@/components/Spinner";
import { StatusToast, type StatusToastState } from "@/components/StatusToast";
import { CocktailModal } from "@/components/CocktailModal";

type CocktailWithRelations = CocktailRecord & {
  cocktail_ingredients: CocktailIngredientRecord[];
};

type PageProps = {
  params: { id: string };
};

export default function ViewCocktailPage({ params }: PageProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [cocktail, setCocktail] = useState<CocktailWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<StatusToastState | null>(null);

  useEffect(() => {
    const loadCocktail = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("cocktails")
          .select(
            `
            id,
            name,
            description,
            recipe,
            image_url,
            color,
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
          .eq("id", params.id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setFeedback({ type: "error", message: "Cocktail niet gevonden." });
          return;
        }

        setCocktail({
          ...data,
          cocktail_ingredients:
            data.cocktail_ingredients?.map((ci) => ({
              ...ci,
              ingredient: Array.isArray(ci.ingredient) ? ci.ingredient[0] : ci.ingredient,
            })) ?? [],
        } as CocktailWithRelations);
      } catch (error) {
        console.error(error);
        setFeedback({
          type: "error",
          message: `Kon cocktail niet laden: ${describeError(error)}`,
        });
      } finally {
        setLoading(false);
      }
    };

    loadCocktail();
  }, [params.id, supabase]);

  if (loading) {
    return (
      <CocktailModal maxWidth="4xl">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 animate-scaleIn">
            <Spinner />
            <p className="text-base font-semibold">Cocktail ophalen…</p>
          </div>
        </div>
      </CocktailModal>
    );
  }

  if (!cocktail) {
    return (
      <CocktailModal maxWidth="md">
        <div className="text-center py-10 animate-fadeIn">
          <div className="rounded-full bg-white/5 p-6 mx-auto w-fit mb-4">
            <svg className="w-12 h-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Cocktail niet gevonden</h1>
          <p className="text-white/60 mb-6">Deze cocktail bestaat niet of is verwijderd.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-md border border-white/30 px-4 py-2 text-sm transition-all duration-200 hover:bg-white/10"
          >
            Terug naar overzicht
          </button>
        </div>
      </CocktailModal>
    );
  }

  return (
    <CocktailModal maxWidth="4xl" showCloseButton={false}>
      <div className="mb-6 animate-slideUp">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-semibold pr-4">{cocktail.name}</h2>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.push(`/cocktails/${cocktail.id}/bewerk`)}
              className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-semibold transition-all duration-200 hover:bg-white/10 hover:scale-105"
            >
              Bewerk
            </button>
            <button
              type="button"
              onClick={() => router.back()}
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
                {cocktail.cocktail_ingredients.map((row, index) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between rounded-md border border-white/10 bg-[#202226] px-4 py-3 transition-all duration-200 hover:bg-[#252830] hover:border-white/20 animate-slideUp"
                    style={{ animationDelay: `${index * 50}ms` }}
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
              <p className="whitespace-pre-line rounded-md border border-white/10 bg-[#202226] p-4 text-sm leading-relaxed text-white/80 transition-all duration-200 hover:bg-[#252830] hover:border-white/20">
                {cocktail.recipe}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {feedback ? <StatusToast status={feedback} /> : null}
    </CocktailModal>
  );
}

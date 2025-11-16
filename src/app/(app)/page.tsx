import { Suspense } from "react";
import { CocktailBoard } from "@/components/CocktailBoard";
import { Spinner } from "@/components/Spinner";

function BoardWrapper() {
  return <CocktailBoard />;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#1b1c1f] text-slate-200">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#202226] px-8 py-6 animate-scaleIn shadow-2xl">
          <Spinner />
          <p className="text-base font-semibold">Loading…</p>
        </div>
      </div>
    }>
      <BoardWrapper />
    </Suspense>
  );
}

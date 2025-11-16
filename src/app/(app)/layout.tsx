"use client";

import { SidebarWrapper } from "@/components/SidebarWrapper";
import { useAuth } from "@/lib/auth-context";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { ExploreFiltersProvider } from "@/lib/explore-filters-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/Spinner";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#1b1c1f]">
      <SidebarWrapper />
      <main
        className={`flex-1 transition-all duration-300 ease-out ${
          collapsed ? "lg:ml-0" : "lg:ml-64"
        }`}
      >
        <div key={pathname} className="min-h-screen animate-pageTransition">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1b1c1f]">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#202226] px-8 py-6 shadow-2xl">
          <Spinner />
          <p className="text-base font-semibold text-white">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <SidebarProvider>
      <ExploreFiltersProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </ExploreFiltersProvider>
    </SidebarProvider>
  );
}

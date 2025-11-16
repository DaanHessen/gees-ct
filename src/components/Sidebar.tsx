"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "@/lib/sidebar-context";
import { useLanguage } from "@/lib/language-context";
import { useTeam } from "@/lib/team-context";
import type { ReactNode } from "react";

type SidebarProps = {
  exploreFilters?: ReactNode;
};

export function Sidebar({ exploreFilters }: SidebarProps) {
  const { collapsed, setCollapsed } = useSidebar();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { currentRole } = useTeam();
  const [isDesktop, setIsDesktop] = useState(false);
  const roleLabel = currentRole === "admin" ? t("sidebar.admin") : t("sidebar.user");
  const isExplorePage = pathname === "/explore";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const updateDesktopState = (matches: boolean) => {
      setIsDesktop(matches);
      if (matches) {
        setCollapsed(false);
      }
    };

    updateDesktopState(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateDesktopState(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [setCollapsed]);

  const handleNavigation = () => {
    if (!isDesktop) {
      setCollapsed(true);
    }
  };

  const navigation = [
    {
      name: t("sidebar.recipes"),
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: t("sidebar.explore"),
      href: "/explore",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="M12 2l2.09 6.26L20 9l-5 4 1.91 6.26L12 16l-4.91 3.26L9 13 4 9l5.91-.74L12 2z" />
        </svg>
      ),
    },
    {
      name: t("sidebar.settings"),
      href: "/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Toggle button - always visible on desktop when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-4 left-4 z-50 hidden lg:flex items-center justify-center w-10 h-10 rounded-lg bg-[#202226] border border-white/10 text-white hover:bg-[#2a2b2f] transition-colors shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Mobile toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-lg bg-[#202226] border border-white/10 text-white shadow-lg lg:hidden"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          {collapsed ? (
            <path d="M9 18l6-6-6-6" />
          ) : (
            <path d="M6 18L18 6M6 6l12 12" />
          )}
        </svg>
      </button>

      {/* Backdrop for mobile */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fadeIn"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed top-0 left-0 z-40 h-screen bg-[#202226] border-r border-white/10 transition-transform duration-300 ease-in-out w-64",
          collapsed ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              {/* "ct" badge with gradient */}
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-[#c62828] to-red-800 shadow-lg">
                <span className="text-white font-bold text-lg">ct</span>
              </div>
              <div>
                <span className="text-xl font-bold text-white tracking-tight">ctbase</span>
                <p className="text-xs text-white/40">{t("sidebar.subtitle")}</p>
              </div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleNavigation}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#c62828] text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {item.icon}
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
            
            {/* Explore Filters */}
            {isExplorePage && exploreFilters && !collapsed && (
              <div className="pt-4 mt-4 border-t border-white/10">
                {exploreFilters}
              </div>
            )}
          </nav>

          {/* User menu */}
          <div className="p-3 border-t border-white/10">
            {user && (
              <div className={clsx("space-y-2", collapsed && "flex flex-col items-center")}>
                <div
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2",
                    collapsed && "flex-col gap-1"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#c62828] to-[#d32f2f] flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {user.email?.[0].toUpperCase()}
                    </span>
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.user_metadata?.restaurant_name || user.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-white/50 truncate">{user.email}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            currentRole === "admin"
                              ? "border-emerald-400/50 text-emerald-200"
                              : "border-white/20 text-white/60"
                          }`}
                        >
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => signOut()}
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors",
                    collapsed && "justify-center"
                  )}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  {!collapsed && <span>{t("sidebar.signOut")}</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

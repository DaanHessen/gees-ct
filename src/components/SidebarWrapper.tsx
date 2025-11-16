"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { ExploreFilters } from "./ExploreFilters";

export function SidebarWrapper() {
  const pathname = usePathname();
  const isExplorePage = pathname === "/explore";

  if (!isExplorePage) {
    return <Sidebar />;
  }

  return <Sidebar exploreFilters={<ExploreFilters />} />;
}

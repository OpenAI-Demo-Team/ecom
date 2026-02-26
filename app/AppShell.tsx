"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProfileTakeover = pathname?.match(/^\/profile\/[^/]+$/) != null;

  if (isProfileTakeover) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <div id="app-content">{children}</div>
    </>
  );
}

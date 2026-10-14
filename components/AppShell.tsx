"use client";

import { TabBar } from "./TabBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <div className="app-shell">{children}</div>
      <TabBar />
    </div>
  );
}

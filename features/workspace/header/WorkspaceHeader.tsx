"use client";

import { HeaderMenu } from "@/features/workspace/header/HeaderMenu";

export function WorkspaceHeader() {
  return (
    <header className="mx-auto flex w-full max-w-4xl items-start justify-between gap-4 px-6 pb-2 pt-4 md:px-12 md:pb-4 md:pt-12">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl md:text-4xl">Tasks</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <HeaderMenu />
      </div>
    </header>
  );
}

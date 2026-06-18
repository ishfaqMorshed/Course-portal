"use client";

import { createContext, useContext, type ReactNode } from "react";
import { FIXTURES } from "@/lib/fixtures";
import type { CurrentUser } from "@/lib/queries";

// Current-user context. Falls back to the fixture user so the components still
// render in dev/preview without a session (Phase 1.5 behaviour preserved).
const fallback: CurrentUser = {
  name: FIXTURES.user.name,
  email: FIXTURES.user.email,
  initials: FIXTURES.user.initials,
};

const CurrentUserContext = createContext<CurrentUser>(fallback);

export function CurrentUserProvider({ value, children }: { value: CurrentUser | null; children: ReactNode }) {
  return <CurrentUserContext.Provider value={value ?? fallback}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  return useContext(CurrentUserContext);
}

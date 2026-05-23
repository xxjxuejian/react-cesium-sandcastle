import type { ReactNode } from "react";

import "@/i18n";

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  return children;
}

import { RouterProvider } from "react-router";

import router from "@/router";
// import { AntdProvider } from "./AntdProvider";
import { I18nProvider } from "./I18nProvider";
// import { ThemeProvider } from "./ThemeProvider";

export function AppProvider() {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

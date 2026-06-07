import { RouterProvider } from "react-router";

import router from "@/router";
import { AntdProvider } from "./AntdProvider";
import { ThemeProvider } from "./ThemeProvider";

export function AppProvider() {
  return (
    <ThemeProvider>
      <AntdProvider>
        <RouterProvider router={router} />
      </AntdProvider>
    </ThemeProvider>
  );
}

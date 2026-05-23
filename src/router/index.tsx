import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";

import { mockRoutes } from "./mockRoutes";
import { transformRoutes } from "./transform";

const MainLayout = lazy(() => import("@/layouts"));
const NotFound = lazy(() => import("@/pages/error/NotFound"));

const layoutRoutes = transformRoutes(mockRoutes);
console.log("routes: , layoutRoutes", layoutRoutes);

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<div className="p-4">加载中...</div>}>
        <MainLayout />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />,
      },
      ...layoutRoutes,
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;

import { useMemo, type ReactNode } from "react";
import { Breadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import type { BreadcrumbProps } from "antd";
import type { BackendRouteItem } from "@/router/types";

import { mockRoutes } from "@/router/mockRoutes";

type RouteBreadcrumb = {
  path: string;
  title: string;
};

const HOME_PATH = "/home";

function joinPath(parentPath: string, path: string) {
  const normalizedParent = parentPath.endsWith("/")
    ? parentPath.slice(0, -1)
    : parentPath;

  return `${normalizedParent}/${path}`.replace(/\/+/g, "/");
}

function normalizePath(pathname: string) {
  if (pathname === "/") return pathname;

  return pathname.replace(/\/+$/, "");
}

function getRouteTitle(
  route: BackendRouteItem,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (route.meta?.titleKey) {
    return t(route.meta.titleKey);
  }

  return route.meta?.title ?? route.name;
}

function matchBreadcrumbs(
  routes: BackendRouteItem[],
  pathname: string,
  t: ReturnType<typeof useTranslation>["t"],
  parentPath = "",
): RouteBreadcrumb[] {
  for (const route of routes) {
    const fullPath = joinPath(parentPath, route.path);
    const isMatched =
      pathname === fullPath || pathname.startsWith(`${fullPath}/`);

    if (!isMatched) {
      continue;
    }

    const currentBreadcrumb = {
      path: fullPath,
      title: getRouteTitle(route, t),
    };

    if (route.children?.length) {
      const childBreadcrumbs = matchBreadcrumbs(
        route.children,
        pathname,
        t,
        fullPath,
      );

      return [currentBreadcrumb, ...childBreadcrumbs];
    }

    return [currentBreadcrumb];
  }

  return [];
}

function getHomeBreadcrumb(t: ReturnType<typeof useTranslation>["t"]) {
  const homeRoute = mockRoutes.find(
    (route) => joinPath("", route.path) === HOME_PATH,
  );

  return {
    path: HOME_PATH,
    title: homeRoute ? getRouteTitle(homeRoute, t) : t("menu.home"),
  };
}

function renderHomeTitle(title: string) {
  return (
    <span className="inline-flex items-center gap-1">
      {/* <HomeOutlined /> */}
      <span>{title}</span>
    </span>
  );
}

export function BreadCrumb() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const items = useMemo<BreadcrumbProps["items"]>(() => {
    const matchedBreadcrumbs = matchBreadcrumbs(
      mockRoutes,
      normalizePath(pathname),
      t,
    );
    const homeBreadcrumb = getHomeBreadcrumb(t);
    const breadcrumbs =
      matchedBreadcrumbs[0]?.path === HOME_PATH
        ? matchedBreadcrumbs
        : [homeBreadcrumb, ...matchedBreadcrumbs];

    return breadcrumbs.map((breadcrumb, index) => {
      const isLast = index === breadcrumbs.length - 1;
      const title: ReactNode =
        breadcrumb.path === HOME_PATH
          ? renderHomeTitle(breadcrumb.title)
          : breadcrumb.title;

      return {
        title: isLast ? title : <Link to={breadcrumb.path}>{title}</Link>,
      };
    });
  }, [pathname, t]);

  if (!items?.length) {
    return null;
  }

  return <Breadcrumb items={items} />;
}

export default BreadCrumb;

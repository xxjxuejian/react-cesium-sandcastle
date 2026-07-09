// src/router/mockRoutes.ts
import type { BackendRouteItem } from "./types";

export const mockRoutes: BackendRouteItem[] = [
  {
    path: "home",
    name: "Home",
    component: "home",
    meta: {
      title: "首页",
      titleKey: "menu.home",
      icon: "HomeOutlined",
      showInMenu: true,
      order: 1,
    },
  },
  {
    path: "getting-started",
    name: "GettingStarted",
    redirect: "/getting-started/hello-world",
    meta: {
      title: "快速开始",
      titleKey: "menu.gettingStarted.title",
      icon: "UserOutlined",
      showInMenu: true,
      order: 2,
    },
    children: [
      {
        path: "hello-world",
        name: "HelloWorld",
        component: "getting-started/hello-world",
        meta: {
          title: "Hello World",
          titleKey: "menu.gettingStarted.helloWorld",
          showInMenu: true,
          order: 1,
        },
      },
      {
        path: "resolution-scale",
        name: "ResolutionScale",
        component: "getting-started/resolution-scale",
        meta: {
          title: "分辨率缩放",
          titleKey: "menu.gettingStarted.resolutionScale",
          showInMenu: true,
          order: 2,
        },
      },
    ],
  },
  {
    path: "showcases",
    name: "Showcases",
    redirect: "/showcases/google-2d-tiles",
    meta: {
      title: "示例展示",
      titleKey: "menu.showcases.title",
      icon: "DashboardOutlined",
      showInMenu: true,
      order: 3,
    },
    children: [
      {
        path: "google-2d-tiles",
        name: "Google2DTiles",
        component: "showcases/google-2d-tiles",
        meta: {
          title: "Google 2D Tiles",
          titleKey: "menu.showcases.google2dTiles",
          showInMenu: true,
          order: 1,
        },
      },
    ],
  },
  {
    path: "animation",
    name: "animation",
    meta: {
      title: "动画",
      titleKey: "menu.animation.title",
      icon: "SettingOutlined",
      showInMenu: true,
      order: 4,
    },
    redirect: "/animation/clock",
    children: [
      {
        path: "clock",
        name: "clock",
        component: "animation/clock",
        meta: {
          title: "时钟",
          titleKey: "menu.animation.clock",
          showInMenu: true,
          order: 1,
        },
      },
    ],
  },
  {
    path: "system-management",
    name: "SystemManagement",
    redirect: "/system-management/user-management",
    meta: {
      title: "系统管理",
      titleKey: "menu.systemManagement.title",
      icon: "SettingOutlined",
      showInMenu: true,
      order: 5,
    },
    children: [
      {
        path: "user-management",
        name: "UserManagement",
        component: "system-management/user-management",
        meta: {
          title: "用户管理",
          titleKey: "menu.systemManagement.userManagement",
          showInMenu: true,
          order: 1,
        },
      },
    ],
  },
];

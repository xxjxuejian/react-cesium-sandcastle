import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import zhCN from "./locales/zh-CN";
import enUS from "./locales/en-US";
import { DEFAULT_LANGUAGE } from "./constants";
import { getDefaultLanguage } from "./utils";

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": {
      translation: zhCN,
    },
    "en-US": {
      translation: enUS,
    },
  },
  lng: getDefaultLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
export { LANGUAGE_STORAGE_KEY } from "./constants";
export type { AppLanguage } from "./types";

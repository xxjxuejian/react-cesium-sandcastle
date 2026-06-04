import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from "./constants";
import type { AppLanguage } from "./types";

/**
 * 判断传入的语言值是否是应用支持的语言。
 *
 * @param language - 待校验的语言值，通常来自 localStorage 或外部输入。
 * @returns 如果语言值在支持列表中，返回 true，并将类型收窄为 AppLanguage。
 */
export function isAppLanguage(language: string | null): language is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(language as AppLanguage);
}

/**
 * 获取应用启动时使用的默认语言。
 *
 * 优先读取 localStorage 中保存的用户语言偏好；如果没有保存或保存值无效，
 * 则回退到项目配置的默认语言。
 *
 * @returns 应用启动时应该使用的语言。
 */
export function getDefaultLanguage(): AppLanguage {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (isAppLanguage(storedLanguage)) {
    return storedLanguage;
  }

  return DEFAULT_LANGUAGE;
}

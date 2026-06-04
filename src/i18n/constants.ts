import type { AppLanguage } from "./types";

// 保存用户语言偏好的 localStorage key。
export const LANGUAGE_STORAGE_KEY = "language";

// 用户没有选择语言或存储值无效时使用的默认语言。
export const DEFAULT_LANGUAGE: AppLanguage = "zh-CN";

// 应用允许切换和初始化的语言列表。
export const SUPPORTED_LANGUAGES: AppLanguage[] = ["zh-CN", "en-US"];

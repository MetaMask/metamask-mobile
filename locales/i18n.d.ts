import type { EventEmitter } from 'events';
import type I18n from 'react-native-i18n';
import type en from './languages/en.json';

type TranslationPrimitive = string | number | boolean | null | undefined;
export type TranslationParams = Record<string, TranslationPrimitive>;

type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

type Join<K extends string, P extends string> = `${K}.${P}`;

type NestedTranslationKeys<T> = T extends object
  ? {
      [K in Extract<keyof T, string>]: T[K] extends string
        ? K
        : T[K] extends readonly unknown[]
          ? K
          : T[K] extends object
            ? Join<K, NestedTranslationKeys<T[K]>>
            : K;
    }[Extract<keyof T, string>]
  : never;

export type TranslationKey = NestedTranslationKeys<typeof en>;

export const supportedTranslations: Record<string, DeepPartial<typeof en>>;
export const I18nEvents: EventEmitter;
export const isRTL: boolean;

export function setLocale(locale: string): Promise<void>;
export function getLanguages(): Record<string, string>;

/**
 * Preferred typed overload for static keys.
 * Dynamic keys remain supported through the fallback overload.
 */
export function strings<TKey extends TranslationKey>(
  name: TKey,
  params?: TranslationParams,
): string;
export function strings(name: string, params?: TranslationParams): string;

export default I18n;

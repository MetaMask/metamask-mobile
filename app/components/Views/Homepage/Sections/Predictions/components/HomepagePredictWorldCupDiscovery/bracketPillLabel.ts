import { strings } from '../../../../../../../../locales/i18n';

const MISSING_PREFIX = '[missing';

/**
 * Returns the display label for a World Cup bracket pill.
 *
 * `i18n-js` returns `[missing "..." translation]` for unknown keys. If a
 * translation hasn't been added yet for a given stage key, fall back to a
 * humanized version of the key rather than rendering the marker — keeps the
 * UI usable when remote `stages` ship a new key ahead of the locale file.
 */
export const bracketPillLabel = (stageKey: string): string => {
  const i18nKey = `predict.world_cup.stages.${stageKey}`;
  // Cast `as never` is intentional: the key is built dynamically from the
  // (config-driven) stage list, so we cannot enforce membership at compile
  // time. The runtime fallback below covers missing translations.
  const label = strings(i18nKey as never);
  if (typeof label === 'string' && !label.startsWith(MISSING_PREFIX)) {
    return label;
  }
  return stageKey.replace(/_/g, ' ').toUpperCase();
};

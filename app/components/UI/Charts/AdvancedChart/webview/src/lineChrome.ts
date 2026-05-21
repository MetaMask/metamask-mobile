/**
 * Line chrome: boolean quad controlling custom overlays vs TradingView built-ins.
 */

import type { LineChromeOptions } from './types';
import { getState } from './state';

export const LINE_CHROME_DEFAULTS: LineChromeOptions = {
  hideTimeScale: false,
  useCustomLineEndMarker: true,
  useCustomDashedLastPriceLine: true,
  useCustomPriceLabels: true,
};

export function lineChromePickBool(
  lc: Partial<LineChromeOptions>,
  key: keyof LineChromeOptions,
  fallback: boolean,
): boolean {
  return lc[key] !== undefined ? !!lc[key] : fallback;
}

/** Effective line chrome: CONFIG.lineChrome merged with defaults. */
export function getLineChrome(): LineChromeOptions {
  const s = getState();
  const lc: Partial<LineChromeOptions> =
    (s.CONFIG && s.CONFIG.lineChrome) || {};
  return {
    hideTimeScale: lineChromePickBool(
      lc,
      'hideTimeScale',
      LINE_CHROME_DEFAULTS.hideTimeScale,
    ),
    useCustomLineEndMarker: lineChromePickBool(
      lc,
      'useCustomLineEndMarker',
      LINE_CHROME_DEFAULTS.useCustomLineEndMarker,
    ),
    useCustomDashedLastPriceLine: lineChromePickBool(
      lc,
      'useCustomDashedLastPriceLine',
      LINE_CHROME_DEFAULTS.useCustomDashedLastPriceLine,
    ),
    useCustomPriceLabels: lineChromePickBool(
      lc,
      'useCustomPriceLabels',
      LINE_CHROME_DEFAULTS.useCustomPriceLabels,
    ),
  };
}

/**
 * Normalizes an RN SET_LINE_CHROME payload to the full boolean quad.
 * Missing keys use defaults.
 */
export function resolveLineChromeFromPayload(
  payload: unknown,
): LineChromeOptions | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Partial<Record<keyof LineChromeOptions, unknown>>;
  return {
    hideTimeScale:
      p.hideTimeScale !== undefined
        ? !!p.hideTimeScale
        : LINE_CHROME_DEFAULTS.hideTimeScale,
    useCustomLineEndMarker:
      p.useCustomLineEndMarker !== undefined
        ? !!p.useCustomLineEndMarker
        : LINE_CHROME_DEFAULTS.useCustomLineEndMarker,
    useCustomDashedLastPriceLine:
      p.useCustomDashedLastPriceLine !== undefined
        ? !!p.useCustomDashedLastPriceLine
        : LINE_CHROME_DEFAULTS.useCustomDashedLastPriceLine,
    useCustomPriceLabels:
      p.useCustomPriceLabels !== undefined
        ? !!p.useCustomPriceLabels
        : LINE_CHROME_DEFAULTS.useCustomPriceLabels,
  };
}

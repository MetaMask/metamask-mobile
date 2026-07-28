// Visual override application — grid colour, pane separator, current-price
// line colour. Driven from CONFIG.visualOverrides (set by the consumer's
// `visualOverrides` prop on the RN side).
//
// New module in Phase 2 — there was no single legacy equivalent; the legacy
// code spread these overrides across init + theme + series style branches.
// Centralising here lets Perps (Phase 6) feed surface-specific overrides via
// the same path.

import { reportErrorToRN } from '../core/bridge';
import { getWidget } from '../core/state';

export interface VisualOverridesConfig {
  /** Color applied to vertical + horizontal grid lines. */
  gridLineColor?: string;
  /** When true, the line between sub-panes is hidden (set to transparent). */
  hidePaneSeparator?: boolean;
  /** Override for the built-in current-price line + pill colour. */
  currentPriceLineColor?: string;
  /** Volume bar colours (Phase 3 / Phase 6 consumers). */
  volumeUpColor?: string;
  volumeDownColor?: string;
}

/**
 * Builds the TradingView override object from a VisualOverridesConfig.
 * Returned shape is suitable for passing into TradingView's `applyOverrides`.
 */
export function buildVisualOverrides(
  config: VisualOverridesConfig | undefined,
): Record<string, unknown> {
  if (!config) return {};
  const overrides: Record<string, unknown> = {};

  if (config.gridLineColor != null) {
    overrides['paneProperties.vertGridProperties.color'] = config.gridLineColor;
    overrides['paneProperties.horzGridProperties.color'] = config.gridLineColor;
  }
  if (config.hidePaneSeparator) {
    overrides['paneProperties.separatorColor'] = 'rgba(0,0,0,0)';
  }
  if (config.currentPriceLineColor != null) {
    overrides['mainSeriesProperties.priceLineColor'] =
      config.currentPriceLineColor;
  }
  return overrides;
}

/**
 * Apply visual overrides to a live widget. Safe to call before chart-ready —
 * TradingView queues overrides internally. Errors are forwarded to RN.
 */
export function applyVisualOverrides(
  config: VisualOverridesConfig | undefined,
): void {
  const widget = getWidget();
  if (!widget) return;
  const overrides = buildVisualOverrides(config);
  if (Object.keys(overrides).length === 0) return;
  try {
    widget.applyOverrides(overrides);
  } catch (error) {
    reportErrorToRN(error);
  }
}

import {
  PERPS_SLIPPAGE_MAX_BPS,
  bpsToPercent,
} from '../constants/slippageConfig';

const SLIPPAGE_DISPLAY_FLOOR_PCT = 0.01;

/**
 * Format a slippage percent for display in the order summary.
 *
 * - `null` (no book / not enough size) → "—"
 * - `insufficientLiquidity` → ">10%"
 * - sub-rounding non-zero → "<0.01%"
 * - otherwise → "X.XX%"
 */
export function formatSlippagePct(
  estimatedPct: number | null,
  insufficientLiquidity: boolean,
): string {
  if (insufficientLiquidity) {
    return `>${bpsToPercent(PERPS_SLIPPAGE_MAX_BPS)}%`;
  }
  if (estimatedPct === null) {
    return '—';
  }
  if (estimatedPct > 0 && estimatedPct < SLIPPAGE_DISPLAY_FLOOR_PCT) {
    return `<${SLIPPAGE_DISPLAY_FLOOR_PCT}%`;
  }
  return `${estimatedPct.toFixed(2)}%`;
}

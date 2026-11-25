import {
  formatAbbreviatedUsd,
  formatPercent,
  formatSignedAbbreviatedUsd,
  formatTradeUnitPrice,
} from '../utils/formatters';
import type { SocialLivePositionFigures } from './types';

export interface LiveFigureLabels {
  priceLabel: string;
  marketCapLabel?: string;
  pnlLabel?: string;
  pnlValueLabel?: string;
  isPnlPositive?: boolean;
}

/**
 * Formats live figures with the same helpers the snapshot labels use, so a
 * card reads identically before and after its first tick.
 */
export function formatLiveFigures(
  figures: SocialLivePositionFigures,
): LiveFigureLabels {
  const signSource = figures.pnlUsd ?? figures.pnlPercent;
  return {
    priceLabel: formatTradeUnitPrice(figures.price),
    marketCapLabel:
      figures.marketCapUsd == null
        ? undefined
        : formatAbbreviatedUsd(figures.marketCapUsd),
    pnlLabel:
      figures.pnlPercent == null
        ? undefined
        : formatPercent(figures.pnlPercent),
    pnlValueLabel:
      figures.pnlUsd == null
        ? undefined
        : formatSignedAbbreviatedUsd(figures.pnlUsd),
    isPnlPositive: signSource == null ? undefined : signSource >= 0,
  };
}

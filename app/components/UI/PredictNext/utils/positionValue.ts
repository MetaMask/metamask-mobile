import { strings } from '../../../../../locales/i18n';
import {
  formatSignedPercent,
  formatSignedUsdAmount,
} from './portfolioFormatting';

/** The signed unrealized PnL, with its percent when the backend sent one,
 * e.g. "+$1.00 (+1.90%)". */
export const formatPositionPnl = (
  unrealizedPnl: string,
  unrealizedPnlPercent?: string,
): string => {
  const amount = formatSignedUsdAmount(unrealizedPnl);
  return unrealizedPnlPercent === undefined
    ? amount
    : strings('predict_next.portfolio.pnl_with_percent', {
        amount,
        percent: formatSignedPercent(unrealizedPnlPercent),
      });
};

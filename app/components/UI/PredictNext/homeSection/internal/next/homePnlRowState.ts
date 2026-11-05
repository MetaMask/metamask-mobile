import BigNumber from 'bignumber.js';
import { strings } from '../../../../../../../locales/i18n';
import type { HomepageUnrealizedPnlTone } from '../../../../../Views/Homepage/components/HomepageSectionUnrealizedPnlRow';
import type { PortfolioSummaryState } from '../../../portfolio';
import {
  formatSignedPercent,
  formatSignedUsdAmount,
} from '../../../utils/portfolioFormatting';

export interface HomePnlRowState {
  show: boolean;
  isLoading: boolean;
  valueText?: string;
  tone: HomepageUnrealizedPnlTone;
}

const HIDDEN: HomePnlRowState = {
  show: false,
  isLoading: false,
  tone: 'neutral',
};
const LOADING: HomePnlRowState = {
  show: true,
  isLoading: true,
  tone: 'neutral',
};

const toneOf = (value: string): HomepageUnrealizedPnlTone => {
  const amount = new BigNumber(value).decimalPlaces(2, BigNumber.ROUND_HALF_UP);
  if (amount.isZero()) return 'neutral';
  return amount.isNegative() ? 'negative' : 'positive';
};

/**
 * The Homepage PnL row, from the Portfolio Summary's unrealized PnL over
 * every open Position — never a sum of the rows shown. Hidden in privacy
 * mode, as on Polymarket. A Summary that is missing or stale says so
 * instead of showing $0.00.
 */
export const getHomePnlRowState = ({
  summary,
  isPrivacyMode,
}: {
  summary: PortfolioSummaryState;
  isPrivacyMode: boolean;
}): HomePnlRowState => {
  if (isPrivacyMode) return HIDDEN;
  if (summary.status === 'loading') return LOADING;
  if (summary.status === 'error') {
    return {
      show: true,
      isLoading: false,
      valueText: strings('predict_next.home_section.pnl_unavailable'),
      tone: 'neutral',
    };
  }
  const { unrealizedPnl, unrealizedPnlPercent } = summary.summary;
  const amount = formatSignedUsdAmount(unrealizedPnl);
  return {
    show: true,
    isLoading: false,
    valueText:
      unrealizedPnlPercent === undefined
        ? amount
        : strings('predict_next.portfolio.pnl_with_percent', {
            amount,
            percent: formatSignedPercent(unrealizedPnlPercent),
          }),
    tone: toneOf(unrealizedPnl),
  };
};

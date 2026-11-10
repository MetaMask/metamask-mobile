import React from 'react';
import {
  PERPS_CONSTANTS,
  PERPS_DISPLAY_PRECISION,
} from '@metamask/perps-controller';
import {
  KeyValueRow,
  KeyValueRowVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';
import { formatPercentage } from '../../../utils/formatUtils';
import {
  formatCloseSummaryFiat,
  formatSignedCloseSummaryFiat,
  getCloseSummaryPnlColor,
} from '../../../components/PerpsCloseSummary/closeSummaryFormat';

// RoE at the same precision as the position cards. `formatPercentage` shows a
// value that rounds to zero without a minus; a non-positive RoE beside a
// negative $P&L (e.g. a limit just under the entry price) keeps its minus so
// the percentage agrees with the $P&L rendered beside it.
const formatSummaryPercentage = (value: number, pnl: number) => {
  const percentage = formatPercentage(
    value,
    PERPS_DISPLAY_PRECISION.RoePercent,
  );
  if (pnl >= 0 || value > 0 || percentage.startsWith('-')) {
    return percentage;
  }
  const unsigned = formatPercentage(value, {
    decimals: PERPS_DISPLAY_PRECISION.RoePercent,
    sign: 'never',
  });
  return `-${unsigned}`;
};

export interface PerpsCloseTotalsProps {
  /** P&L realized by the close; undefined while unavailable. */
  pnl: number | undefined;
  /**
   * The %RoE shown beside the $PnL: the position's actual %RoE
   * (`returnOnEquity × 100`) for market closes, or the RoE at the effective
   * (limit) price for limit closes — the same value the position component
   * renders for a market close. Omitted when nothing is being closed or the
   * value is unavailable.
   */
  roePercentage?: number;
  /** Cash the close returns; undefined while unavailable. */
  receiveAmount: number | undefined;
}

/**
 * Receive and P&L rows for the close sheet. Deliberately shorter than
 * `PerpsCloseSummary`, which the full-screen close flow uses: the sheet drops
 * the margin, fees, and rewards rows.
 */
const PerpsCloseTotals: React.FC<PerpsCloseTotalsProps> = ({
  pnl,
  roePercentage,
  receiveAmount,
}) => (
  <>
    <KeyValueRow
      variant={KeyValueRowVariant.Summary}
      keyLabel={strings('perps.close_position.total_receive')}
      value={formatCloseSummaryFiat(receiveAmount)}
      valueTextProps={{
        testID: PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_VALUE,
      }}
    />

    <KeyValueRow
      variant={KeyValueRowVariant.Summary}
      twClassName="mt-0.5"
      // One native element carries the label with its value for automation.
      accessible
      testID={PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL_ROW}
      keyLabel={strings('perps.close_position.included_pnl')}
      value={
        pnl === undefined
          ? PERPS_CONSTANTS.FallbackDataDisplay
          : `${formatSignedCloseSummaryFiat(pnl)}${
              roePercentage !== undefined
                ? ` (${formatSummaryPercentage(roePercentage, pnl)})`
                : ''
            }`
      }
      valueTextProps={{
        color: getCloseSummaryPnlColor(pnl),
        testID: PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL,
      }}
    />
  </>
);

export default PerpsCloseTotals;

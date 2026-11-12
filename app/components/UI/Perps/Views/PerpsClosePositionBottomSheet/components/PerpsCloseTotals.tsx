import React from 'react';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import {
  KeyValueRow,
  KeyValueRowVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';
import { formatRoePercentage } from '../../../utils/formatUtils';
import {
  formatCloseSummaryFiat,
  formatSignedCloseSummaryFiat,
  getCloseSummaryPnlColor,
} from '../../../components/PerpsCloseSummary/closeSummaryFormat';

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
                ? ` (${formatRoePercentage(roePercentage, pnl < 0)})`
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

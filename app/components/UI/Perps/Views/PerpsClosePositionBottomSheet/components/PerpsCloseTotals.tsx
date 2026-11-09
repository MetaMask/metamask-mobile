import React from 'react';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import {
  KeyValueRow,
  KeyValueRowVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';
import {
  formatPercentage,
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../../utils/formatUtils';

const formatSummaryFiat = (value: number | undefined) =>
  value === undefined
    ? PERPS_CONSTANTS.FallbackDataDisplay
    : formatPerpsFiat(value, { ranges: PRICE_RANGES_MINIMAL_VIEW });

// `formatPercentage` renders -0 as "+0.00%"; a limit RoE that rounds to
// zero from below (a limit just under the entry price) must keep its minus
// sign so the percentage agrees with the $P&L rendered beside it. The $P&L
// must also be negative, so a market RoE of exactly -0 beside a non-negative
// P&L keeps the plain formatted value.
const formatSummaryPercentage = (value: number, pnl: number) =>
  Object.is(value, -0) && pnl < 0 ? '-0.00%' : formatPercentage(value);

const getPnlColor = (pnl: number | undefined): TextColor => {
  if (pnl === undefined) {
    return TextColor.TextDefault;
  }
  return pnl < 0 ? TextColor.ErrorDefault : TextColor.SuccessDefault;
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
      value={formatSummaryFiat(receiveAmount)}
      valueTextProps={{
        testID: PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_VALUE,
      }}
    />

    <KeyValueRow
      variant={KeyValueRowVariant.Summary}
      twClassName="mt-0.5"
      keyLabel={strings('perps.close_position.included_pnl')}
      value={
        pnl === undefined
          ? PERPS_CONSTANTS.FallbackDataDisplay
          : `${pnl < 0 ? '-' : '+'}${formatSummaryFiat(Math.abs(pnl))}${
              roePercentage !== undefined
                ? ` (${formatSummaryPercentage(roePercentage, pnl)})`
                : ''
            }`
      }
      valueTextProps={{
        color: getPnlColor(pnl),
        testID: PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL,
      }}
    />
  </>
);

export default PerpsCloseTotals;

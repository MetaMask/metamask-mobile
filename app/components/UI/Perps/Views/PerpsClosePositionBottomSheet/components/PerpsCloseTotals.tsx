import React from 'react';
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

const formatSummaryFiat = (value: number) =>
  formatPerpsFiat(value, { ranges: PRICE_RANGES_MINIMAL_VIEW });

export interface PerpsCloseTotalsProps {
  pnl: number;
  /**
   * The position's actual %RoE (`returnOnEquity × 100`), the same value the
   * position component renders for the same position.
   */
  roePercentage: number;
  receiveAmount: number;
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
      value={`${pnl < 0 ? '-' : '+'}${formatSummaryFiat(Math.abs(pnl))} (${formatPercentage(
        roePercentage,
      )})`}
      valueTextProps={{
        color: pnl < 0 ? TextColor.ErrorDefault : TextColor.SuccessDefault,
        testID: PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL,
      }}
    />
  </>
);

export default PerpsCloseTotals;

import React from 'react';
import { PERPS_CONSTANTS, type MarginMode } from '@metamask/perps-controller';
import {
  KeyValueRow,
  KeyValueRowVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';
import { formatPercentage } from '../../../utils/formatUtils';
import PerpsMarginModeTag from '../../../components/PerpsMarginModeTag';
import {
  formatCloseSummaryFiat,
  formatSignedCloseSummaryFiat,
  getCloseSummaryPnlColor,
} from '../../../components/PerpsCloseSummary/closeSummaryFormat';

// `formatPercentage` renders -0 as "+0.00%"; a limit RoE that rounds to
// zero from below (a limit just under the entry price) must keep its minus
// sign so the percentage agrees with the $P&L rendered beside it. The $P&L
// must also be negative, so a market RoE of exactly -0 beside a non-negative
// P&L keeps the plain formatted value.
const formatSummaryPercentage = (value: number, pnl: number) =>
  Object.is(value, -0) && pnl < 0 ? '-0.00%' : formatPercentage(value);

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
  /** Margin the close returns, without its P&L. */
  margin?: number;
  /** Margin mode of the close; selects the P&L label and the margin row's tag. */
  marginMode?: MarginMode;
  /** Show the margin row when the margin mode is known (Close all only). */
  showMargin?: boolean;
  /**
   * Optional test IDs. A caller with its own selector namespace (the Close
   * all sheet) passes its own IDs; defaults to the close position sheet's.
   */
  testIDs?: {
    marginValue?: string;
    receiveValue?: string;
    pnlValue?: string;
    pnlRow?: string;
  };
}

/**
 * Receive and P&L rows for the close sheet. Deliberately shorter than
 * `PerpsCloseSummary`, which the full-screen close flow uses: the sheet drops
 * the fees and rewards rows, and shows margin only when `showMargin` is set.
 */
const PerpsCloseTotals: React.FC<PerpsCloseTotalsProps> = ({
  pnl,
  roePercentage,
  receiveAmount,
  margin,
  marginMode,
  showMargin = false,
  testIDs,
}) => {
  const marginValueTestID =
    testIDs?.marginValue ??
    PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE;
  const receiveValueTestID =
    testIDs?.receiveValue ??
    PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_VALUE;
  const pnlValueTestID =
    testIDs?.pnlValue ?? PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL;
  const pnlRowTestID =
    testIDs?.pnlRow ?? PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL_ROW;

  return (
    <>
      {showMargin && marginMode ? (
        <KeyValueRow
          variant={KeyValueRowVariant.Summary}
          keyLabel={strings('perps.close_position.margin')}
          keyEndAccessory={
            <PerpsMarginModeTag
              marginMode={marginMode}
              testID={PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_MODE_TAG}
            />
          }
          value={formatCloseSummaryFiat(margin)}
          valueTextProps={{
            testID: marginValueTestID,
          }}
        />
      ) : null}

      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('perps.close_position.total_receive')}
        value={formatCloseSummaryFiat(receiveAmount)}
        valueTextProps={{
          testID: receiveValueTestID,
        }}
      />

      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        twClassName="mt-0.5"
        // One native element carries the label with its value for automation.
        accessible
        testID={pnlRowTestID}
        keyLabel={strings(
          // Cross margin never holds the P&L, so it is not "included".
          marginMode === 'cross'
            ? 'perps.close_position.pnl'
            : 'perps.close_position.included_pnl',
        )}
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
          testID: pnlValueTestID,
        }}
      />
    </>
  );
};

export default PerpsCloseTotals;

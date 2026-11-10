import React from 'react';
import { PERPS_CONSTANTS, type MarginMode } from '@metamask/perps-controller';
import {
  KeyValueRow,
  KeyValueRowVariant,
  Tag,
  TagSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';
import { formatPercentage } from '../../../utils/formatUtils';
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
  /**
   * Margin the close returns. Isolated margin includes its P&L, cross margin
   * does not. Shown only when `marginMode` is set.
   */
  margin?: number;
  /** Margin mode of the position; renders the margin row when set. */
  marginMode?: MarginMode;
}

/**
 * Receive and P&L rows for the close sheet. Deliberately shorter than
 * `PerpsCloseSummary`, which the full-screen close flow uses: the sheet drops
 * the fees and rewards rows, and shows margin only when a mode is given.
 */
const PerpsCloseTotals: React.FC<PerpsCloseTotalsProps> = ({
  pnl,
  roePercentage,
  receiveAmount,
  margin,
  marginMode,
}) => (
  <>
    {marginMode ? (
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('perps.close_position.margin')}
        keyEndAccessory={
          <Tag
            severity={TagSeverity.Neutral}
            testID={PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_MODE_TAG}
          >
            {strings(
              marginMode === 'cross'
                ? 'perps.margin_mode.cross_title'
                : 'perps.margin_mode.isolated_title',
            )}
          </Tag>
        }
        value={formatCloseSummaryFiat(margin)}
        valueTextProps={{
          testID: PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE,
        }}
      />
    ) : null}

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

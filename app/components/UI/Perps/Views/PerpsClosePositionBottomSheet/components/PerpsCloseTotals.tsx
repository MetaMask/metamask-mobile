import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  IconName,
  KeyValueRow,
  KeyValueRowVariant,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../../utils/formatUtils';

const formatSummaryFiat = (value: number) =>
  formatPerpsFiat(value, { ranges: PRICE_RANGES_MINIMAL_VIEW });

export interface PerpsCloseTotalsProps {
  margin: number;
  /** Omitted when the venue reports no margin mode for the position. */
  marginMode?: 'isolated' | 'cross';
  pnl: number;
  receiveAmount: number;
  onMarginTooltipPress: () => void;
}

/**
 * Margin and total rows for the close sheet. Deliberately shorter than
 * `PerpsCloseSummary`, which the full-screen close flow uses: the sheet drops
 * the fees and rewards rows and folds P&L into the total.
 */
const PerpsCloseTotals: React.FC<PerpsCloseTotalsProps> = ({
  margin,
  marginMode,
  pnl,
  receiveAmount,
  onMarginTooltipPress,
}) => (
  <>
    <KeyValueRow
      variant={KeyValueRowVariant.Summary}
      twClassName="items-center"
      keyLabel={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('perps.close_position.margin')}
          </Text>
          {marginMode ? (
            <Tag
              severity={TagSeverity.Neutral}
              twClassName="self-center"
              testID={PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_MODE_TAG}
            >
              {marginMode === 'isolated'
                ? strings('perps.margin_mode.isolated_title')
                : strings('perps.margin_mode.cross_title')}
            </Tag>
          ) : null}
        </Box>
      }
      keyEndButtonIconProps={{
        iconName: IconName.Info,
        onPress: onMarginTooltipPress,
        testID: PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_TOOLTIP_BUTTON,
      }}
      value={formatSummaryFiat(margin)}
      valueTextProps={{
        testID: PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE,
      }}
    />

    <KeyValueRow
      variant={KeyValueRowVariant.Summary}
      twClassName="mt-2"
      keyLabel={strings('perps.close_position.total_inc_pnl')}
      value={
        <Box alignItems={BoxAlignItems.End}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-right"
            testID={PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_VALUE}
          >
            {formatSummaryFiat(receiveAmount)}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={pnl < 0 ? TextColor.ErrorDefault : TextColor.SuccessDefault}
            twClassName="text-right"
            testID={PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL}
          >
            {`(${pnl < 0 ? '-' : '+'}${formatSummaryFiat(Math.abs(pnl))})`}
          </Text>
        </Box>
      }
    />
  </>
);

export default PerpsCloseTotals;

import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { formatPerpsFiat } from '../../utils/formatUtils';
import {
  formatAccountLeverage,
  formatCrossMarginRatio,
  getCrossMarginRatioTone,
  type CrossMarginAccountSummary,
  type CrossMarginRatioTone,
} from '../../utils/crossMarginSummary';
import { PerpsBalanceBottomSheetSelectorsIDs } from '../../Perps.testIds';
import type { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';

export type PerpsCrossMarginSummaryTooltipKey = Extract<
  PerpsTooltipContentKey,
  | 'account_ratio'
  | 'maintenance_margin'
  | 'account_leverage'
  | 'cross_margin_usage'
>;

interface PerpsCrossMarginSummaryProps extends CrossMarginAccountSummary {
  privacyMode: boolean;
  onInfoPress: (key: PerpsCrossMarginSummaryTooltipKey) => void;
}

const TONE_COLOR: Record<CrossMarginRatioTone, TextColor> = {
  safe: TextColor.SuccessDefault,
  warning: TextColor.WarningDefault,
  danger: TextColor.ErrorDefault,
};

const getToneColor = (tone: CrossMarginRatioTone | undefined) =>
  tone ? TONE_COLOR[tone] : TextColor.TextDefault;

// `textDecorationStyle: 'dashed'` is iOS-only, so use the plain underline to
// render the same tappable affordance on both platforms.
const labelStyle = { textDecorationLine: 'underline' } as const;

interface RowProps {
  tooltipKey: PerpsCrossMarginSummaryTooltipKey;
  value: string;
  valueColor: TextColor;
  privacyMode: boolean;
  testID: string;
  onInfoPress: (key: PerpsCrossMarginSummaryTooltipKey) => void;
}

const SummaryRow: React.FC<RowProps> = ({
  tooltipKey,
  value,
  valueColor,
  privacyMode,
  testID,
  onInfoPress,
}) => {
  const label = strings(`perps.crossMarginSummary.${tooltipKey}`);
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      accessible={false}
    >
      <Pressable
        onPress={() => onInfoPress(tooltipKey)}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          style={labelStyle}
        >
          {label}
        </Text>
      </Pressable>
      <SensitiveText
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={valueColor}
        isHidden={privacyMode}
        length={SensitiveTextLength.Short}
        testID={testID}
      >
        {value}
      </SensitiveText>
    </Box>
  );
};

/**
 * Cross margin metrics shown under the perps balance: account ratio,
 * maintenance margin, account leverage and cross margin usage.
 */
const PerpsCrossMarginSummary: React.FC<PerpsCrossMarginSummaryProps> = ({
  accountRatio,
  maintenanceMargin,
  accountLeverage,
  crossMarginUsage,
  privacyMode,
  onInfoPress,
}) => (
  <Box
    twClassName="mx-4 mb-3 rounded-xl bg-muted p-4"
    gap={3}
    testID={PerpsBalanceBottomSheetSelectorsIDs.CROSS_MARGIN_SUMMARY}
  >
    <SummaryRow
      tooltipKey="account_ratio"
      value={
        accountRatio === undefined
          ? PERPS_CONSTANTS.FallbackDataDisplay
          : formatCrossMarginRatio(accountRatio)
      }
      valueColor={getToneColor(getCrossMarginRatioTone(accountRatio))}
      privacyMode={privacyMode}
      testID={PerpsBalanceBottomSheetSelectorsIDs.ACCOUNT_RATIO_VALUE}
      onInfoPress={onInfoPress}
    />
    <SummaryRow
      tooltipKey="maintenance_margin"
      value={
        maintenanceMargin === undefined
          ? PERPS_CONSTANTS.FallbackDataDisplay
          : formatPerpsFiat(maintenanceMargin)
      }
      valueColor={TextColor.TextDefault}
      privacyMode={privacyMode}
      testID={PerpsBalanceBottomSheetSelectorsIDs.MAINTENANCE_MARGIN_VALUE}
      onInfoPress={onInfoPress}
    />
    <SummaryRow
      tooltipKey="account_leverage"
      value={
        accountLeverage === undefined
          ? PERPS_CONSTANTS.FallbackDataDisplay
          : formatAccountLeverage(accountLeverage)
      }
      valueColor={TextColor.TextDefault}
      privacyMode={privacyMode}
      testID={PerpsBalanceBottomSheetSelectorsIDs.ACCOUNT_LEVERAGE_VALUE}
      onInfoPress={onInfoPress}
    />
    <SummaryRow
      tooltipKey="cross_margin_usage"
      value={
        crossMarginUsage === undefined
          ? PERPS_CONSTANTS.FallbackDataDisplay
          : formatCrossMarginRatio(crossMarginUsage)
      }
      valueColor={getToneColor(getCrossMarginRatioTone(crossMarginUsage))}
      privacyMode={privacyMode}
      testID={PerpsBalanceBottomSheetSelectorsIDs.CROSS_MARGIN_USAGE_VALUE}
      onInfoPress={onInfoPress}
    />
  </Box>
);

export default PerpsCrossMarginSummary;

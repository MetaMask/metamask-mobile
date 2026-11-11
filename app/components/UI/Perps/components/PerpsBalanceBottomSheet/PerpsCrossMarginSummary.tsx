import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PERPS_CONSTANTS,
  type PerpsAccountSummary,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import {
  formatCrossMarginRatio,
  formatLeverage,
  formatPerpsFiat,
} from '../../utils/formatUtils';
import {
  getCrossMarginRatioTone,
  type CrossMarginRatioTone,
} from '../../utils/crossMarginSummary';
import {
  getPerpsCrossMarginSummaryLabelSelector,
  PerpsBalanceBottomSheetSelectorsIDs,
} from '../../Perps.testIds';
import type { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';

export type PerpsCrossMarginSummaryTooltipKey = Extract<
  PerpsTooltipContentKey,
  | 'account_ratio'
  | 'maintenance_margin'
  | 'account_leverage'
  | 'cross_margin_usage'
>;

interface PerpsCrossMarginSummaryProps extends PerpsAccountSummary {
  privacyMode: boolean;
  onInfoPress: (key: PerpsCrossMarginSummaryTooltipKey) => void;
}

const TONE_COLOR: Record<CrossMarginRatioTone, TextColor> = {
  safe: TextColor.SuccessDefault,
  warning: TextColor.WarningDefault,
  danger: TextColor.ErrorDefault,
};

const getToneColor = (tone: CrossMarginRatioTone | undefined): TextColor =>
  tone ? TONE_COLOR[tone] : TextColor.TextDefault;

/** Spoken risk level. The visible cue is an icon, matching the design. */
const TONE_LABEL_KEY: Record<CrossMarginRatioTone, string> = {
  safe: 'perps.crossMarginSummary.tone_safe',
  warning: 'perps.crossMarginSummary.tone_warning',
  danger: 'perps.crossMarginSummary.tone_danger',
};

/**
 * Non-color cue for elevated risk. A safe value has no icon, which keeps it
 * as plain as the design shows it.
 */
const TONE_ICON: Partial<
  Record<CrossMarginRatioTone, { name: IconName; color: IconColor }>
> = {
  warning: { name: IconName.Warning, color: IconColor.WarningDefault },
  danger: { name: IconName.Danger, color: IconColor.ErrorDefault },
};

// `textDecorationStyle: 'dashed'` is iOS-only, so use the plain underline to
// render the same tappable affordance on both platforms.
const labelStyle = { textDecorationLine: 'underline' } as const;

const LABEL_HIT_SLOP = 8;

interface RowProps {
  tooltipKey: PerpsCrossMarginSummaryTooltipKey;
  value: string;
  /** Risk level, shown as color, an icon, and spoken so color is not the only signal. */
  tone?: CrossMarginRatioTone;
  privacyMode: boolean;
  testID: string;
  onInfoPress: (key: PerpsCrossMarginSummaryTooltipKey) => void;
}

const SummaryRow: React.FC<RowProps> = ({
  tooltipKey,
  value,
  tone,
  privacyMode,
  testID,
  onInfoPress,
}) => {
  const label = strings(`perps.crossMarginSummary.${tooltipKey}`);
  const toneLabel = tone ? strings(TONE_LABEL_KEY[tone]) : undefined;
  const toneIcon = tone ? TONE_ICON[tone] : undefined;
  // Privacy mode must not put the figure into the accessible name. The risk
  // word is not the balance, so it stays available to the screen reader.
  let valueAccessibilityLabel: string | undefined;
  if (toneLabel) {
    valueAccessibilityLabel = privacyMode
      ? toneLabel
      : `${value}, ${toneLabel}`;
  }
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
        hitSlop={LABEL_HIT_SLOP}
        testID={getPerpsCrossMarginSummaryLabelSelector(tooltipKey)}
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          style={labelStyle}
        >
          {label}
        </Text>
      </Pressable>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        accessible={Boolean(toneLabel)}
        accessibilityLabel={valueAccessibilityLabel}
      >
        {toneIcon ? (
          <Icon
            name={toneIcon.name}
            color={toneIcon.color}
            size={IconSize.Sm}
            testID={`${testID}-tone`}
          />
        ) : null}
        <SensitiveText
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={getToneColor(tone)}
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
          accessible={toneLabel ? false : undefined}
          testID={testID}
        >
          {value}
        </SensitiveText>
      </Box>
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
      tone={getCrossMarginRatioTone(accountRatio)}
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
      privacyMode={privacyMode}
      testID={PerpsBalanceBottomSheetSelectorsIDs.MAINTENANCE_MARGIN_VALUE}
      onInfoPress={onInfoPress}
    />
    <SummaryRow
      tooltipKey="account_leverage"
      value={
        accountLeverage === undefined
          ? PERPS_CONSTANTS.FallbackDataDisplay
          : formatLeverage(accountLeverage)
      }
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
      tone={getCrossMarginRatioTone(crossMarginUsage)}
      privacyMode={privacyMode}
      testID={PerpsBalanceBottomSheetSelectorsIDs.CROSS_MARGIN_USAGE_VALUE}
      onInfoPress={onInfoPress}
    />
  </Box>
);

export default PerpsCrossMarginSummary;

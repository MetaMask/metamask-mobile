import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { ImpactMoment, useHaptics } from '../../../../../../../util/haptics';
import { useQuickBuyContext } from '../useQuickBuyContext';
import {
  getBuyQuickAmounts,
  SELL_QUICK_PERCENTAGES,
} from '../utils/quickBuyQuickAmounts';

/**
 * Shared pill chrome.
 * ButtonSize.Md (40px) matches the Figma height; px-2 overrides the default
 * 16px horizontal padding so all four labels fit on one row without clipping.
 */
const QUICK_AMOUNT_PILL_PROPS = {
  variant: ButtonVariant.Secondary,
  size: ButtonSize.Md,
} as const;

const QUICK_AMOUNT_PILL_TW_CLASS = 'min-w-0 flex-1 px-2';

export interface QuickBuyQuickAmountsProps {
  /** When true, appends a primary Done pill (keyboard-open row above the keypad). */
  showDone?: boolean;
  onDonePress?: () => void;
}

const QuickBuyQuickAmounts: React.FC<QuickBuyQuickAmountsProps> = ({
  showDone = false,
  onDonePress,
}) => {
  const { playImpact } = useHaptics();
  const {
    tradeMode,
    currentCurrency,
    usdToCurrentCurrencyRate,
    hasSourcePrice,
    isSliderDisabled,
    handleQuickAmountPress,
    handleSliderChange,
    handleSliderDragEnd,
  } = useQuickBuyContext();

  const handleSellPercentPress = useCallback(
    (percent: number) => {
      playImpact(ImpactMoment.QuickAmountSelection);
      if (!hasSourcePrice) {
        handleSliderChange(percent);
        return;
      }
      handleSliderChange(percent);
      handleSliderDragEnd(percent);
    },
    [hasSourcePrice, handleSliderChange, handleSliderDragEnd, playImpact],
  );

  const handleBuyAmountPress = useCallback(
    (value: number, presetTierUsd: number) => {
      playImpact(ImpactMoment.QuickAmountSelection);
      handleQuickAmountPress(value, presetTierUsd);
    },
    [handleQuickAmountPress, playImpact],
  );

  const doneButton =
    showDone && onDonePress ? (
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Md}
        onPress={onDonePress}
        twClassName={QUICK_AMOUNT_PILL_TW_CLASS}
        testID="quick-buy-keypad-done"
      >
        Done
      </Button>
    ) : null;

  if (tradeMode === 'sell') {
    return (
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 py-1">
        {SELL_QUICK_PERCENTAGES.map((percent) => (
          <Button
            key={percent}
            {...QUICK_AMOUNT_PILL_PROPS}
            onPress={() => handleSellPercentPress(percent)}
            isDisabled={isSliderDisabled}
            twClassName={QUICK_AMOUNT_PILL_TW_CLASS}
            testID={`quick-buy-sell-pill-${percent}`}
          >
            {percent === 100
              ? strings('social_leaderboard.quick_buy.max')
              : `${percent}%`}
          </Button>
        ))}
        {doneButton}
      </Box>
    );
  }

  const buyAmounts = getBuyQuickAmounts(
    currentCurrency,
    usdToCurrentCurrencyRate,
  );

  return (
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 py-1">
      {buyAmounts.map((option) => (
        <Button
          key={option.presetTierUsd}
          {...QUICK_AMOUNT_PILL_PROPS}
          onPress={() =>
            handleBuyAmountPress(option.value, option.presetTierUsd)
          }
          isDisabled={isSliderDisabled}
          twClassName={QUICK_AMOUNT_PILL_TW_CLASS}
          testID={`quick-buy-buy-pill-${option.presetTierUsd}`}
        >
          {option.label}
        </Button>
      ))}
      {doneButton}
    </Box>
  );
};

export default QuickBuyQuickAmounts;

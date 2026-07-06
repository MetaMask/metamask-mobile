import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../../../../../component-library/components/Texts/Text';
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
  variant: ButtonVariants.Secondary,
  size: ButtonSize.Md,
  labelTextVariant: TextVariant.BodySMMedium,
} as const;

const QuickBuyQuickAmounts: React.FC = () => {
  const tw = useTailwind();
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
    (value: number) => {
      playImpact(ImpactMoment.QuickAmountSelection);
      handleQuickAmountPress(value);
    },
    [handleQuickAmountPress, playImpact],
  );

  if (tradeMode === 'sell') {
    return (
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 py-1">
        {SELL_QUICK_PERCENTAGES.map((percent) => (
          <Button
            key={percent}
            {...QUICK_AMOUNT_PILL_PROPS}
            label={
              percent === 100
                ? strings('social_leaderboard.quick_buy.max')
                : `${percent}%`
            }
            onPress={() => handleSellPercentPress(percent)}
            isDisabled={isSliderDisabled}
            style={tw.style('min-w-0 flex-1 px-2')}
            testID={`quick-buy-sell-pill-${percent}`}
          />
        ))}
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
          key={option.label}
          {...QUICK_AMOUNT_PILL_PROPS}
          label={option.label}
          onPress={() => handleBuyAmountPress(option.value)}
          isDisabled={isSliderDisabled}
          style={tw.style('min-w-0 flex-1 px-2')}
          testID={`quick-buy-buy-pill-${option.value}`}
        />
      ))}
    </Box>
  );
};

export default QuickBuyQuickAmounts;

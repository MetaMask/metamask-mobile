import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo } from 'react';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../../locales/i18n';
import { ImpactMoment, useHaptics } from '../../../../../../../util/haptics';
import { useQuickBuyContext } from '../useQuickBuyContext';
import {
  resolveBuyQuickAmounts,
  resolveSellQuickPercentages,
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
    buyQuickAmounts,
    sellQuickPercentages,
    hasSourcePrice,
    isSliderDisabled,
    handleQuickAmountPress,
    handleSliderChange,
    handleSliderDragEnd,
  } = useQuickBuyContext();

  const buyAmounts = useMemo(
    () => resolveBuyQuickAmounts(buyQuickAmounts, currentCurrency),
    [buyQuickAmounts, currentCurrency],
  );

  const sellAmounts = useMemo(
    () =>
      resolveSellQuickPercentages(
        sellQuickPercentages,
        strings('social_leaderboard.quick_buy.max'),
      ),
    [sellQuickPercentages],
  );

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
    (value: number, presetValue: number) => {
      playImpact(ImpactMoment.QuickAmountSelection);
      handleQuickAmountPress(value, presetValue);
    },
    [handleQuickAmountPress, playImpact],
  );

  if (tradeMode === 'sell') {
    return (
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 py-1">
        {sellAmounts.map((option) => (
          <Button
            key={option.percent}
            {...QUICK_AMOUNT_PILL_PROPS}
            label={option.label}
            onPress={() => handleSellPercentPress(option.percent)}
            isDisabled={isSliderDisabled}
            style={tw.style('min-w-0 flex-1 px-2')}
            testID={`quick-buy-sell-pill-${option.percent}`}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 py-1">
      {buyAmounts.map((option, index) => (
        <Button
          key={`${option.presetValue}-${index}`}
          {...QUICK_AMOUNT_PILL_PROPS}
          label={option.label}
          onPress={() => handleBuyAmountPress(option.value, option.presetValue)}
          isDisabled={isSliderDisabled}
          style={tw.style('min-w-0 flex-1 px-2')}
          testID={`quick-buy-buy-pill-${option.presetValue}`}
        />
      ))}
    </Box>
  );
};

export default QuickBuyQuickAmounts;

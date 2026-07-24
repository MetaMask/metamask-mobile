import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo } from 'react';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import { Skeleton } from '../../../../../../../component-library/components-temp/Skeleton';
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

const QUICK_AMOUNT_PILL_COUNT = 4;

const QUICK_AMOUNT_PILL_SKELETON_LABEL = 'quick-buy-quick-amount-pill-skeleton';

const QuickBuyQuickAmounts: React.FC = () => {
  const tw = useTailwind();
  const { playImpact } = useHaptics();
  const {
    tradeMode,
    currentCurrency,
    buyQuickAmounts,
    sellQuickPercentages,
    isQuickAmountPreferencesLoaded,
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

  const renderPillSkeletonLabel = () => (
    <Skeleton
      width={32}
      height={14}
      style={tw.style('rounded-sm')}
      testID={QUICK_AMOUNT_PILL_SKELETON_LABEL}
    />
  );

  if (!isQuickAmountPreferencesLoaded) {
    const loadingTestIdPrefix =
      tradeMode === 'sell'
        ? 'quick-buy-sell-pill-loading'
        : 'quick-buy-buy-pill-loading';

    return (
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 py-1">
        {Array.from({ length: QUICK_AMOUNT_PILL_COUNT }, (_, index) => (
          <Button
            key={index}
            {...QUICK_AMOUNT_PILL_PROPS}
            label={renderPillSkeletonLabel()}
            onPress={() => undefined}
            isDisabled
            style={tw.style('min-w-0 flex-1 px-2')}
            testID={`${loadingTestIdPrefix}-${index}`}
          />
        ))}
      </Box>
    );
  }

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

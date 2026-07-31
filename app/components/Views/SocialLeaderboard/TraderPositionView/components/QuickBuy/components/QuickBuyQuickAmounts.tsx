import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo } from 'react';
import { Skeleton } from '../../../../../../../component-library/components-temp/Skeleton';
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
  variant: ButtonVariant.Secondary,
  size: ButtonSize.Md,
} as const;

const QUICK_AMOUNT_PILL_TW_CLASS = 'min-w-0 flex-1 px-2';
const QUICK_AMOUNT_PILL_COUNT = 4;
const QUICK_AMOUNT_PILL_SKELETON_LABEL = 'quick-buy-quick-amount-pill-skeleton';

export interface QuickBuyQuickAmountsProps {
  /** When true, appends a primary Done pill (keyboard-open row above the keypad). */
  showDone?: boolean;
  onDonePress?: () => void;
}

const QuickBuyQuickAmounts: React.FC<QuickBuyQuickAmountsProps> = ({
  showDone = false,
  onDonePress,
}) => {
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
    useKeyboard,
    setIsKeypadOpen,
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

  // Selecting a preset amount commits the value and dismisses the keypad on the
  // keyboard treatment. The keypad only returns when the user taps the amount
  // headline (see QuickBuyAmount).
  const dismissKeypadIfNeeded = useCallback(() => {
    if (useKeyboard) {
      setIsKeypadOpen(false);
    }
  }, [setIsKeypadOpen, useKeyboard]);

  const handleSellPercentPress = useCallback(
    (percent: number) => {
      playImpact(ImpactMoment.QuickAmountSelection);
      dismissKeypadIfNeeded();
      if (!hasSourcePrice) {
        handleSliderChange(percent);
        return;
      }
      handleSliderChange(percent);
      handleSliderDragEnd(percent);
    },
    [
      dismissKeypadIfNeeded,
      hasSourcePrice,
      handleSliderChange,
      handleSliderDragEnd,
      playImpact,
    ],
  );

  const handleBuyAmountPress = useCallback(
    (value: number, presetValue: number) => {
      playImpact(ImpactMoment.QuickAmountSelection);
      dismissKeypadIfNeeded();
      handleQuickAmountPress(value, presetValue);
    },
    [dismissKeypadIfNeeded, handleQuickAmountPress, playImpact],
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
            onPress={() => undefined}
            isDisabled
            twClassName={QUICK_AMOUNT_PILL_TW_CLASS}
            testID={`${loadingTestIdPrefix}-${index}`}
          >
            {renderPillSkeletonLabel()}
          </Button>
        ))}
        {doneButton}
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
            onPress={() => handleSellPercentPress(option.percent)}
            isDisabled={isSliderDisabled}
            twClassName={QUICK_AMOUNT_PILL_TW_CLASS}
            testID={`quick-buy-sell-pill-${option.percent}`}
          >
            {option.label}
          </Button>
        ))}
        {doneButton}
      </Box>
    );
  }

  return (
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 py-1">
      {buyAmounts.map((option, index) => (
        <Button
          key={`${option.presetValue}-${index}`}
          {...QUICK_AMOUNT_PILL_PROPS}
          onPress={() => handleBuyAmountPress(option.value, option.presetValue)}
          isDisabled={isSliderDisabled}
          twClassName={QUICK_AMOUNT_PILL_TW_CLASS}
          testID={`quick-buy-buy-pill-${option.presetValue}`}
        >
          {option.label}
        </Button>
      ))}
      {doneButton}
    </Box>
  );
};

export default QuickBuyQuickAmounts;

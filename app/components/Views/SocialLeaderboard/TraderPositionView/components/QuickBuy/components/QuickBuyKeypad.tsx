import { AnimationDuration } from '@metamask/design-tokens';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import Keypad, { type KeypadChangeData } from '../../../../../../Base/Keypad';
import { useQuickBuyContext } from '../useQuickBuyContext';
import QuickBuyQuickAmounts from './QuickBuyQuickAmounts';

// Priced flows type fiat, capped to 2 decimals with a "." separator (matching
// the normalized `fiatAmount` string). Unpriced sell flows type a token amount,
// so the separator-only "native" rule allows the full precision — the
// controller's `handleAmountChange` enforces the token's own decimal cap.
const PRICED_KEYPAD_CURRENCY = 'USD';
const UNPRICED_KEYPAD_CURRENCY = 'native';

const KEYPAD_ANIM_DURATION = AnimationDuration.Fast;

/**
 * Numeric keypad for the Quick Buy keyboard A/B treatment. When open, renders
 * quick-amount pills + Done above the shared `Base/Keypad`. Pay with / CTA are
 * collapsed in the footer while this is visible.
 */
const QuickBuyKeypad: React.FC = () => {
  const tw = useTailwind();
  const {
    useKeyboard,
    isKeypadOpen,
    hasSourcePrice,
    fiatAmount,
    sourceAmountTokens,
    handleAmountChange,
    setIsKeypadOpen,
    features,
  } = useQuickBuyContext();

  const handleChange = useCallback(
    ({ value }: KeypadChangeData) => {
      handleAmountChange(value);
    },
    [handleAmountChange],
  );

  const handleDonePress = useCallback(() => {
    const amount = hasSourcePrice ? fiatAmount : sourceAmountTokens;
    if (amount.endsWith('.')) {
      handleAmountChange(amount.slice(0, -1));
    }
    setIsKeypadOpen(false);
  }, [
    fiatAmount,
    handleAmountChange,
    hasSourcePrice,
    setIsKeypadOpen,
    sourceAmountTokens,
  ]);

  if (!useKeyboard || !isKeypadOpen) {
    return null;
  }

  const value = hasSourcePrice ? fiatAmount : sourceAmountTokens;
  const currency = hasSourcePrice
    ? PRICED_KEYPAD_CURRENCY
    : UNPRICED_KEYPAD_CURRENCY;

  return (
    <Animated.View
      entering={SlideInDown.duration(KEYPAD_ANIM_DURATION)}
      exiting={SlideOutDown.duration(KEYPAD_ANIM_DURATION)}
    >
      {features.quickAmountPills ? (
        <Animated.View
          layout={LinearTransition.duration(KEYPAD_ANIM_DURATION)}
          style={tw.style('px-4 pt-1')}
        >
          <QuickBuyQuickAmounts showDone onDonePress={handleDonePress} />
        </Animated.View>
      ) : null}
      <Box twClassName="px-4 py-4" testID="quick-buy-keypad">
        <Keypad value={value} onChange={handleChange} currency={currency} />
      </Box>
    </Animated.View>
  );
};

export default QuickBuyKeypad;

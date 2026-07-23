import { AnimationDuration } from '@metamask/design-tokens';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo } from 'react';
import Animated, {
  LinearTransition,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import Keypad, { type KeypadChangeData } from '../../../../../../Base/Keypad';
import useCurrency from '../../../../../../Base/Keypad/useCurrency';
import { useQuickBuyContext } from '../useQuickBuyContext';
import QuickBuyQuickAmounts from './QuickBuyQuickAmounts';

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
    currentCurrency,
    fiatAmount,
    sourceAmountTokens,
    handleAmountChange,
    setIsKeypadOpen,
    features,
  } = useQuickBuyContext();

  const keypadCurrency = hasSourcePrice
    ? currentCurrency
    : UNPRICED_KEYPAD_CURRENCY;
  const { decimalSeparator } = useCurrency(keypadCurrency);

  const internalAmount = hasSourcePrice ? fiatAmount : sourceAmountTokens;
  const keypadValue = useMemo(() => {
    if (!decimalSeparator || !internalAmount.includes('.')) {
      return internalAmount;
    }
    return internalAmount.replace('.', decimalSeparator);
  }, [decimalSeparator, internalAmount]);

  const handleChange = useCallback(
    ({ value }: KeypadChangeData) => {
      handleAmountChange(value);
    },
    [handleAmountChange],
  );

  const handleDonePress = useCallback(() => {
    const amount = hasSourcePrice ? fiatAmount : sourceAmountTokens;
    // `fiatAmount` is normalized to "." in the controller; unpriced token
    // amounts use the native keypad rule (also ".").
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
        <Keypad
          value={keypadValue}
          onChange={handleChange}
          currency={keypadCurrency}
        />
      </Box>
    </Animated.View>
  );
};

export default QuickBuyKeypad;

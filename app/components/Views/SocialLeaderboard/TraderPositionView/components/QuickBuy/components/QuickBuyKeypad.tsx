import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Keypad, { type KeypadChangeData } from '../../../../../../Base/Keypad';
import useCurrency from '../../../../../../Base/Keypad/useCurrency';
import { useQuickBuyContext } from '../useQuickBuyContext';
import CollapsibleReveal from './CollapsibleReveal';
import QuickBuyQuickAmounts from './QuickBuyQuickAmounts';

const UNPRICED_KEYPAD_CURRENCY = 'native';

/**
 * Numeric keypad for the Quick Buy keyboard A/B treatment. When open, renders
 * quick-amount pills + Done above the shared `Base/Keypad`. Pay with / CTA are
 * collapsed in the footer while this is visible.
 *
 * Height is animated via CollapsibleReveal (same curve as the footer collapse)
 * so the bottom-anchored sheet lerps between closed and open height — no dip.
 * Mount is deferred until the first open so the sheet open animation isn't
 * competing with keypad layout work.
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

  // Defer mounting until the first open so flash-icon sheet open stays smooth.
  // After that, stay mounted (height 0) to keep expand/collapse in sync with footer.
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  useEffect(() => {
    if (isKeypadOpen) {
      setHasOpenedOnce(true);
    }
  }, [isKeypadOpen]);

  const keypadCurrency = hasSourcePrice
    ? currentCurrency
    : UNPRICED_KEYPAD_CURRENCY;
  const { decimalSeparator } = useCurrency(keypadCurrency);

  const internalAmount =
    (hasSourcePrice ? fiatAmount : sourceAmountTokens) ?? '';
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
    const amount = (hasSourcePrice ? fiatAmount : sourceAmountTokens) ?? '';
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

  if (!useKeyboard || (!hasOpenedOnce && !isKeypadOpen)) {
    return null;
  }

  return (
    <CollapsibleReveal
      expanded={isKeypadOpen}
      snapExpandedOnMount={false}
      unmountWhenCollapsed={false}
      testID="quick-buy-keypad-reveal"
    >
      {features.quickAmountPills ? (
        <View style={tw.style('px-4 pt-1')}>
          <QuickBuyQuickAmounts showDone onDonePress={handleDonePress} />
        </View>
      ) : null}
      <Box twClassName="px-4 py-4" testID="quick-buy-keypad">
        <Keypad
          value={keypadValue}
          onChange={handleChange}
          currency={keypadCurrency}
        />
      </Box>
    </CollapsibleReveal>
  );
};

export default QuickBuyKeypad;

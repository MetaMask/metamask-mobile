import { Box } from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Keypad, { type KeypadChangeData } from '../../../Base/Keypad';
import useCurrency from '../../../Base/Keypad/useCurrency';
import { useQuickBuyContext } from '../useQuickBuyContext';
import CollapsibleReveal from './CollapsibleReveal';

const UNPRICED_KEYPAD_CURRENCY = 'native';

/**
 * Numeric keypad for Quick Buy amount entry. Opens by default with the amount
 * footer still visible (taller sheet). Quick-amount pills live in the footer
 * above Pay with / Total / CTA — not duplicated here.
 *
 * Height is animated via CollapsibleReveal so the bottom-anchored sheet can
 * still lerp if the keypad is dismissed. Mount is deferred until the first
 * open so the sheet open animation isn't competing with keypad layout work.
 */
const QuickBuyKeypad: React.FC = () => {
  const {
    isKeypadOpen,
    hasSourcePrice,
    currentCurrency,
    fiatAmount,
    sourceAmountTokens,
    handleAmountChange,
  } = useQuickBuyContext();

  // Defer mounting until the first open so flash-icon sheet open stays smooth.
  // After that, stay mounted (height 0) to keep expand/collapse available.
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

  if (!hasOpenedOnce && !isKeypadOpen) {
    return null;
  }

  return (
    <CollapsibleReveal
      expanded={isKeypadOpen}
      snapExpandedOnMount
      unmountWhenCollapsed={false}
      testID="quick-buy-keypad-reveal"
    >
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

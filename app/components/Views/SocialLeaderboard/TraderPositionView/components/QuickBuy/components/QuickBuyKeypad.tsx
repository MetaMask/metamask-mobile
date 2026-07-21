import { Box } from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import Keypad, { type KeypadChangeData } from '../../../../../../Base/Keypad';
import { useQuickBuyContext } from '../useQuickBuyContext';

// Priced flows type fiat, capped to 2 decimals with a "." separator (matching
// the normalized `fiatAmount` string). Unpriced sell flows type a token amount,
// so the separator-only "native" rule allows the full precision — the
// controller's `handleAmountChange` enforces the token's own decimal cap.
const PRICED_KEYPAD_CURRENCY = 'USD';
const UNPRICED_KEYPAD_CURRENCY = 'native';

/**
 * Numeric keypad for the Quick Buy keyboard A/B treatment. Mirrors Predict's
 * sheet-mode keypad: a bottom sibling that reuses the shared `Base/Keypad` and
 * feeds keystrokes into the controller's `handleAmountChange` (which owns the
 * priced/unpriced routing, decimal caps, and debounced quote fetching).
 *
 * Renders nothing when the keypad is dismissed or when the slider control
 * variant is active.
 */
const QuickBuyKeypad: React.FC = () => {
  const {
    useKeyboard,
    isKeypadOpen,
    hasSourcePrice,
    fiatAmount,
    sourceAmountTokens,
    handleAmountChange,
  } = useQuickBuyContext();

  const handleChange = useCallback(
    ({ value }: KeypadChangeData) => {
      handleAmountChange(value);
    },
    [handleAmountChange],
  );

  if (!useKeyboard || !isKeypadOpen) {
    return null;
  }

  const value = hasSourcePrice ? fiatAmount : sourceAmountTokens;
  const currency = hasSourcePrice
    ? PRICED_KEYPAD_CURRENCY
    : UNPRICED_KEYPAD_CURRENCY;

  return (
    <Box twClassName="px-4 py-4" testID="quick-buy-keypad">
      <Keypad value={value} onChange={handleChange} currency={currency} />
    </Box>
  );
};

export default QuickBuyKeypad;

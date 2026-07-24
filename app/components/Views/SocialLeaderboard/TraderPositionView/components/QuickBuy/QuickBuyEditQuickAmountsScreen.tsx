import {
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import KeypadComponent from '../../../../../Base/Keypad';
import CollapsibleReveal from './components/CollapsibleReveal';
import QuickBuySubScreenHeader from './components/QuickBuySubScreenHeader';
import QuickBuyEditAmountRow from './components/QuickBuyEditAmountRow';
import { useQuickBuyEditAmountsForm } from './hooks/useQuickBuyEditAmountsForm';
import { useQuickBuyContext } from './useQuickBuyContext';

const QuickBuyEditQuickAmountsScreen: React.FC = () => {
  const {
    currentCurrency,
    buyQuickAmounts,
    sellQuickPercentages,
    saveQuickAmountPreferences,
    setActiveScreen,
    onClose,
  } = useQuickBuyContext();

  const {
    buyValues,
    sellValues,
    buyErrors,
    sellErrors,
    focusedField,
    focusedValue,
    isValid,
    handleFieldPress,
    handleKeypadChange,
    handleConfirm,
  } = useQuickBuyEditAmountsForm(buyQuickAmounts, sellQuickPercentages);

  const isKeypadOpen = Boolean(focusedField);

  // Defer keypad mount until first open so the sheet open animation stays smooth.
  const [hasOpenedKeypadOnce, setHasOpenedKeypadOnce] = useState(false);
  useEffect(() => {
    if (isKeypadOpen) {
      setHasOpenedKeypadOnce(true);
    }
  }, [isKeypadOpen]);

  const handleBack = useCallback(
    () => setActiveScreen('amount'),
    [setActiveScreen],
  );

  const handleSave = useCallback(async () => {
    const next = handleConfirm();
    if (!next) {
      return;
    }

    await saveQuickAmountPreferences(next);
    setActiveScreen('amount');
  }, [handleConfirm, saveQuickAmountPreferences, setActiveScreen]);

  const keypadCurrency =
    focusedField?.kind === 'sell' ? 'native' : currentCurrency;
  const keypadDecimals = focusedField?.kind === 'sell' ? 0 : undefined;

  return (
    <Box>
      <QuickBuySubScreenHeader
        title={strings('social_leaderboard.quick_buy.edit_quick_amounts_title')}
        onBack={handleBack}
        onClose={onClose}
      />

      <Box twClassName="gap-2 px-4">
        <QuickBuyEditAmountRow
          label={strings(
            'social_leaderboard.quick_buy.edit_quick_amounts_set_buy',
          )}
          kind="buy"
          values={buyValues}
          errors={buyErrors}
          focusedField={focusedField}
          currentCurrency={currentCurrency}
          onFieldPress={(index) => handleFieldPress('buy', index)}
        />

        <QuickBuyEditAmountRow
          label={strings(
            'social_leaderboard.quick_buy.edit_quick_amounts_set_sell',
          )}
          kind="sell"
          values={sellValues}
          errors={sellErrors}
          focusedField={focusedField}
          currentCurrency={currentCurrency}
          onFieldPress={(index) => handleFieldPress('sell', index)}
        />
      </Box>

      <Box twClassName="px-4 pt-1 pb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonBaseSize.Lg}
          isFullWidth
          isDisabled={!isValid}
          onPress={handleSave}
          testID="quick-buy-edit-amounts-confirm"
        >
          {strings('social_leaderboard.quick_buy.edit_quick_amounts_confirm')}
        </Button>
      </Box>

      {hasOpenedKeypadOnce || isKeypadOpen ? (
        <CollapsibleReveal
          expanded={isKeypadOpen}
          snapExpandedOnMount={false}
          unmountWhenCollapsed={false}
          testID="quick-buy-edit-amounts-keypad-reveal"
        >
          <Box twClassName="px-4 pb-4" testID="quick-buy-edit-amounts-keypad">
            <KeypadComponent
              value={focusedValue}
              onChange={handleKeypadChange}
              currency={keypadCurrency}
              decimals={keypadDecimals}
            />
          </Box>
        </CollapsibleReveal>
      ) : null}
    </Box>
  );
};

export default QuickBuyEditQuickAmountsScreen;

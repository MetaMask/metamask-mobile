import {
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo } from 'react';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../../locales/i18n';
import KeypadComponent from '../../../../../Base/Keypad';
import QuickBuySubScreenHeader from './components/QuickBuySubScreenHeader';
import QuickBuyEditAmountRow from './components/QuickBuyEditAmountRow';
import { useQuickBuyEditAmountsForm } from './hooks/useQuickBuyEditAmountsForm';
import { useQuickBuyContext } from './useQuickBuyContext';

const QuickBuyEditQuickAmountsScreen: React.FC = () => {
  const tw = useTailwind();
  const {
    currentCurrency,
    usdToCurrentCurrencyRate,
    buyQuickAmounts,
    sellQuickPercentages,
    isQuickAmountPreferencesLoaded,
    saveQuickAmountPreferences,
    setActiveScreen,
    onClose,
  } = useQuickBuyContext();

  const validationContext = useMemo(
    () => ({
      currency: currentCurrency,
      usdToCurrentCurrencyRate,
    }),
    [currentCurrency, usdToCurrentCurrencyRate],
  );

  const {
    buyValues,
    sellValues,
    buyErrors,
    sellErrors,
    focusedField,
    keypadValue,
    isValid,
    handleFieldPress,
    handleKeypadChange,
    handleConfirm,
  } = useQuickBuyEditAmountsForm(
    buyQuickAmounts,
    sellQuickPercentages,
    isQuickAmountPreferencesLoaded,
    validationContext,
  );

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
    focusedField.kind === 'sell' ? 'native' : currentCurrency;
  const keypadDecimals = focusedField.kind === 'sell' ? 0 : undefined;

  return (
    <Box twClassName="flex-1">
      <QuickBuySubScreenHeader
        title={strings('social_leaderboard.quick_buy.edit_quick_amounts_title')}
        onBack={handleBack}
        onClose={onClose}
      />

      <GestureHandlerScrollView
        style={tw.style('flex-1')}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="quick-buy-edit-amounts-scroll"
      >
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
            validationContext={validationContext}
            onFieldPress={(index) => handleFieldPress('buy', index)}
          />

          <Box twClassName="pb-3">
            <QuickBuyEditAmountRow
              label={strings(
                'social_leaderboard.quick_buy.edit_quick_amounts_set_sell',
              )}
              kind="sell"
              values={sellValues}
              errors={sellErrors}
              focusedField={focusedField}
              currentCurrency={currentCurrency}
              validationContext={validationContext}
              onFieldPress={(index) => handleFieldPress('sell', index)}
            />
          </Box>
        </Box>
      </GestureHandlerScrollView>

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

      <Box twClassName="px-4 pt-3 pb-4" testID="quick-buy-edit-amounts-keypad">
        <KeypadComponent
          value={keypadValue}
          onChange={handleKeypadChange}
          currency={keypadCurrency}
          decimals={keypadDecimals}
        />
      </Box>
    </Box>
  );
};

export default QuickBuyEditQuickAmountsScreen;

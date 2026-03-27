import React, { useCallback, useMemo } from 'react';
import { QuickPickButtonOption } from '../SwapsKeypad/types';
import { QuickPickButtons } from '../SwapsKeypad/QuickPickButtons';
import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
import { KeypadChangeData, Keys } from '../../../../Base/Keypad';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { BridgeToken } from '../../types';
import { BigNumber } from 'bignumber.js';
import { useABTest } from '../../../../../hooks';
import {
  NUMPAD_QUICK_ACTIONS_NO_MAX_VARIANTS,
  NUMPAD_QUICK_ACTIONS_AB_KEY,
  NUMPAD_QUICK_ACTIONS_VARIANTS,
  NumpadQuickActionsVariant,
} from './abTestConfig';
import { useTrackInputAmountChange } from './useTrackInputAmountChange';

interface GaslessQuickPickOptionsProps {
  token?: BridgeToken;
  onMaxPress: () => void;
  onChange: (data: KeypadChangeData) => void;
  isQuoteSponsored?: boolean;
}

export const GaslessQuickPickOptions = ({
  onChange,
  onMaxPress,
  token,
  isQuoteSponsored,
}: GaslessQuickPickOptionsProps) => {
  const tokenBalance = useLatestBalance({
    address: token?.address,
    decimals: token?.decimals,
    chainId: token?.chainId,
  });
  const { variantName } = useABTest(
    NUMPAD_QUICK_ACTIONS_AB_KEY,
    NUMPAD_QUICK_ACTIONS_VARIANTS,
  );
  const selectedVariant =
    variantName === NumpadQuickActionsVariant.Treatment
      ? NumpadQuickActionsVariant.Treatment
      : NumpadQuickActionsVariant.Control;
  const trackInputAmountChange = useTrackInputAmountChange();

  const onQuickOptionPress = useCallback(
    (percentage: number) => () => {
      if (!tokenBalance?.displayBalance) return '0';

      const balance = new BigNumber(tokenBalance.displayBalance);
      const amount = balance
        .multipliedBy(percentage / 100)
        .decimalPlaces(token?.decimals ?? 18, BigNumber.ROUND_DOWN);

      onChange({
        value: amount.toString(),
        valueAsNumber: Number(amount),
        pressedKey: Keys.Initial,
      });

      const preset = `${percentage}%`;
      trackInputAmountChange({ inputValue: amount.toString(), preset });
    },
    [tokenBalance, token?.decimals, onChange, trackInputAmountChange],
  );

  const handleTrackedMaxPress = useCallback(() => {
    onMaxPress();
    trackInputAmountChange({ inputValue: '', preset: 'MAX' });
  }, [onMaxPress, trackInputAmountChange]);

  const shouldRenderMaxOption = useShouldRenderMaxOption(
    token,
    tokenBalance?.displayBalance,
    isQuoteSponsored,
  );

  const quickPickOptions = useMemo(() => {
    const quickActions = shouldRenderMaxOption
      ? NUMPAD_QUICK_ACTIONS_VARIANTS[selectedVariant]
      : NUMPAD_QUICK_ACTIONS_NO_MAX_VARIANTS[selectedVariant];
    return quickActions.map((action) => {
      if (action === 'MAX') {
        return {
          label: 'Max',
          onPress: handleTrackedMaxPress,
        };
      }

      return {
        label: `${action}%`,
        onPress: onQuickOptionPress(action),
      };
    }) satisfies QuickPickButtonOption[];
  }, [
    handleTrackedMaxPress,
    onQuickOptionPress,
    shouldRenderMaxOption,
    selectedVariant,
  ]);

  return <QuickPickButtons options={quickPickOptions} show />;
};

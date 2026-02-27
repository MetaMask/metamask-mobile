import React, { useCallback, useMemo } from 'react';
import { QuickPickButtonOption } from '../SwapsKeypad/types';
import { QuickPickButtons } from '../SwapsKeypad/QuickPickButtons';
import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
import { KeypadChangeData, Keys } from '../../../../Base/Keypad';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { BridgeToken } from '../../types';
import { BigNumber } from 'bignumber.js';
import { useABTest } from '../../../../../hooks';
import Engine from '../../../../../core/Engine';
import { UnifiedSwapBridgeEventName } from '@metamask/bridge-controller';
import {
  NUMPAD_QUICK_ACTIONS_AB_KEY,
  NUMPAD_QUICK_ACTIONS_VARIANTS,
  NumpadQuickAction,
  NumpadQuickActionsVariant,
} from './abTestConfig';

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
  const { variant, variantName, isActive } = useABTest(
    NUMPAD_QUICK_ACTIONS_AB_KEY,
    NUMPAD_QUICK_ACTIONS_VARIANTS,
  );

  const selectedVariant = variantName as NumpadQuickActionsVariant;

  const trackInputAmountChange = useCallback(
    ({ inputValue, preset }: { inputValue: string; preset?: string }) => {
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        UnifiedSwapBridgeEventName.InputChanged,
        {
          input: 'token_amount_source',
          input_value: inputValue,
          ...(preset && { input_amount_preset: preset }),
          ...(isActive && {
            ab_tests: {
              [NUMPAD_QUICK_ACTIONS_AB_KEY]: variantName,
            },
          }),
        },
      );
    },
    [isActive, variantName],
  );

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

  const fallbackQuickActions = useMemo(
    (): number[] =>
      selectedVariant === 'treatment' ? [50, 75, 85, 95] : [25, 50, 75, 90],
    [selectedVariant],
  );

  const maxAllowedQuickActions = variant as readonly NumpadQuickAction[];

  const shouldRenderMaxOption = useShouldRenderMaxOption(
    token,
    tokenBalance?.displayBalance,
    isQuoteSponsored,
  );

  const quickActions = useMemo(
    (): readonly NumpadQuickAction[] | number[] =>
      shouldRenderMaxOption ? maxAllowedQuickActions : fallbackQuickActions,
    [fallbackQuickActions, maxAllowedQuickActions, shouldRenderMaxOption],
  );

  const quickPickOptions = useMemo(
    () =>
      quickActions.map((action) => {
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
      }) satisfies QuickPickButtonOption[],
    [handleTrackedMaxPress, onQuickOptionPress, quickActions],
  );

  return <QuickPickButtons options={quickPickOptions} show />;
};

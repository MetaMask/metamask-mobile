import React, { useCallback, useMemo } from 'react';
import { UnifiedSwapBridgeEventName } from '@metamask/bridge-controller';
import { QuickPickButtonOption } from '../SwapsKeypad/types';
import { QuickPickButtons } from '../SwapsKeypad/QuickPickButtons';
import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
import { BridgeToken } from '../../types';
import { BigNumber } from 'bignumber.js';
import { useABTest } from '../../../../../hooks';
import Engine from '../../../../../core/Engine';
import {
  NUMPAD_QUICK_ACTIONS_NO_MAX_VARIANTS,
  NUMPAD_QUICK_ACTIONS_AB_KEY,
  NUMPAD_QUICK_ACTIONS_VARIANTS,
  NumpadQuickActionsVariant,
} from './abTestConfig';

interface GaslessQuickPickOptionsProps {
  token?: BridgeToken;
  tokenBalance?: string;
  onMaxPress: () => void;
  onAmountSelect: (value: string) => void;
  isQuoteSponsored?: boolean;
}

export const GaslessQuickPickOptions = ({
  onAmountSelect,
  onMaxPress,
  token,
  tokenBalance,
  isQuoteSponsored,
}: GaslessQuickPickOptionsProps) => {
  const { variantName, isActive } = useABTest(
    NUMPAD_QUICK_ACTIONS_AB_KEY,
    NUMPAD_QUICK_ACTIONS_VARIANTS,
  );
  const selectedVariant =
    variantName === NumpadQuickActionsVariant.Treatment
      ? NumpadQuickActionsVariant.Treatment
      : NumpadQuickActionsVariant.Control;
  const trackInputAmountChange = useCallback(
    ({ inputValue, preset }: { inputValue: string; preset?: string }) => {
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        UnifiedSwapBridgeEventName.InputChanged,
        {
          input: 'token_amount_source',
          input_value: inputValue,
          ...(preset && { input_amount_preset: preset }),
          // This Bridge-specific event bypasses the shared analytics wrappers,
          // so its A/B context still needs to be attached manually here.
          ...(isActive && {
            active_ab_tests: [
              {
                key: NUMPAD_QUICK_ACTIONS_AB_KEY,
                value: variantName,
              },
            ],
          }),
        },
      );
    },
    [isActive, variantName],
  );

  const onQuickOptionPress = useCallback(
    (percentage: number) => () => {
      if (!tokenBalance) {
        return;
      }

      const balance = new BigNumber(tokenBalance);
      const amount = balance
        .multipliedBy(percentage / 100)
        .decimalPlaces(token?.decimals ?? 18, BigNumber.ROUND_DOWN);

      onAmountSelect(amount.toString());

      const preset = `${percentage}%`;
      trackInputAmountChange({ inputValue: amount.toString(), preset });
    },
    [tokenBalance, token?.decimals, onAmountSelect, trackInputAmountChange],
  );

  const handleTrackedMaxPress = useCallback(() => {
    onMaxPress();
    trackInputAmountChange({ inputValue: '', preset: 'MAX' });
  }, [onMaxPress, trackInputAmountChange]);

  const shouldRenderMaxOption = useShouldRenderMaxOption(
    token,
    tokenBalance,
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

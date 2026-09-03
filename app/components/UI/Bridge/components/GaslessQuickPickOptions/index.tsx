import React, { useCallback, useMemo } from 'react';
import {
  FeatureId,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import { QuickPickButtonOption } from '../SwapsKeypad/types';
import { QuickPickButtons } from '../SwapsKeypad/QuickPickButtons';
import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
import { BridgeToken } from '../../types';
import { BigNumber } from 'bignumber.js';
import Engine from '../../../../../core/Engine';

const QUICK_PICK_ACTIONS = [25, 50, 75, 'MAX'] as const;
const QUICK_PICK_ACTIONS_WITHOUT_MAX = [25, 50, 75, 90] as const;

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
  const trackInputAmountChange = useCallback(
    ({ inputValue, preset }: { inputValue: string; preset?: string }) => {
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        UnifiedSwapBridgeEventName.InputChanged,
        {
          input: 'token_amount_source',
          input_value: inputValue,
          feature_id: FeatureId.UNIFIED_SWAP_BRIDGE,
          ...(preset && { input_amount_preset: preset }),
        },
      );
    },
    [],
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
      ? QUICK_PICK_ACTIONS
      : QUICK_PICK_ACTIONS_WITHOUT_MAX;
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
  }, [handleTrackedMaxPress, onQuickOptionPress, shouldRenderMaxOption]);

  return <QuickPickButtons options={quickPickOptions} show />;
};

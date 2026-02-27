import React, { useCallback, useMemo } from 'react';
import { QuickPickButtonOption } from '../SwapsKeypad/types';
import { QuickPickButtons } from '../SwapsKeypad/QuickPickButtons';
import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
import { KeypadChangeData, Keys } from '../../../../Base/Keypad';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { BridgeToken } from '../../types';
import { BigNumber } from 'bignumber.js';
import Engine from '../../../../../core/Engine';
import {
  InputAmountPreset,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import { PERCENTAGE_TO_PRESET } from './constants';

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

  const trackInputAmountPreset = useCallback((preset: InputAmountPreset) => {
    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      UnifiedSwapBridgeEventName.InputChanged,
      {
        input: 'token_amount_source',
        input_value: '',
        input_amount_preset: preset,
      },
    );
  }, []);

  const onQuickOptionPress = useCallback(
    (percentage: keyof typeof PERCENTAGE_TO_PRESET) => () => {
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

      const preset = PERCENTAGE_TO_PRESET[percentage];
      if (preset) {
        trackInputAmountPreset(preset);
      }
    },
    [tokenBalance, onChange, token?.decimals, trackInputAmountPreset],
  );

  const standardQuickPickOptions = useMemo(
    () =>
      [
        {
          label: '25%',
          onPress: onQuickOptionPress(25),
        },
        {
          label: '50%',
          onPress: onQuickOptionPress(50),
        },
        {
          label: '75%',
          onPress: onQuickOptionPress(75),
        },
        {
          label: '90%',
          onPress: onQuickOptionPress(90),
        },
      ] satisfies QuickPickButtonOption[],
    [onQuickOptionPress],
  );

  const handleMaxPress = useCallback(() => {
    onMaxPress();
    trackInputAmountPreset(InputAmountPreset.MAX);
  }, [onMaxPress, trackInputAmountPreset]);

  const gasslessQuickPickOptions = useMemo(
    () =>
      [
        {
          label: '25%',
          onPress: onQuickOptionPress(25),
        },
        {
          label: '50%',
          onPress: onQuickOptionPress(50),
        },
        {
          label: '75%',
          onPress: onQuickOptionPress(75),
        },
        {
          label: 'Max',
          onPress: handleMaxPress,
        },
      ] satisfies QuickPickButtonOption[],
    [handleMaxPress, onQuickOptionPress],
  );

  const shouldRenderMaxOption = useShouldRenderMaxOption(
    token,
    tokenBalance?.displayBalance,
    isQuoteSponsored,
  );
  const quickPickOptions = shouldRenderMaxOption
    ? gasslessQuickPickOptions
    : standardQuickPickOptions;

  return <QuickPickButtons options={quickPickOptions} show />;
};

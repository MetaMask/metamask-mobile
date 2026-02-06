import React, { useMemo, useCallback } from 'react';
import Keypad, { KeypadChangeData, Keys } from '../../../../Base/Keypad';
import { Box } from '../../../Box/Box';
import { swapsKeypadStyles as styles } from './styles';
import { QuickPickButtons } from './QuickPickButtons';
import { BridgeToken } from '../../types';
import { QuickPickButtonOption } from './types';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { BigNumber } from 'bignumber.js';
import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';

interface SwapsKeypadProps {
  value: string;
  currency: string;
  decimals: number;
  onChange: (data: KeypadChangeData) => void;
  token?: BridgeToken;
  tokenBalance: ReturnType<typeof useLatestBalance>;
  onMaxPress: () => void;
  isQuoteSponsored?: boolean;
}

export const SwapsKeypad = ({
  value,
  currency,
  decimals,
  onChange,
  token,
  tokenBalance,
  onMaxPress,
  isQuoteSponsored,
}: SwapsKeypadProps) => {
  const onQuickOptionPress = useCallback(
    (percentage: number) => () => {
      if (!tokenBalance?.displayBalance) return '0';

      const balance = new BigNumber(tokenBalance.displayBalance);
      const amount = balance.multipliedBy(percentage / 100);

      onChange({
        value: amount.toString(),
        valueAsNumber: Number(amount),
        pressedKey: Keys.Initial,
      });
    },
    [tokenBalance, onChange],
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
          onPress: onMaxPress,
        },
      ] satisfies QuickPickButtonOption[],
    [onMaxPress, onQuickOptionPress],
  );

  const shouldHideQuickPickOptions = useMemo(
    () => new BigNumber(tokenBalance?.displayBalance || 0).eq(0),
    [tokenBalance],
  );

  const shouldRenderMaxOption = useShouldRenderMaxOption(
    token,
    tokenBalance?.displayBalance,
    isQuoteSponsored,
  );
  const quickPickOptions = shouldRenderMaxOption
    ? gasslessQuickPickOptions
    : standardQuickPickOptions;

  return (
    <Box style={styles.keypadContainer}>
      <QuickPickButtons
        options={quickPickOptions}
        hidden={shouldHideQuickPickOptions}
      />
      <Keypad
        style={styles.keypad}
        value={value}
        onChange={onChange}
        currency={currency}
        decimals={decimals}
      />
    </Box>
  );
};

import React, { useMemo, useCallback } from 'react';
import Keypad, { KeypadChangeData, Keys } from '../../../../Base/Keypad';
import { Box } from '../../../Box/Box';
import { swapsKeypadStyles as styles } from './styles';
import { QuickPickButtons } from './QuickPickButtons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { BridgeToken } from '../../types';
import { selectIsGaslessSwapEnabled } from '../../../../../core/redux/slices/bridge';
import { QuickPickButtonOption } from './types';
import { useTokenAddress } from '../../hooks/useTokenAddress';
import { isNativeAddress } from '@metamask/bridge-controller';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { BigNumber } from 'bignumber.js';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';

interface SwapsKeypadProps {
  value: string;
  currency: string;
  decimals: number;
  onChange: (data: KeypadChangeData) => void;
  token?: BridgeToken;
  tokenBalance: ReturnType<typeof useLatestBalance>;
  onMaxPress: () => void;
}

export const SwapsKeypad = ({
  value,
  currency,
  decimals,
  onChange,
  token,
  tokenBalance,
  onMaxPress,
}: SwapsKeypadProps) => {
  const tokenAddress = useTokenAddress(token);
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
  const isNativeAsset = useMemo(
    () => isNativeAddress(tokenAddress),
    [tokenAddress],
  );

  const isGaslessSwapEnabled = useSelector((state: RootState) =>
    token?.chainId ? selectIsGaslessSwapEnabled(state, token.chainId) : false,
  );

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
    () => new BigNumber(tokenBalance?.displayBalance ?? 0).eq(0),
    [tokenBalance],
  );

  const quickPickOptions =
    (!isNativeAsset || isGaslessSwapEnabled) && stxEnabled
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

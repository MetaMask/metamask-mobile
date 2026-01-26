import { add0x, Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import {
  addHexes,
  decimalToHex,
  multiplyHexes,
} from '../../../../util/conversions';
import { useAccountNativeBalance } from './useAccountNativeBalance';

const HEX_ZERO = '0x0';

export function useHasInsufficientBalance(): {
  hasInsufficientBalance: boolean;
  nativeCurrency?: string;
} {
  const transactionMetadata = useTransactionMetadataRequest();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const { balanceWeiInHex } = useAccountNativeBalance(
    transactionMetadata?.chainId as Hex,
    transactionMetadata?.txParams?.from as string,
  );

  const { txParams } = transactionMetadata ?? {};
  const { maxFeePerGas, gas, gasPrice } = txParams || {};
  const { nativeCurrency } =
    networkConfigurations[transactionMetadata?.chainId as Hex] ?? {};

  const maxFeeNativeInHex = multiplyHexes(
    maxFeePerGas ? (decimalToHex(maxFeePerGas) as Hex) : (gasPrice as Hex),
    gas as Hex,
  );

  const transactionValue = txParams?.value || HEX_ZERO;
  const totalTransactionValue = addHexes(maxFeeNativeInHex, transactionValue);
  const totalTransactionInHex = add0x(totalTransactionValue as string);

  const balanceWeiInHexBN = new BigNumber(balanceWeiInHex ?? '0x0');
  const totalTransactionValueBN = new BigNumber(totalTransactionInHex ?? '0x0');

  const hasInsufficientBalance = balanceWeiInHexBN.lt(totalTransactionValueBN);

  return { hasInsufficientBalance, nativeCurrency };
}

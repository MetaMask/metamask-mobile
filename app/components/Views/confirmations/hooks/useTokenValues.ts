import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { NetworkClientId } from '@metamask/network-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import I18n from '../../../../../locales/i18n';
import { formatAmount } from '../../../../components/UI/SimulationDetails/formatAmount';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { safeToChecksumAddress } from '../../../../util/address';
import { fetchTokenFiatRates } from '../../../../util/tokens';
import { toBigNumber } from '../../../../util/number';
import { calcTokenAmount } from '../../../../util/transactions';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { fetchErc20Decimals, isNativeToken } from '../utils/token';
import { parseStandardTokenTransactionData } from '../utils/transaction';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

const useFiatConversion = (amount: BigNumber, chainId: Hex, tokenAddress: Hex): string => {
  const fiatFormatter = useFiatFormatter();
  const fiatCurrency = useSelector(selectCurrentCurrency);

  const erc20FiatRates = useAsyncResult(
    async () => await fetchTokenFiatRates(fiatCurrency, [tokenAddress], chainId),
    [tokenAddress, chainId, fiatCurrency],
  );

  const fiatAmount = amount.times(erc20FiatRates.value?.[tokenAddress] ?? 1);
  return fiatFormatter(fiatAmount);
};

const useTokenDecimals = (tokenAddress: Hex, networkClientId?: NetworkClientId) => useAsyncResult(
  async () => await fetchErc20Decimals(tokenAddress, networkClientId),
  [tokenAddress, networkClientId],
);

interface TokenValuesProps {
  /**
   * Optional value in wei to display. If not provided, the amount from the transactionMetadata will be used.
   */
  amountWei?: string;
}

/** Hook to calculate the token amount and fiat values from a transaction. */
export const useTokenValues = ({ amountWei }: TokenValuesProps = {}) => {
  const transactionMetadata = useTransactionMetadataRequest() ?? {} as TransactionMeta;
  const { chainId, networkClientId, txParams } = transactionMetadata;

  const isNative = isNativeToken(transactionMetadata);

  const transactionData = parseStandardTokenTransactionData(txParams?.data);
  const tokenAddress = isNative ? NATIVE_TOKEN_ADDRESS : safeToChecksumAddress(txParams?.to) || '0x';

  const value = amountWei ?
    toBigNumber.dec(amountWei) :
    transactionData?.args?._value || txParams?.value || '0';
  const valueBN = new BigNumber(value.toString());

  const { value: decimals, pending } = useTokenDecimals(tokenAddress, networkClientId);
  const tokenAmount = calcTokenAmount(valueBN, decimals ?? 1);
  const fiatDisplay = useFiatConversion(tokenAmount, chainId as Hex, tokenAddress);

  return pending ?
  {}
  :
  {
    // todo: we can return values as BN. We are converting to string to preserve existing behavior
    tokenAmountValue: tokenAmount.toString(),
    tokenAmountDisplayValue: formatAmount(I18n.locale, tokenAmount),
    fiatDisplayValue: fiatDisplay,
  };
};

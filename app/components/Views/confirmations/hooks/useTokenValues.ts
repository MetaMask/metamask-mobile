import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { NetworkClientId } from '@metamask/network-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import I18n from '../../../../../locales/i18n';
import { formatAmount } from '../../../../components/UI/SimulationDetails/formatAmount';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { RootState } from '../../../../reducers';
import { selectConversionRateByChainId } from '../../../../selectors/currencyRateController';
import { toBigNumber } from '../../../../util/number';
import { calcTokenAmount } from '../../../../util/transactions';
import { fetchErc20Decimals } from '../utils/token';
import { parseStandardTokenTransactionData } from '../utils/transaction';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

interface TokenValuesProps {
  /**
   * Optional value in wei to display. If not provided, the amount from the transactionMetadata will be used.
   */
  amountWei?: string;
}

const useTokenDecimals = (tokenAddress: Hex, networkClientId?: NetworkClientId) => useAsyncResult(
  async () => await fetchErc20Decimals(tokenAddress, networkClientId),
  [tokenAddress, networkClientId],
);

const useFiatConversion = (amount: BigNumber, chainId: Hex) => {
  const conversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId),
  );
  const fiatFormatter = useFiatFormatter();
  return fiatFormatter(amount.times(conversionRate || 1));
};

/** Hook to calculate the token amount and fiat values from a transaction. */
export const useTokenValues = ({ amountWei }: TokenValuesProps = {}) => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId, networkClientId, txParams } = transactionMetadata as TransactionMeta;

  const transactionData = parseStandardTokenTransactionData(txParams?.data);
  const tokenAddress = transactionData?.args?._to as Hex;
  const value = amountWei ? toBigNumber.dec(amountWei) : transactionData?.args?._value || txParams?.value;
  const valueBN = value ? new BigNumber(value.toString()) : new BigNumber(0);

  const { value: decimals } = useTokenDecimals(tokenAddress, networkClientId);
  const tokenAmount = calcTokenAmount(valueBN, decimals ?? 1);
  const fiatDisplay = useFiatConversion(tokenAmount, chainId as Hex);

  // todo: we can return values as BN. We are converting to string to preserve existing behavior
  return {
    tokenAmountValue: tokenAmount.toString(),
    tokenAmountDisplayValue: formatAmount(I18n.locale, tokenAmount),
    fiatDisplayValue: fiatDisplay,
  };
};

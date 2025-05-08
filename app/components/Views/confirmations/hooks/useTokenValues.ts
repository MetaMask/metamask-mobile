import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
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

/** Hook to calculate the token amount and fiat values from a transaction. */
export const useTokenValues = ({ amountWei }: TokenValuesProps = {}) => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId, networkClientId, txParams } = transactionMetadata as TransactionMeta;

  const transactionData = parseStandardTokenTransactionData(txParams?.data);
  const tokenAddress = transactionData?.args?._to as Hex;
  const value = amountWei ? toBigNumber.dec(amountWei) : transactionData?.args?._value || txParams?.value as BigNumber | undefined;
  const valueBN = value ? new BigNumber(value.toString()) : new BigNumber(0);

  const { value: decimals } = useAsyncResult(async () => await fetchErc20Decimals(tokenAddress, networkClientId), [tokenAddress, networkClientId]);

  const locale = I18n.locale;
  const tokenAmount = calcTokenAmount(valueBN, decimals ?? 1);
  const tokenAmountDisplay = formatAmount(locale, tokenAmount);

  // Get the conversion rate for the chain
  const conversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId as Hex),
  );
  const conversionRateBN = new BigNumber(conversionRate || 1);

  // Calculate the fiat value
  const fiatFormatter = useFiatFormatter();
  const fiatValue = tokenAmount.times(conversionRateBN);
  const fiatDisplay = fiatFormatter(fiatValue);

  // todo: we can return values as BN. We are converting to string to preserve existing behavior
  return {
    tokenAmountValue: tokenAmount.toString(),
    tokenAmountDisplayValue: tokenAmountDisplay,
    fiatDisplayValue: fiatDisplay,
  };
};

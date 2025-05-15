import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import { NetworkClientId } from '@metamask/network-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import I18n from '../../../../../locales/i18n';
import { formatAmount, formatAmountMaxPrecision } from '../../../../components/UI/SimulationDetails/formatAmount';
import { RootState } from '../../../../reducers';
import { selectConversionRateByChainId } from '../../../../selectors/currencyRateController';
import { selectContractExchangeRatesByChainId } from '../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../util/address';
import { toBigNumber } from '../../../../util/number';
import { calcTokenAmount } from '../../../../util/transactions';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { ERC20_DEFAULT_DECIMALS, fetchErc20Decimals } from '../utils/token';
import { parseStandardTokenTransactionData } from '../utils/transaction';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

interface TokenValuesProps {
  /**
   * Optional value in wei to display. If not provided, the amount from the transactionMetadata will be used.
   */
  amountWei?: string;
}

interface TokenValues {
  amountPreciseDisplay: string;
  amountDisplay: string;
  fiatDisplay: string;
}

const useTokenDecimals = (tokenAddress: Hex, networkClientId?: NetworkClientId) => useAsyncResult(
  async () => await fetchErc20Decimals(tokenAddress, networkClientId),
  [tokenAddress, networkClientId],
);

export const useTokenValuesByType = ({ amountWei }: TokenValuesProps = {}): TokenValues | Record<string, never> => {
  const fiatFormatter = useFiatFormatter();
  const {
    chainId,
    networkClientId,
    txParams,
    type: transactionType,
  } = useTransactionMetadataRequest() ?? {};

  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, chainId as Hex),
  );
  const nativeConversionRate = new BigNumber(
    useSelector((state: RootState) =>
      selectConversionRateByChainId(state, chainId as Hex),
    ) ?? 1,
  );

  const tokenAddress = safeToChecksumAddress(txParams?.to) || NATIVE_TOKEN_ADDRESS;
  const { value: decimals, pending } = useTokenDecimals(tokenAddress, networkClientId);

  if (pending) {
    return {};
  }

  const transactionData = parseStandardTokenTransactionData(txParams?.data);
  const value = amountWei ?
    toBigNumber.dec(amountWei) :
    transactionData?.args?._value || txParams?.value || '0';

  const amount = calcTokenAmount(value ?? '0', Number(decimals ?? ERC20_DEFAULT_DECIMALS));

  let fiat;

  switch (transactionType) {
    case TransactionType.tokenMethodTransfer: {
      // ERC20
      const contractExchangeRate = contractExchangeRates?.[tokenAddress]?.price ?? 1;
      fiat = amount.times(nativeConversionRate).times(contractExchangeRate);
      break;
    }
    default: {
      fiat = amount.times(nativeConversionRate);
      break;
    }
  }

  return {
    amountPreciseDisplay: formatAmountMaxPrecision(I18n.locale, amount),
    amountDisplay: formatAmount(I18n.locale, amount),
    fiatDisplay: fiatFormatter(fiat),
  };
};

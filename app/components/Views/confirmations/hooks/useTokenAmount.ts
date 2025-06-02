import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import { NetworkClientId } from '@metamask/network-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import I18n from '../../../../../locales/i18n';
import { formatAmount, formatAmountMaxPrecision } from '../../../UI/SimulationDetails/formatAmount';
import { RootState } from '../../../../reducers';
import { selectConversionRateByChainId, selectCurrencyRates } from '../../../../selectors/currencyRateController';
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
import useNetworkInfo from './useNetworkInfo';

interface TokenAmountProps {
  /**
   * Optional value in wei to display. If not provided, the amount from the transactionMetadata will be used.
   */
  amountWei?: string;
}

interface TokenAmount {
  amountPrecise: string | undefined;
  amount: string | undefined;
  fiat: string | undefined;
  usdValue: string | null;
}

const useTokenDecimals = (tokenAddress: Hex, networkClientId?: NetworkClientId) => useAsyncResult(
  async () => await fetchErc20Decimals(tokenAddress, networkClientId),
  [tokenAddress, networkClientId],
);

export const useTokenAmount = ({ amountWei }: TokenAmountProps = {}): TokenAmount => {
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
  const { networkNativeCurrency } = useNetworkInfo(chainId as Hex);
  const currencyRates = useSelector(selectCurrencyRates);
  const usdConversionRateFromCurrencyRates =
    currencyRates?.[networkNativeCurrency as string]?.usdConversionRate;
  const usdConversionRate = usdConversionRateFromCurrencyRates ?? 0;


  const tokenAddress = safeToChecksumAddress(txParams?.to) || NATIVE_TOKEN_ADDRESS;
  const { value: decimals, pending } = useTokenDecimals(tokenAddress, networkClientId);

  if (pending) {
    return {
      amountPrecise: undefined,
      amount: undefined,
      fiat: undefined,
      usdValue: null,
    };
  }

  const transactionData = parseStandardTokenTransactionData(txParams?.data);
  const value = amountWei ?
    toBigNumber.dec(amountWei) :
    transactionData?.args?._value || txParams?.value || '0';

  const amount = calcTokenAmount(value ?? '0', Number(decimals ?? ERC20_DEFAULT_DECIMALS));

  let fiat;
  let usdValue = null;

  switch (transactionType) {
    case TransactionType.simpleSend:
    case TransactionType.stakingClaim:
    case TransactionType.stakingDeposit:
    case TransactionType.stakingUnstake: {
      // Native
      fiat = amount.times(nativeConversionRate);
      const usdAmount = amount.times(usdConversionRate);
      usdValue = usdConversionRateFromCurrencyRates ? usdAmount.toFixed(2): null;
      break;
    }
    case TransactionType.contractInteraction:
    case TransactionType.tokenMethodTransfer: {
      // ERC20
      const contractExchangeRate = contractExchangeRates?.[tokenAddress]?.price ?? 0;
      fiat = amount.times(nativeConversionRate).times(contractExchangeRate);

      const usdAmount = amount.times(contractExchangeRate).times(usdConversionRate);
      usdValue = usdConversionRateFromCurrencyRates ? usdAmount.toFixed(2) : null;
      break;
    }
    default: {
      break;
    }
  }

  return {
    amountPrecise: formatAmountMaxPrecision(I18n.locale, amount),
    amount: formatAmount(I18n.locale, amount),
    fiat: fiat ? fiatFormatter(fiat) : undefined,
    usdValue,
  };
};

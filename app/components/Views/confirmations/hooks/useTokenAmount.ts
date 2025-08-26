import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import { NetworkClientId } from '@metamask/network-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import I18n from '../../../../../locales/i18n';
import {
  formatAmount,
  formatAmountMaxPrecision,
} from '../../../UI/SimulationDetails/formatAmount';
import { RootState } from '../../../../reducers';
import {
  selectConversionRateByChainId,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import { selectContractExchangeRatesByChainId } from '../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../util/address';
import { toBigNumber } from '../../../../util/number';
import {
  calcTokenAmount,
  calcTokenValue,
  generateTransferData,
} from '../../../../util/transactions';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { ERC20_DEFAULT_DECIMALS, fetchErc20Decimals } from '../utils/token';
import { parseStandardTokenTransactionData } from '../utils/transaction';
import { useTransactionMetadataOrThrow } from './transactions/useTransactionMetadataRequest';
import useNetworkInfo from './useNetworkInfo';
import { useCallback } from 'react';
import { updateEditableParams } from '../../../../util/transaction-controller';
import { selectTokensByChainIdAndAddress } from '../../../../selectors/tokensController';

interface TokenAmountProps {
  /**
   * Optional value in wei to display. If not provided, the amount from the transactionMetadata will be used.
   */
  amountWei?: string;
}

interface TokenAmount {
  amount: string | undefined;
  amountNative: string | undefined;
  amountPrecise: string | undefined;
  amountUnformatted: string | undefined;
  fiat: string | undefined;
  isNative: boolean | undefined;
  updateTokenAmount: (amount: string) => void;
  usdValue: string | null;
}

const useTokenDecimals = (
  tokenAddress: Hex,
  chainId: Hex,
  networkClientId: NetworkClientId,
) => {
  const chainTokens = Object.values(
    useSelector((state) => selectTokensByChainIdAndAddress(state, chainId)),
  );

  const token = chainTokens.find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
  );

  const tokenDecimals = token?.decimals;

  const { value, pending } = useAsyncResult(async () => {
    if (tokenDecimals !== undefined) {
      return undefined;
    }

    return (
      (await fetchErc20Decimals(tokenAddress, networkClientId)) ??
      ERC20_DEFAULT_DECIMALS
    );
  }, [tokenAddress, tokenDecimals, networkClientId]);

  return {
    value: tokenDecimals ?? value,
    pending: tokenDecimals === undefined && pending,
  };
};

export const useTokenAmount = ({
  amountWei,
}: TokenAmountProps = {}): TokenAmount => {
  const fiatFormatter = useFiatFormatter();

  const {
    chainId,
    id: transactionId,
    networkClientId,
    txParams,
    type: transactionType,
  } = useTransactionMetadataOrThrow();

  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, chainId as Hex),
  );
  const nativeConversionRate = new BigNumber(
    useSelector((state: RootState) =>
      selectConversionRateByChainId(state, chainId as Hex),
    ) ?? 0,
  );
  const { networkNativeCurrency } = useNetworkInfo(chainId as Hex);
  const currencyRates = useSelector(selectCurrencyRates);
  const usdConversionRateFromCurrencyRates =
    currencyRates?.[networkNativeCurrency as string]?.usdConversionRate;
  const usdConversionRate = usdConversionRateFromCurrencyRates ?? 0;

  const tokenAddress =
    safeToChecksumAddress(txParams?.to) || NATIVE_TOKEN_ADDRESS;

  const { value: decimals, pending } = useTokenDecimals(
    tokenAddress,
    chainId,
    networkClientId,
  );

  const transactionData = parseStandardTokenTransactionData(txParams?.data);
  const recipient = transactionData?.args?._to;

  const updateTokenAmount = useCallback(
    (amount: string) => {
      const amountRaw = calcTokenValue(amount, decimals);

      const newData = generateTransferData('transfer', {
        toAddress: recipient,
        amount: amountRaw.toString(16),
      });

      updateEditableParams(transactionId as string, {
        data: newData,
        updateType: false,
      });
    },
    [decimals, recipient, transactionId],
  );

  if (pending) {
    return {
      amount: undefined,
      amountNative: undefined,
      amountPrecise: undefined,
      amountUnformatted: undefined,
      fiat: undefined,
      isNative: undefined,
      usdValue: null,
      updateTokenAmount,
    };
  }

  const value = amountWei
    ? toBigNumber.dec(amountWei)
    : transactionData?.args?._value || txParams?.value || '0';

  const amount = calcTokenAmount(
    value ?? '0',
    Number(decimals ?? ERC20_DEFAULT_DECIMALS),
  );

  let fiat;
  let native;
  let usdValue = null;
  let isNative = false;

  switch (transactionType) {
    case TransactionType.simpleSend:
    case TransactionType.stakingClaim:
    case TransactionType.stakingDeposit:
    case TransactionType.stakingUnstake: {
      // Native
      fiat = amount.times(nativeConversionRate);
      const usdAmount = amount.times(usdConversionRate);
      usdValue = usdConversionRateFromCurrencyRates
        ? usdAmount.toFixed(2)
        : null;
      isNative = true;
      break;
    }
    case TransactionType.contractInteraction:
    case TransactionType.perpsDeposit:
    case TransactionType.tokenMethodTransfer: {
      // ERC20
      const contractExchangeRate =
        contractExchangeRates?.[tokenAddress]?.price ?? 0;
      fiat = amount.times(nativeConversionRate).times(contractExchangeRate);
      native = amount.times(contractExchangeRate);

      const usdAmount = amount
        .times(contractExchangeRate)
        .times(usdConversionRate);
      usdValue = usdConversionRateFromCurrencyRates
        ? usdAmount.toFixed(2)
        : null;
      break;
    }
    default: {
      break;
    }
  }

  return {
    amount: formatAmount(I18n.locale, amount),
    amountNative: native ? formatAmount(I18n.locale, native) : undefined,
    amountPrecise: formatAmountMaxPrecision(I18n.locale, amount),
    amountUnformatted: amount.toString(),
    fiat: fiat !== undefined ? fiatFormatter(fiat) : undefined,
    isNative,
    updateTokenAmount,
    usdValue,
  };
};

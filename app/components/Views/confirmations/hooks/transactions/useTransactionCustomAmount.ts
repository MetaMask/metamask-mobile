import { useCallback, useEffect, useMemo, useState } from 'react';
import { Hex } from '@metamask/utils';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useUpdateTokenAmount } from './useUpdateTokenAmount';
import { getTokenAddress } from '../../utils/transaction-pay';
import { useParams } from '../../../../../util/navigation/navUtils';
import { debounce } from 'lodash';
import { useSelector } from 'react-redux';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { selectPredictBalanceByAddress } from '../../components/predict-confirmations/predict-temp';
import { RootState } from '../../../../../reducers';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionPayFiat } from '../pay/useTransactionPayFiat';
import { useTransactionPayRequiredTokens } from '../pay/useTransactionPayData';

export const MAX_LENGTH = 28;
const DEBOUNCE_DELAY = 500;

export function useTransactionCustomAmount({
  currency,
}: { currency?: string } = {}) {
  const { amount: defaultAmount } = useParams<{ amount?: string }>();
  const [amountFiat, setAmountFiat] = useState(defaultAmount ?? '0');
  const [isInputChanged, setInputChanged] = useState(false);
  const [hasInput, setHasInput] = useState(false);
  const [amountHumanDebounced, setAmountHumanDebounced] = useState('0');
  const maxPercentage = useMaxPercentage();

  const debounceSetAmountDelayed = useMemo(
    () =>
      debounce((value: string) => {
        setAmountHumanDebounced(value);
      }, DEBOUNCE_DELAY),
    [],
  );

  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { chainId } = transactionMeta;

  const tokenAddress = getTokenAddress(transactionMeta);
  const tokenFiatRate = useTokenFiatRate(tokenAddress, chainId, currency);
  const balanceUsd = useTokenBalance();

  const { updateTokenAmount: updateTokenAmountCallback } =
    useUpdateTokenAmount();

  const amountHuman = useMemo(
    () =>
      new BigNumber(amountFiat || '0')
        .dividedBy(tokenFiatRate ?? 1)
        .toString(10),
    [amountFiat, tokenFiatRate],
  );

  useEffect(() => {
    debounceSetAmountDelayed(amountHuman);
  }, [amountHuman, debounceSetAmountDelayed]);

  useEffect(() => {
    if (amountHumanDebounced !== '0') {
      setInputChanged(true);
    }

    setHasInput(
      Boolean(amountHumanDebounced?.length) && amountHumanDebounced !== '0',
    );
  }, [amountHumanDebounced]);

  const updatePendingAmount = useCallback((value: string) => {
    let newAmount = value.replace(/^0+/, '') || '0';

    if (newAmount.startsWith('.') || newAmount.startsWith(',')) {
      newAmount = '0' + newAmount;
    }

    if (newAmount.length >= MAX_LENGTH) {
      return;
    }

    setAmountFiat(newAmount);
  }, []);

  const updatePendingAmountPercentage = useCallback(
    (percentage: number) => {
      if (!balanceUsd) {
        return;
      }

      const finalPercentage = percentage === 100 ? maxPercentage : percentage;

      const newAmount = new BigNumber(finalPercentage)
        .dividedBy(100)
        .multipliedBy(balanceUsd)
        .decimalPlaces(2, BigNumber.ROUND_DOWN)
        .toString(10);

      updatePendingAmount(newAmount);
    },
    [balanceUsd, maxPercentage, updatePendingAmount],
  );

  const updateTokenAmount = useCallback(() => {
    updateTokenAmountCallback(amountHuman);
  }, [amountHuman, updateTokenAmountCallback]);

  return {
    amountFiat,
    amountHuman,
    amountHumanDebounced,
    hasInput,
    isInputChanged,
    updatePendingAmount,
    updatePendingAmountPercentage,
    updateTokenAmount,
  };
}

function useMaxPercentage() {
  const featureFlags = useSelector(selectMetaMaskPayFlags);
  const { payToken } = useTransactionPayToken();
  const { chainId } = useTransactionMetadataRequest() ?? { chainId: '0x0' };
  const requiredTokens = useTransactionPayRequiredTokens();

  return useMemo(() => {
    // Assumes we're not targetting native tokens.
    if (
      payToken?.chainId === chainId &&
      payToken?.address.toLowerCase() ===
        requiredTokens[0]?.address?.toLowerCase()
    ) {
      return 100;
    }

    const requiredQuoteCount = requiredTokens.filter(
      (token) =>
        !token.skipIfBalance ||
        new BigNumber(token.balanceRaw).lt(token.amountRaw),
    ).length;

    let bufferPercentage =
      requiredQuoteCount > 0 ? featureFlags.bufferInitial : 0;

    if (requiredQuoteCount > 1) {
      bufferPercentage +=
        featureFlags.bufferSubsequent * (requiredQuoteCount - 1);
    }

    if (
      payToken?.address === getNativeTokenAddress(payToken?.chainId ?? '0x0')
    ) {
      // Cannot calculate gas cost yet so just add an additional buffer if pay token is native
      bufferPercentage += featureFlags.bufferInitial;
    }

    return 100 - bufferPercentage * 100;
  }, [chainId, featureFlags, payToken, requiredTokens]);
}

function useTokenBalance() {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { convertFiat } = useTransactionPayFiat();
  const from = (transactionMeta?.txParams?.from ?? '0x0') as Hex;

  const { payToken } = useTransactionPayToken();
  const payTokenBalance = convertFiat(payToken?.balanceUsd ?? 0);

  const predictBalance = useSelector((state: RootState) =>
    selectPredictBalanceByAddress(state, from),
  );

  return hasTransactionType(transactionMeta, [TransactionType.predictWithdraw])
    ? predictBalance
    : payTokenBalance;
}

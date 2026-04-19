import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { hasTransactionType } from '../../utils/transaction';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import Engine from '../../../../../core/Engine';
import {
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import { useTransactionPayHasSourceAmount } from '../pay/useTransactionPayHasSourceAmount';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';

export const MAX_LENGTH = 28;
const DEBOUNCE_DELAY = 500;

export function useTransactionCustomAmount({
  currency,
}: { currency?: string } = {}) {
  const { amount: defaultAmount } = useParams<{ amount?: string }>();
  const [amountFiatState, setAmountFiat] = useState(defaultAmount ?? '0');
  const [isInputChanged, setInputChanged] = useState(false);
  const [hasInput, setHasInput] = useState(false);
  const [amountHumanDebounced, setAmountHumanDebounced] = useState('0');
  const totals = useTransactionPayTotals();
  const hasSourceAmount = useTransactionPayHasSourceAmount();
  const isPostQuote = useTransactionPayIsPostQuote();
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const [isTokenAmountUpdated, setIsTokenAmountUpdated] = useState(false);

  const debounceSetAmountDelayed = useMemo(
    () =>
      debounce((value: string) => {
        setAmountHumanDebounced(value);
      }, DEBOUNCE_DELAY),
    [],
  );

  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { chainId, id: transactionId } = transactionMeta;

  const isMaxAmount = useTransactionPayIsMaxAmount();
  const tokenAddress = getTokenAddress(transactionMeta);
  const rawTokenFiatRate =
    useTokenFiatRate(tokenAddress, chainId, currency) ?? 1;

  // pUSD (Predict) is a dollar-pegged stablecoin backed 1:1 by USDC on-chain.
  // The token rates controller doesn't track pUSD, so the rate lookup falls
  // back to the native-token (POL ≈ $0.09) rate which inflates the converted
  // amount ~11×, triggering a false "Insufficient funds" alert. Override to 1.
  const isStablecoinWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.predictWithdraw,
  ]);
  const tokenFiatRate = isStablecoinWithdraw ? 1 : rawTokenFiatRate;

  const balanceUsd = useTokenBalance(tokenFiatRate);

  const { updateTokenAmount: updateTokenAmountCallback } =
    useUpdateTokenAmount();

  const amountFiat = useMemo(() => {
    const targetAmountUsd = totals?.targetAmount.usd;

    if (isMaxAmount && targetAmountUsd && targetAmountUsd !== '0') {
      return new BigNumber(targetAmountUsd)
        .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
        .toString(10);
    }

    return amountFiatState;
  }, [amountFiatState, isMaxAmount, totals?.targetAmount.usd]);

  const amountHuman = useMemo(
    () =>
      new BigNumber(amountFiat || '0').dividedBy(tokenFiatRate).toString(10),
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

  const setIsMax = useCallback(
    (value: boolean) => {
      const { TransactionPayController } = Engine.context;

      TransactionPayController.setTransactionConfig(transactionId, (config) => {
        config.isMaxAmount = value;
      });
    },
    [transactionId],
  );

  const updatePendingAmount = useCallback(
    (value: string) => {
      let newAmount = value.replace(/^0+/, '') || '0';

      if (newAmount.startsWith('.') || newAmount.startsWith(',')) {
        newAmount = '0' + newAmount;
      }

      if (newAmount.length >= MAX_LENGTH) {
        return;
      }

      if (isMaxAmount) {
        setIsMax(false);
      }

      setConfirmationMetric({
        properties: {
          mm_pay_amount_input_type: 'manual',
        },
      });

      setAmountFiat(newAmount);
    },
    [isMaxAmount, setIsMax, setConfirmationMetric],
  );

  const updatePendingAmountPercentage = useCallback(
    (percentage: number) => {
      if (!balanceUsd) {
        return;
      }

      const newAmount = new BigNumber(percentage)
        .dividedBy(100)
        .multipliedBy(balanceUsd)
        .decimalPlaces(2, BigNumber.ROUND_DOWN)
        .toString(10);

      setConfirmationMetric({
        properties: {
          mm_pay_amount_input_type: `${percentage}%`,
        },
      });

      if (percentage === 100) {
        setIsMax(true);
      } else if (isMaxAmount) {
        setIsMax(false);
      }

      setAmountFiat(newAmount);
    },
    [balanceUsd, isMaxAmount, setIsMax, setConfirmationMetric],
  );

  const updateTokenAmount = useCallback(() => {
    updateTokenAmountCallback(amountHuman);
    setIsTokenAmountUpdated(true);
  }, [amountHuman, updateTokenAmountCallback]);

  useEffect(() => {
    if (isTokenAmountUpdated && (hasSourceAmount || isPostQuote)) {
      setConfirmationMetric({
        properties: {
          mm_pay_quote_requested: true,
        },
      });
      setIsTokenAmountUpdated(false);
    }
  }, [
    hasSourceAmount,
    isPostQuote,
    isTokenAmountUpdated,
    setConfirmationMetric,
  ]);

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

function useTokenBalance(tokenUsdRate: number) {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;

  const { payToken } = useTransactionPayToken();

  const payTokenBalanceUsd = new BigNumber(
    payToken?.balanceUsd ?? 0,
  ).toNumber();

  const { data: predictBalanceHuman = 0 } = usePredictBalance();

  const predictBalanceUsd = new BigNumber(predictBalanceHuman ?? '0')
    .multipliedBy(tokenUsdRate)
    .toNumber();

  if (hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw])) {
    const perpsState = Engine.context.PerpsController?.state;
    const availableBalance = perpsState?.accountState?.availableBalance;
    return availableBalance ? parseFloat(availableBalance) : 0;
  }

  return hasTransactionType(transactionMeta, [TransactionType.predictWithdraw])
    ? predictBalanceUsd
    : payTokenBalanceUsd;
}

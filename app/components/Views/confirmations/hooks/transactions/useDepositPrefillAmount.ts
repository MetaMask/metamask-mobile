import { useEffect, useMemo, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import {
  selectDepositLimits,
  selectMetaMaskPayFlags,
  selectRelayFixedSpread,
  PrefilledAmountConfig,
} from '../../../../../selectors/featureFlagController/confirmations';
import { selectAccountOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { RootState } from '../../../../../reducers';
import { hasTransactionType } from '../../utils/transaction';
import { isStablecoin } from '../../utils/token';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';

function formatFiatAmount(value: BigNumber): string {
  return value.isInteger() ? value.toString(10) : value.toFixed(2);
}

export interface DepositPrefillResult {
  prefillAmount: string | undefined;
  enabled: boolean;
  isLoading: boolean;
  hasPrefilled: boolean;
}

export function useDepositPrefillAmount(): DepositPrefillResult {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { payToken } = useTransactionPayToken();

  const { prefilledAmount } = useSelector(selectMetaMaskPayFlags);
  const depositLimits = useSelector(selectDepositLimits);
  const relayFixedSpread = useSelector(selectRelayFixedSpread);

  const prefilledAmountConfig = useMemo((): PrefilledAmountConfig => {
    for (const [type, config] of Object.entries(prefilledAmount.overrides)) {
      if (hasTransactionType(transactionMeta, [type as TransactionType])) {
        return config;
      }
    }
    return prefilledAmount.default;
  }, [transactionMeta, prefilledAmount]);

  const depositLimit = useMemo(() => {
    for (const [type, limit] of Object.entries(depositLimits)) {
      if (hasTransactionType(transactionMeta, [type as TransactionType])) {
        return limit;
      }
    }
    return undefined;
  }, [transactionMeta, depositLimits]);

  const enabled = prefilledAmountConfig.enabled;

  const transactionId = transactionMeta?.id ?? '';
  const accountOverride = useSelector((state: RootState) =>
    selectAccountOverrideByTransactionId(state, transactionId),
  );

  const balanceUsd = new BigNumber(payToken?.balanceUsd ?? 0).toNumber();

  const tokenKey = `${payToken?.address}:${payToken?.chainId}:${accountOverride}`;
  const [committedKey, setCommittedKey] = useState<string | null>(null);

  const prefillAmount = useMemo(() => {
    if (!enabled || !balanceUsd || balanceUsd <= 0 || !payToken) {
      return undefined;
    }

    const stable = isStablecoin(
      payToken.address as Hex,
      payToken.chainId as Hex,
      relayFixedSpread,
    );
    const percentage = stable ? 100 : 50;

    const raw = new BigNumber(percentage)
      .dividedBy(100)
      .multipliedBy(balanceUsd)
      .decimalPlaces(2, BigNumber.ROUND_DOWN);

    return formatFiatAmount(
      depositLimit !== undefined ? BigNumber.min(raw, depositLimit) : raw,
    );
  }, [enabled, balanceUsd, payToken, depositLimit, relayFixedSpread]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (committedKey !== null && committedKey !== tokenKey) {
      setCommittedKey(null);
      return;
    }

    if (committedKey === null && prefillAmount !== undefined) {
      setCommittedKey(tokenKey);
    }
  }, [enabled, tokenKey, prefillAmount, committedKey]);

  const hasPrefilled = committedKey === tokenKey;
  const isLoading = enabled && !hasPrefilled;

  return { prefillAmount, isLoading, hasPrefilled, enabled };
}

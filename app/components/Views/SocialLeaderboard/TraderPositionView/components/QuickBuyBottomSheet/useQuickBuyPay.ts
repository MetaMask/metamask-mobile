import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import Engine from '../../../../../../core/Engine';
import Routes from '../../../../../../constants/navigation/Routes';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import { useAutomaticTransactionPayToken } from '../../../../confirmations/hooks/pay/useAutomaticTransactionPayToken';
import { useTransactionPayToken } from '../../../../confirmations/hooks/pay/useTransactionPayToken';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayTotals,
} from '../../../../confirmations/hooks/pay/useTransactionPayData';
import { useTransactionPayAvailableTokens } from '../../../../confirmations/hooks/pay/useTransactionPayAvailableTokens';
import { useUpdateTokenAmount } from '../../../../confirmations/hooks/transactions/useUpdateTokenAmount';
import { useTokenFiatRate } from '../../../../confirmations/hooks/tokens/useTokenFiatRates';

interface UseQuickBuyPayParams {
  transactionId: string | undefined;
  usdAmount: string;
  /** Destination token address (what the user is buying). */
  destTokenAddress: Hex | undefined;
  /** Destination chain. */
  destChainId: Hex | undefined;
  onClose: () => void;
  markConfirmed: () => void;
}

export interface UseQuickBuyPayResult {
  isSubmitting: boolean;
  hasInsufficientFunds: boolean;
  isQuoteLoading: boolean;
  hasValidAmount: boolean;
  isConfirmDisabled: boolean;
  isConfirmLoading: boolean;
  getButtonLabel: () => string;
  /** Pay-computed payment total in USD (target + fees). */
  totalPayUsd: string | undefined;
  /** Pay-computed target amount in USD (sanity-check of destination value). */
  targetAmountUsd: string | undefined;
  handleConfirm: () => Promise<void>;
}

const DEBOUNCE_MS = 400;
const USD = 'usd';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const FALLBACK_CHAIN_ID = '0x1';

/**
 * Drives the Pay side of Quick Buy: auto-selects the best Pay token on mount,
 * converts the user's USD amount into the destination-token amount, encodes
 * it into the transaction through Pay's standard update path, surfaces
 * quote/fee/insufficient-funds state, and accepts the approval on confirm.
 *
 * Must be rendered inside `QuickBuyTransactionProvider`.
 */
export function useQuickBuyPay({
  transactionId,
  usdAmount,
  destTokenAddress,
  destChainId,
  onClose,
  markConfirmed,
}: UseQuickBuyPayParams): UseQuickBuyPayResult {
  const navigation = useNavigation();

  useAutomaticTransactionPayToken();

  const { payToken } = useTransactionPayToken();
  const { availableTokens } = useTransactionPayAvailableTokens();
  const totals = useTransactionPayTotals();
  const isQuoteLoading = useIsTransactionPayQuoteLoading();
  const { updateTokenAmount } = useUpdateTokenAmount();

  // useTokenFiatRate cannot be called conditionally, so fall back to a safe
  // placeholder on the first render before the destination metadata resolves.
  // The rate is only used when both inputs are defined.
  const rawDestTokenUsdRate = useTokenFiatRate(
    (destTokenAddress ?? ZERO_ADDRESS) as Hex,
    (destChainId ?? FALLBACK_CHAIN_ID) as Hex,
    USD,
  );
  const destTokenUsdRate =
    destTokenAddress && destChainId ? rawDestTokenUsdRate : undefined;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const usdAmountNumber = useMemo(() => {
    const n = parseFloat(usdAmount);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [usdAmount]);

  const hasValidAmount = usdAmountNumber > 0;

  const destTokenHumanAmount = useMemo(() => {
    if (!hasValidAmount) return '0';

    // If we know the destination token price, convert USD → token amount.
    // Otherwise fall back to 1:1 (reasonable for stablecoin destinations).
    const rate =
      destTokenUsdRate && destTokenUsdRate > 0 ? destTokenUsdRate : 1;

    return new BigNumber(usdAmountNumber)
      .dividedBy(rate)
      .toFixed(8, BigNumber.ROUND_DOWN);
  }, [hasValidAmount, usdAmountNumber, destTokenUsdRate]);

  // Debounced amount update into the transaction's self-transfer data.
  useEffect(() => {
    if (!transactionId || !hasValidAmount) return;

    const handle = setTimeout(() => {
      updateTokenAmount(destTokenHumanAmount);
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [transactionId, hasValidAmount, destTokenHumanAmount, updateTokenAmount]);

  const targetAmountUsd = totals?.targetAmount?.usd;
  const totalPayUsd = totals?.total?.usd;

  const hasInsufficientFunds = useMemo(() => {
    if (!payToken) return false;

    const payBalanceUsd = new BigNumber(payToken.balanceUsd ?? '0');
    const required = new BigNumber(
      totalPayUsd ?? targetAmountUsd ?? usdAmountNumber,
    );

    if (required.isZero()) return false;

    return payBalanceUsd.isLessThan(required);
  }, [payToken, totalPayUsd, targetAmountUsd, usdAmountNumber]);

  const isConfirmDisabled =
    !transactionId ||
    !payToken ||
    availableTokens.length === 0 ||
    !hasValidAmount ||
    hasInsufficientFunds ||
    isSubmitting;

  const isConfirmLoading = isSubmitting || (isQuoteLoading && hasValidAmount);

  const handleConfirm = useCallback(async () => {
    if (!transactionId) return;

    setIsSubmitting(true);
    markConfirmed();

    try {
      await Engine.context.ApprovalController.acceptRequest(
        transactionId,
        undefined,
        { waitForResult: true },
      );
      onClose();
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    } catch (error) {
      Logger.error(error as Error, '[QuickBuy] Failed to accept approval');
    } finally {
      setIsSubmitting(false);
    }
  }, [transactionId, onClose, navigation, markConfirmed]);

  const getButtonLabel = useCallback(() => {
    if (hasInsufficientFunds) {
      return strings('bridge.insufficient_funds');
    }
    if (isSubmitting) {
      return strings('bridge.submitting_transaction');
    }
    return strings('social_leaderboard.trader_position.buy');
  }, [hasInsufficientFunds, isSubmitting]);

  return {
    isSubmitting,
    hasInsufficientFunds,
    isQuoteLoading,
    hasValidAmount,
    isConfirmDisabled,
    isConfirmLoading,
    getButtonLabel,
    totalPayUsd,
    targetAmountUsd,
    handleConfirm,
  };
}

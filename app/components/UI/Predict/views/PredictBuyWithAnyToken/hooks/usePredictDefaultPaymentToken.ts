import { useEffect, useMemo, useRef } from 'react';
import { Hex } from 'viem';
import { useSelector } from 'react-redux';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { useTransactionPayAvailableTokens } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayAvailableTokens';
import { useTransactionMetadataRequest } from '../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { getBestToken } from '../../../../../Views/confirmations/utils/getBestToken';
import {
  selectMetaMaskPayTokensFlags,
  getPreferredTokensForTransactionType,
} from '../../../../../../selectors/featureFlagController/confirmations';
import { isHardwareAccount } from '../../../../../../util/address';
import { MINIMUM_PREDICT_BALANCE_FOR_BET } from '../../../constants/transactions';
import { ActiveOrderState } from '../../../types';
import { TransactionType } from '@metamask/transaction-controller';

/**
 * Initializes the payment token selection on the buy screen. Waits for
 * the active order to reach PREVIEW state (after initPayWithAnyToken),
 * then either resets to Predict balance or auto-selects the best token
 * using the shared getBestToken ranking logic when Predict balance is
 * below MINIMUM_PREDICT_BALANCE_FOR_BET. Runs once per mount.
 */
export function usePredictDefaultPaymentToken() {
  const { data: predictBalance, isLoading: isBalanceLoading } =
    usePredictBalance();
  const { onPaymentTokenChange, resetSelectedPaymentToken } =
    usePredictPaymentToken();
  const { activeOrder } = usePredictActiveOrder();
  const { availableTokens } = useTransactionPayAvailableTokens();
  const payTokensFlags = useSelector(selectMetaMaskPayTokensFlags);
  const transactionMeta = useTransactionMetadataRequest();
  const from = transactionMeta?.txParams?.from as string | undefined;
  const hasInitializedRef = useRef(false);

  const isHardwareWallet = useMemo(
    () => isHardwareAccount(from ?? '') ?? false,
    [from],
  );

  const preferredTokensFromFlags = useMemo(
    () =>
      getPreferredTokensForTransactionType(
        payTokensFlags.preferredTokens,
        TransactionType.predictDeposit,
      ),
    [payTokensFlags.preferredTokens],
  );

  const tokens = useMemo(
    () => availableTokens.filter((t) => !t.disabled),
    [availableTokens],
  );

  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (isBalanceLoading) return;
    if (activeOrder?.state !== ActiveOrderState.PREVIEW) return;

    hasInitializedRef.current = true;

    if (isHardwareWallet) {
      resetSelectedPaymentToken();
      return;
    }

    const balance = predictBalance ?? 0;
    if (balance >= MINIMUM_PREDICT_BALANCE_FOR_BET) {
      resetSelectedPaymentToken();
      return;
    }

    const bestToken = getBestToken({
      isHardwareWallet,
      isWithdraw: false,
      lastWithdrawToken: undefined,
      preferredToken: undefined,
      preferredTokensFromFlags,
      minimumRequiredTokenBalance: payTokensFlags.minimumRequiredTokenBalance,
      targetToken: undefined,
      tokens,
    });

    if (bestToken) {
      const matchingAsset = tokens.find(
        (t) =>
          t.address?.toLowerCase() === bestToken.address.toLowerCase() &&
          (t.chainId as Hex)?.toLowerCase() === bestToken.chainId.toLowerCase(),
      );

      if (matchingAsset) {
        onPaymentTokenChange(matchingAsset);
      } else {
        resetSelectedPaymentToken();
      }
    } else {
      resetSelectedPaymentToken();
    }
  }, [
    predictBalance,
    isBalanceLoading,
    tokens,
    onPaymentTokenChange,
    resetSelectedPaymentToken,
    activeOrder?.state,
    isHardwareWallet,
    preferredTokensFromFlags,
    payTokensFlags.minimumRequiredTokenBalance,
  ]);
}

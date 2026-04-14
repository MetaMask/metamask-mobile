import { useEffect, useRef } from 'react';
import { BigNumber } from 'bignumber.js';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { useAccountTokens } from '../../../../../Views/confirmations/hooks/send/useAccountTokens';
import { TokenStandard } from '../../../../../Views/confirmations/types/token';
import { MINIMUM_BET } from '../../../constants/transactions';
import { ActiveOrderState } from '../../../types';

/**
 * Initializes the payment token selection on the buy screen. Waits for
 * the active order to reach PREVIEW state (after initPayWithAnyToken),
 * then either resets to Predict balance or auto-selects the token with
 * the highest fiat balance when Predict balance is below MINIMUM_BET.
 * Runs once per mount.
 */
export function usePredictDefaultPaymentToken() {
  const { data: predictBalance, isLoading: isBalanceLoading } =
    usePredictBalance();
  const { onPaymentTokenChange, resetSelectedPaymentToken } =
    usePredictPaymentToken();
  const { activeOrder } = usePredictActiveOrder();
  const tokens = useAccountTokens();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (isBalanceLoading) return;
    if (activeOrder?.state !== ActiveOrderState.PREVIEW) return;

    hasInitializedRef.current = true;

    const balance = predictBalance ?? 0;
    if (balance >= MINIMUM_BET) {
      resetSelectedPaymentToken();
      return;
    }

    const bestToken = tokens.find(
      (token) =>
        token.accountType?.includes('eip155') &&
        token.standard === TokenStandard.ERC20 &&
        Boolean(token.address && token.chainId) &&
        token.fiat?.balance != null &&
        new BigNumber(token.fiat.balance).isGreaterThan(0),
    );

    if (bestToken) {
      onPaymentTokenChange(bestToken);
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
  ]);
}

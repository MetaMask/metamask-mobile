import { useEffect, useRef } from 'react';
import { BigNumber } from 'bignumber.js';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { useAccountTokens } from '../../../../../Views/confirmations/hooks/send/useAccountTokens';
import { TokenStandard } from '../../../../../Views/confirmations/types/token';
import { MINIMUM_BET } from '../../../constants/transactions';
import { ActiveOrderState } from '../../../types';
import { isTestNet } from '../../../../../../util/networks';

/**
 * Initializes the payment token selection once per mounted buy sheet. Waits
 * for the active order to reach PREVIEW state (after initPayWithAnyToken),
 * then either resets to Predict balance or auto-selects the token with the
 * highest fiat balance when Predict balance is below MINIMUM_BET.
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

    const balance = predictBalance ?? 0;
    if (balance >= MINIMUM_BET) {
      hasInitializedRef.current = true;
      resetSelectedPaymentToken();
      return;
    }

    const bestToken = tokens.find(
      (token) =>
        token.accountType?.includes('eip155') &&
        token.standard === TokenStandard.ERC20 &&
        token.address &&
        token.chainId &&
        !isTestNet(token.chainId) &&
        token.fiat?.balance != null &&
        new BigNumber(token.fiat.balance).isGreaterThan(0),
    );

    if (bestToken) {
      hasInitializedRef.current = true;
      onPaymentTokenChange(bestToken);
    } else {
      if (tokens.length === 0) {
        return;
      }

      hasInitializedRef.current = true;
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

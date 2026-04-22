import { useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  type OrderFormState,
  type SelectedPaymentTokenSource,
} from '@metamask/perps-controller';
import { usePerpsPayWithToken } from './useIsPerpsBalanceSelected';
import {
  arePaymentTokensEqual,
  useDefaultPayWithTokenWhenNoPerpsBalance,
} from './useDefaultPayWithTokenWhenNoPerpsBalance';

/**
 * Hook to save pending trade configuration when user navigates away from the trade screen
 * Saves the current form state (including pay-with token selection) so it can be restored when user returns within 5 minutes
 */
export function usePerpsSavePendingConfig(orderForm: OrderFormState) {
  const { PerpsController } = Engine.context;
  const selectedPaymentToken = usePerpsPayWithToken();
  const defaultPayTokenWhenNoPerpsBalance =
    useDefaultPayWithTokenWhenNoPerpsBalance();

  const selectedPaymentTokenSource = useMemo<
    SelectedPaymentTokenSource | undefined
  >(() => {
    if (!selectedPaymentToken) {
      return undefined;
    }

    return arePaymentTokensEqual(
      selectedPaymentToken,
      defaultPayTokenWhenNoPerpsBalance,
    )
      ? 'autoNoPerpsBalance'
      : 'explicit';
  }, [defaultPayTokenWhenNoPerpsBalance, selectedPaymentToken]);

  const config = useMemo(
    () => ({
      amount: orderForm.amount,
      leverage: orderForm.leverage,
      takeProfitPrice: orderForm.takeProfitPrice,
      stopLossPrice: orderForm.stopLossPrice,
      limitPrice: orderForm.limitPrice,
      orderType: orderForm.type,
      selectedPaymentToken: selectedPaymentToken
        ? {
            description: selectedPaymentToken.description,
            address: selectedPaymentToken.address,
            chainId: selectedPaymentToken.chainId,
          }
        : null,
      ...(selectedPaymentToken && { selectedPaymentTokenSource }),
    }),
    [
      orderForm.amount,
      orderForm.leverage,
      orderForm.takeProfitPrice,
      orderForm.stopLossPrice,
      orderForm.limitPrice,
      orderForm.type,
      selectedPaymentToken,
      selectedPaymentTokenSource,
    ],
  );

  // Save config when component loses focus (user navigates away)
  useFocusEffect(
    useCallback(
      () => () => {
        if (orderForm.asset) {
          PerpsController.savePendingTradeConfiguration(
            orderForm.asset,
            config,
          );
        }
      },
      [orderForm.asset, PerpsController, config],
    ),
  );

  // Also save on unmount as a fallback
  useEffect(
    () => () => {
      if (orderForm.asset) {
        PerpsController.savePendingTradeConfiguration(orderForm.asset, config);
      }
    },
    [orderForm.asset, PerpsController, config],
  );
}

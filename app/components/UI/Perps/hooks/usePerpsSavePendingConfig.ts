import { useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { type OrderFormState } from '@metamask/perps-controller';
import { usePerpsPayWithToken } from './useIsPerpsBalanceSelected';

export interface PendingTradeConfigExtras {
  /** Pro-only reduce-only flag restored with the 30s draft. */
  reduceOnly?: boolean;
}

/**
 * Hook to save pending trade configuration when user navigates away from the trade screen.
 * Saves the current form state so it can be restored when the user returns within 30 seconds.
 */
export function usePerpsSavePendingConfig(
  orderForm: OrderFormState,
  extras: PendingTradeConfigExtras = {},
) {
  const { PerpsController } = Engine.context;
  const selectedPaymentToken = usePerpsPayWithToken();
  const { reduceOnly } = extras;

  const config = useMemo(
    () => ({
      amount: orderForm.amount,
      leverage: orderForm.leverage,
      takeProfitPrice: orderForm.takeProfitPrice,
      stopLossPrice: orderForm.stopLossPrice,
      limitPrice: orderForm.limitPrice,
      orderType: orderForm.type,
      reduceOnly,
      selectedPaymentToken: selectedPaymentToken
        ? {
            description: selectedPaymentToken.description,
            address: selectedPaymentToken.address,
            chainId: selectedPaymentToken.chainId,
          }
        : null,
    }),
    [
      orderForm.amount,
      orderForm.leverage,
      orderForm.takeProfitPrice,
      orderForm.stopLossPrice,
      orderForm.limitPrice,
      orderForm.type,
      reduceOnly,
      selectedPaymentToken,
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

import { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { OrderFormState } from '../types/perps-types';
import { selectSelectedPaymentToken } from '../controllers/selectors';
import { usePerpsSelector } from './usePerpsSelector';

/**
 * Hook to save pending trade configuration when user navigates away from the trade screen
 * Saves the current form state (including pay-with token selection) so it can be restored when user returns within 5 minutes
 */
export function usePerpsSavePendingConfig(orderForm: OrderFormState) {
  const { PerpsController } = Engine.context;
  const selectedPaymentToken = usePerpsSelector(selectSelectedPaymentToken);

  const config = useCallback(
    () => ({
      amount: orderForm.amount,
      leverage: orderForm.leverage,
      takeProfitPrice: orderForm.takeProfitPrice,
      stopLossPrice: orderForm.stopLossPrice,
      limitPrice: orderForm.limitPrice,
      orderType: orderForm.type,
      selectedPaymentToken: selectedPaymentToken ?? null,
    }),
    [
      orderForm.amount,
      orderForm.leverage,
      orderForm.takeProfitPrice,
      orderForm.stopLossPrice,
      orderForm.limitPrice,
      orderForm.type,
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
            config(),
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
        PerpsController.savePendingTradeConfiguration(
          orderForm.asset,
          config(),
        );
      }
    },
    [orderForm.asset, PerpsController, config],
  );
}

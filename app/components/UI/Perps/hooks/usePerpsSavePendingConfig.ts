import { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { OrderFormState } from '../types/perps-types';

/**
 * Hook to save pending trade configuration when user navigates away from the trade screen
 * Saves the current form state so it can be restored when user returns within 5 minutes
 */
export function usePerpsSavePendingConfig(orderForm: OrderFormState) {
  const { PerpsController } = Engine.context;

  // Save config when component loses focus (user navigates away)
  useFocusEffect(
    useCallback(
      () => () => {
        // On blur (component unmounted or lost focus)
        // Save the current form state as pending config
        if (orderForm.asset) {
          PerpsController.savePendingTradeConfiguration(orderForm.asset, {
            amount: orderForm.amount,
            leverage: orderForm.leverage,
            takeProfitPrice: orderForm.takeProfitPrice,
            stopLossPrice: orderForm.stopLossPrice,
            limitPrice: orderForm.limitPrice,
            orderType: orderForm.type,
          });
        }
      },
      [orderForm, PerpsController],
    ),
  );

  // Also save on unmount as a fallback
  useEffect(
    () => () => {
      if (orderForm.asset) {
        PerpsController.savePendingTradeConfiguration(orderForm.asset, {
          amount: orderForm.amount,
          leverage: orderForm.leverage,
          takeProfitPrice: orderForm.takeProfitPrice,
          stopLossPrice: orderForm.stopLossPrice,
          limitPrice: orderForm.limitPrice,
          orderType: orderForm.type,
        });
      }
    },
    [orderForm, PerpsController],
  );
}

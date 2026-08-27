import { useCallback, useEffect, useMemo, useRef } from 'react';
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

  // Keep the latest draft in a ref so blur/unmount save the current values
  // without re-running effect cleanups on every keystroke (which would write
  // Redux on each edit and reset the 30s TTL).
  const configRef = useRef(config);
  configRef.current = config;
  const assetRef = useRef(orderForm.asset);
  assetRef.current = orderForm.asset;

  const savePendingConfig = useCallback(() => {
    const asset = assetRef.current;
    if (asset) {
      PerpsController.savePendingTradeConfiguration(asset, configRef.current);
    }
  }, [PerpsController]);

  // Save config when the screen blurs or unmounts — not when the draft
  // object identity changes (that would write Redux on every keystroke).
  useFocusEffect(
    useCallback(
      () => () => {
        savePendingConfig();
      },
      [savePendingConfig],
    ),
  );

  useEffect(
    () => () => {
      savePendingConfig();
    },
    [savePendingConfig],
  );
}

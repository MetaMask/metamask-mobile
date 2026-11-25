import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { type OrderFormState } from '@metamask/perps-controller';
import { usePerpsPayWithToken } from './useIsPerpsBalanceSelected';

/**
 * Save pending trade configuration when the user leaves the trade screen.
 * Restored if they return within 30 seconds.
 */
export function usePerpsSavePendingConfig(
  orderForm: OrderFormState,
  extras: { reduceOnly?: boolean } = {},
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
      direction: orderForm.direction,
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
      orderForm.direction,
      reduceOnly,
      selectedPaymentToken,
    ],
  );

  // Latest draft in refs so blur/unmount save current values without writing
  // Redux on every keystroke (which would reset the 30s TTL).
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

import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import Engine from '../../../../core/Engine';
import { is } from '@metamask/superstruct';
import { PayWithTokenSchema } from './useIsPerpsBalanceSelected';

export interface UsePerpsPaymentTokenResult {
  onPaymentTokenChange: (token: AssetType | null) => void;
}

export function usePerpsPaymentToken(): UsePerpsPaymentTokenResult {
  const { setPayToken } = useTransactionPayToken();

  const onPaymentTokenChange = useCallback(
    (token: AssetType | null) => {
      const payload =
        token != null && is(token, PayWithTokenSchema)
          ? {
              description: token.description,
              address: token.address,
              chainId: token.chainId,
            }
          : null;
      Engine.context.PerpsController?.setSelectedPaymentToken?.(payload);
      if (token != null && is(token, PayWithTokenSchema)) {
        setPayToken({
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        });
      }
    },
    [setPayToken],
  );
  return { onPaymentTokenChange };
}

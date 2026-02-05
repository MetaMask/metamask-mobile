import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import Engine from '../../../../core/Engine';

export interface UsePerpsPaymentTokenResult {
  onPaymentTokenChange: (token: AssetType | null) => void;
}

export function usePerpsPaymentToken(): UsePerpsPaymentTokenResult {
  const { setPayToken } = useTransactionPayToken();

  const onPaymentTokenChange = useCallback(
    (token: AssetType | null) => {
      Engine.context.PerpsController?.setSelectedPaymentToken?.(token);
      if (token) {
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

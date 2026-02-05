import { useCallback } from 'react';
import { AssetType } from '../../../Views/confirmations/types/token';
import Engine from '../../../../core/Engine';

export interface UsePerpsPaymentTokenResult {
  onPaymentTokenChange: (token: AssetType | null) => void;
}

export function usePerpsPaymentToken(): UsePerpsPaymentTokenResult {
  const onPaymentTokenChange = useCallback((token: AssetType | null) => {
    Engine.context.PerpsController?.setSelectedPaymentToken?.(token);
  }, []);
  return { onPaymentTokenChange };
}

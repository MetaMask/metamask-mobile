import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AssetType } from '../../../Views/confirmations/types/token';
import { selectPerpsSelectedPaymentToken } from '../selectors/perpsController';
import Engine from '../../../../core/Engine';

export interface PerpsPaymentTokenContextType {
  selectedToken: AssetType | null;
  onPaymentTokenChange: (token: AssetType | null) => void;
}

export function usePerpsPaymentToken(): PerpsPaymentTokenContextType {
  const selectedTokenRaw = useSelector(selectPerpsSelectedPaymentToken);
  const selectedToken = selectedTokenRaw as AssetType | null;
  const onPaymentTokenChange = useCallback((token: AssetType | null) => {
    Engine.context.PerpsController?.setSelectedPaymentToken?.(token);
  }, []);
  return useMemo(
    () => ({ selectedToken, onPaymentTokenChange }),
    [selectedToken, onPaymentTokenChange],
  );
}

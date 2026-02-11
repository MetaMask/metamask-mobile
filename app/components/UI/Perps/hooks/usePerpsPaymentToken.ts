import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import Engine from '../../../../core/Engine';
import { parsePayWithToken } from '../utils/parsePayWithToken';

export interface UsePerpsPaymentTokenResult {
  onPaymentTokenChange: (token: AssetType | null) => void;
}

export function usePerpsPaymentToken(): UsePerpsPaymentTokenResult {
  const { setPayToken } = useTransactionPayToken();

  const onPaymentTokenChange = useCallback(
    (token: AssetType | null) => {
      const parsed =
        token === null || token === undefined ? null : parsePayWithToken(token);
      const payload =
        parsed === null
          ? null
          : {
              description: parsed.description,
              address: parsed.address,
              chainId: parsed.chainId,
            };
      Engine.context.PerpsController?.setSelectedPaymentToken?.(payload);
      if (parsed !== null) {
        setPayToken({
          address: parsed.address as Hex,
          chainId: parsed.chainId as Hex,
        });
      }
    },
    [setPayToken],
  );
  return { onPaymentTokenChange };
}

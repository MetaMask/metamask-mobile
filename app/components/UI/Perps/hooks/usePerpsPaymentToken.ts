import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import Engine from '../../../../core/Engine';
import { parsePayWithToken } from '../utils/parsePayWithToken';
import { selectEvmAssetIdResolver } from '../../../../selectors/assets/assets-controller';

export type PerpsPaymentTokenInput =
  | AssetType
  | { address: string; chainId: string }
  | null;

export interface UsePerpsPaymentTokenResult {
  onPaymentTokenChange: (token: PerpsPaymentTokenInput) => void;
}

export function usePerpsPaymentToken(): UsePerpsPaymentTokenResult {
  const { setPayToken } = useTransactionPayToken();
  const resolveAssetId = useSelector(selectEvmAssetIdResolver);

  const onPaymentTokenChange = useCallback(
    (token: PerpsPaymentTokenInput) => {
      const parsed =
        token === null || token === undefined ? null : parsePayWithToken(token);

      Engine.context.PerpsController?.setSelectedPaymentToken?.(parsed);
      if (parsed !== null) {
        setPayToken({
          assetId: resolveAssetId({
            address: parsed.address as Hex,
            chainId: parsed.chainId as Hex,
          }),
        });
      }
    },
    [resolveAssetId, setPayToken],
  );
  return { onPaymentTokenChange };
}

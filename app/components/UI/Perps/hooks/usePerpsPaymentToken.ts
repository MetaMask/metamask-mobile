import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import Engine from '../../../../core/Engine';
import { parsePayWithToken } from '../utils/parsePayWithToken';
import { selectEvmAssetIdEncoder } from '../../../../selectors/assets/assets-controller';

export type PerpsPaymentTokenInput =
  | AssetType
  | { address: string; chainId: string }
  | null;

export interface UsePerpsPaymentTokenResult {
  onPaymentTokenChange: (token: PerpsPaymentTokenInput) => void;
}

export function usePerpsPaymentToken(): UsePerpsPaymentTokenResult {
  const { setPayToken } = useTransactionPayToken();
  const encodeAssetId = useSelector(selectEvmAssetIdEncoder);

  const onPaymentTokenChange = useCallback(
    (token: PerpsPaymentTokenInput) => {
      const parsed =
        token === null || token === undefined ? null : parsePayWithToken(token);

      Engine.context.PerpsController?.setSelectedPaymentToken?.(parsed);
      if (parsed !== null) {
        setPayToken({
          assetId: encodeAssetId({
            address: parsed.address as Hex,
            chainId: parsed.chainId as Hex,
          }),
        });
      }
    },
    [encodeAssetId, setPayToken],
  );
  return { onPaymentTokenChange };
}

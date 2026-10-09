import { useSelector } from 'react-redux';
import { selectAssetsMemecoinTdpV1Enabled } from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import {
  TokenDetailsVariant,
  type TokenDetailsRouteParams,
} from '../constants/constants';
import { useTokenAssetDetails } from '../queries/tokenAssetQuery';
import { useIsMemeToken } from './useIsMemeToken';
import { useTokenCaipAssetId } from './useTokenCaipAssetId';

/**
 * Which Token Details page to render.
 *
 * `pending` means the memecoin flag is on and `/v2/assets` has not settled.
 * The route shows an interim shell until then, including for mainnet PEPE.
 * `variant` is the new page when set, and the legacy page when `null`.
 */
export interface TokenDetailsVariantResult {
  variant: TokenDetailsVariant | null;
  isPending: boolean;
}

/**
 * Resolves which Token Details page applies.
 *
 * The memecoin flag gates the new page. Every token, including mainnet PEPE,
 * waits for `/v2/assets`. PEPE opens the new page after that request settles.
 * Every other token opens the new page only when `launchpadData` is present.
 */
export const useTokenDetailsVariant = (
  token: TokenDetailsRouteParams,
): TokenDetailsVariantResult => {
  const caipAssetId = useTokenCaipAssetId(token);

  const isMemecoinTdpEnabled = useSelector(selectAssetsMemecoinTdpV1Enabled);
  const { isMeme } = useIsMemeToken({
    assetId: caipAssetId,
    enabled: isMemecoinTdpEnabled,
  });
  const { asset, isLoading } = useTokenAssetDetails(
    isMemecoinTdpEnabled ? caipAssetId : null,
  );

  if (!isMemecoinTdpEnabled) {
    return { variant: null, isPending: false };
  }

  if (isLoading) {
    return { variant: null, isPending: true };
  }

  if (isMeme || asset?.launchpadData != null) {
    return { variant: TokenDetailsVariant.Memecoin, isPending: false };
  }

  return { variant: null, isPending: false };
};

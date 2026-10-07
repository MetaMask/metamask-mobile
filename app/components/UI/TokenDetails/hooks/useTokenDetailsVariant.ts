import { useSelector } from 'react-redux';
import { selectAssetsMemecoinTdpV1Enabled } from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import {
  TokenDetailsVariant,
  type TokenDetailsRouteParams,
} from '../constants/constants';
import { useTokenAssetDetails } from '../queries/useTokenAssetDetails';
import { useIsMemeToken } from './useIsMemeToken';
import { useTokenCaipAssetId } from './useTokenCaipAssetId';

/**
 * Which Token Details page to render.
 *
 * `pending` means the memecoin flag is on, the token is not the PEPE test
 * asset, and `/v2/assets` has not settled. The route shows an interim shell
 * until then. `variant` is the new page when set, and the legacy page when
 * `null`.
 */
export interface TokenDetailsVariantResult {
  variant: TokenDetailsVariant | null;
  isPending: boolean;
}

/**
 * Resolves which Token Details page applies.
 *
 * The memecoin flag gates the new page. Mainnet PEPE opens it immediately so
 * the test path does not wait on the API. Every other token waits for
 * `/v2/assets` and opens the new page only when `launchpadData` is present.
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
  const shouldWaitForAsset = isMemecoinTdpEnabled && !isMeme;
  const { asset, isLoading } = useTokenAssetDetails(
    shouldWaitForAsset ? caipAssetId : null,
  );

  if (!isMemecoinTdpEnabled) {
    return { variant: null, isPending: false };
  }

  if (isMeme) {
    return { variant: TokenDetailsVariant.Memecoin, isPending: false };
  }

  if (isLoading) {
    return { variant: null, isPending: true };
  }

  if (asset?.launchpadData != null) {
    return { variant: TokenDetailsVariant.Memecoin, isPending: false };
  }

  return { variant: null, isPending: false };
};

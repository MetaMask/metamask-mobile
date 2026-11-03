import { useSelector } from 'react-redux';
import type { CaipAssetType } from '@metamask/utils';
import { useTokenAssetDetails } from '../queries/tokenAssetQuery';
import { selectMemecoinTdpV1TokenApiBaseUrl } from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';

export interface UseIsMemeTokenOptions {
  assetId: CaipAssetType | null;
  /** Gates the network call — when `false` the query is disabled. */
  enabled?: boolean;
}

export interface UseIsMemeTokenResult {
  isMeme: boolean;
  /** `true` while the /v2/assets query is still in flight. */
  isLoading: boolean;
}

/**
 * A token is treated as a meme token when its `/v2/assets` record carries
 * `launchpadData`. The field is populated for tokens launched through
 * on-chain launchpads (pump.fun, Pons, etc.) and absent for standard
 * ERC-20s/SPL tokens.
 */
export const useIsMemeToken = ({
  assetId,
  enabled = true,
}: UseIsMemeTokenOptions): UseIsMemeTokenResult => {
  // The same host the page itself reads. Detection has to ask whoever returns
  // `launchpadData`, or no token is ever recognised as a meme token.
  const tokenApiBaseUrl = useSelector(selectMemecoinTdpV1TokenApiBaseUrl);
  const { asset, isLoading } = useTokenAssetDetails(
    enabled ? assetId : null,
    tokenApiBaseUrl,
  );

  return {
    isMeme: asset?.launchpadData != null,
    isLoading,
  };
};

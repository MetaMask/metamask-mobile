import type { CaipAssetType } from '@metamask/utils';
// TODO: remove DEV_TOKEN_API_BASE_URL once prod returns launchpadData
import {
  DEV_TOKEN_API_BASE_URL,
  useTokenAssetDetails,
} from '../queries/tokenAssetQuery';

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
  // TODO: remove DEV_TOKEN_API_BASE_URL once prod returns launchpadData
  const { asset, isLoading } = useTokenAssetDetails(
    enabled ? assetId : null,
    DEV_TOKEN_API_BASE_URL,
  );

  return {
    isMeme: asset?.launchpadData != null,
    isLoading,
  };
};

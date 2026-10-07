import type { CaipAssetType } from '@metamask/utils';

/**
 * Placeholder meme-token check for the ASSETS-4055 feature flag rollout.
 *
 * TODO(ASSETS-4055): replace with a real signal — either a backend
 * `badges:v1:meme` label from token.api.cx.metamask.io or the
 * `/v3/tokens/meme/trending` endpoint, cached via TanStack Query.
 * For now we hardcode PEPE on mainnet so the TDP routing path is
 * exercisable end-to-end behind the LaunchDarkly flag.
 */
export const MAINNET_PEPE_ASSET_ID =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933';

const HARDCODED_MEME_ASSET_IDS: ReadonlySet<string> = new Set([
  MAINNET_PEPE_ASSET_ID,
]);

export const isHardcodedMemeAssetId = (
  assetId: string | null | undefined,
): boolean => Boolean(assetId && HARDCODED_MEME_ASSET_IDS.has(assetId));

export interface UseIsMemeTokenOptions {
  assetId: CaipAssetType | null;
  /**
   * Reserved for the real impl (gates the network call). Ignored by the
   * hardcoded placeholder — present so callers don't need to change when
   * we swap this out.
   */
  enabled?: boolean;
}

export interface UseIsMemeTokenResult {
  isMeme: boolean;
}

export const useIsMemeToken = ({
  assetId,
}: UseIsMemeTokenOptions): UseIsMemeTokenResult => ({
  isMeme: isHardcodedMemeAssetId(assetId),
});

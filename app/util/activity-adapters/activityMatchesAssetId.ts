import { assetIdsMatch } from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';
import type { ActivityListItem } from './types';

/**
 * Mirrors extension `ui/pages/activity/helpers.ts#activityMatchesAssetId`.
 * Uses `assetIdsMatch` from `@metamask/bridge-controller` for EVM/NEVM parity.
 */
export function activityMatchesAssetId(
  item: ActivityListItem,
  assetId: CaipAssetType,
): boolean {
  const { data } = item;
  const tokenAssetIds = [
    'token' in data ? data.token?.assetId : undefined,
    'sourceToken' in data ? data.sourceToken?.assetId : undefined,
    'destinationToken' in data ? data.destinationToken?.assetId : undefined,
  ];

  return tokenAssetIds.some(
    (tokenAssetId) =>
      tokenAssetId !== undefined && assetIdsMatch(tokenAssetId, assetId),
  );
}

type BridgeQuoteAsset = {
  assetId?: string;
  address?: string;
};

type BridgeQuoteLegs = {
  srcAsset?: BridgeQuoteAsset;
  destAsset?: BridgeQuoteAsset;
};

export function bridgeQuoteLegMatchesAsset(
  quote: BridgeQuoteLegs | undefined,
  pageAssetId: string | undefined,
  pageAddress?: string,
): boolean {
  if (!quote || !pageAssetId) {
    return false;
  }

  const legAssetIds = [quote.srcAsset?.assetId, quote.destAsset?.assetId].filter(
    (id): id is string => Boolean(id),
  );

  if (
    legAssetIds.some((legAssetId) => assetIdsMatch(legAssetId, pageAssetId))
  ) {
    return true;
  }

  if (!pageAddress) {
    return false;
  }

  const normalizedPageAddress = pageAddress.toLowerCase();
  const legAddresses = [quote.srcAsset?.address, quote.destAsset?.address]
    .filter((address): address is string => Boolean(address))
    .map((address) => address.toLowerCase());

  return legAddresses.includes(normalizedPageAddress);
}

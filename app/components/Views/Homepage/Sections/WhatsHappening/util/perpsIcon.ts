import type { RelatedAsset } from '@metamask/ai-controllers';
import { getAssetIconUrls } from '../../../../../UI/Perps/utils/marketUtils';
import { K_PREFIX_ASSETS } from '../../../../../UI/Perps/components/PerpsTokenLogo/PerpsAssetBgConfig';

/**
 * Resolves the Perps icon URL for a related asset using its `hlPerpsMarket`
 * (Hyperliquid market name). Returns undefined when the asset has no
 * Hyperliquid mapping, in which case AvatarToken falls back to its initials.
 */
export const getPerpsIconSource = (
  asset: RelatedAsset,
): { uri: string } | undefined => {
  const market = asset.hlPerpsMarket?.[0];
  if (!market) return undefined;
  const urls = getAssetIconUrls(market, K_PREFIX_ASSETS);
  if (!urls) return undefined;
  return { uri: urls.primary };
};

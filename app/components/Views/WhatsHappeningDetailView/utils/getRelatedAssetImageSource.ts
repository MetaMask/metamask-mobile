import type { RelatedAsset } from '@metamask/ai-controllers';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import { CaipAssetType, parseCaipAssetType } from '@metamask/utils';
import type { ImageSourcePropType } from 'react-native';
import { getTokenIconUrl, getTokenImageSource } from '../../../UI/Bridge/utils';
import { getAssetIconUrls } from '../../../UI/Perps/utils/marketUtils';
import { K_PREFIX_ASSETS } from '../../../UI/Perps/components/PerpsTokenLogo/PerpsAssetBgConfig';

/**
 * Image source for a market-overview `RelatedAsset`.
 *
 * Resolution order: CAIP-19 wallet CDN + bundled PNG (regular crypto tokens) →
 * Perps SVG via `hlPerpsMarket` when `caip19` is empty (synthetic-only assets
 * like `xyz:TSLA`) → bundled icon by symbol.
 *
 * `hlPerpsMarket` is NOT consulted when `caip19` is populated because regular
 * crypto tokens (BTC, ETH) carry it too, and Perps CDN only serves SVGs that
 * `AvatarToken` cannot render remotely.
 */
export const getRelatedAssetImageSource = (
  asset: RelatedAsset,
): ImageSourcePropType | undefined => {
  // 1. Wallet CDN via CAIP-19 (PNG — works with AvatarToken)
  const firstCaip = asset.caip19[0];
  if (firstCaip) {
    try {
      const { chainId } = parseCaipAssetType(firstCaip as CaipAssetType);
      const cdnUrl = getTokenIconUrl(
        firstCaip as CaipAssetType,
        isNonEvmChainId(chainId),
      );
      return getTokenImageSource(asset.symbol, cdnUrl);
    } catch {
      // Invalid or unsupported CAIP-19 string — fall through
    }
  }

  // 2. Perps SVG for assets with no CAIP-19 (e.g. xyz:TSLA via hlPerpsMarket)
  const firstHlPerpsMarket = asset.hlPerpsMarket?.[0];
  if (firstHlPerpsMarket && asset.caip19.length === 0) {
    const urls = getAssetIconUrls(firstHlPerpsMarket, K_PREFIX_ASSETS);
    if (urls) {
      return { uri: urls.primary };
    }
  }

  // 3. Bundled icons only (symbol lookup)
  return getTokenImageSource(asset.symbol, undefined);
};

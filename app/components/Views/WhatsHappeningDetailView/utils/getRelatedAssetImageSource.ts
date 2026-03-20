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
 * Resolution order (first match wins):
 * 1. **MetaMask wallet CDN + bundled icons** via CAIP-19 (PNG). This covers all
 * regular crypto tokens (BTC, ETH, SOL, …) and is the primary path.
 * 2. **Perps icon** via `perpsAssetId` when the asset has no CAIP-19 id. Returns
 * the MetaMask-hosted primary SVG URL so that purely Perps assets like
 * `xyz:TSLA` resolve consistently with `PerpsTokenLogo`. Note: rendering SVG
 * URIs requires `SvgUri` or `PerpsTokenLogo`; plain `AvatarToken` will fall
 * back to initials until that is wired in.
 * 3. **Bundled icons only** by symbol when all above paths fail.
 *
 * `hlPerpsMarket` is intentionally NOT used as a Perps fallback because many
 * regular crypto tokens (BTC, ETH, SOL) carry it, and Perps CDN only serves SVG
 * files that `AvatarToken` cannot render remotely.
 */

/**
 * Until `@metamask/ai-controllers` is bumped to the version that ships
 * `perpsAssetId`, we intersect with the optional local field so TypeScript
 * does not complain.
 */
type RelatedAssetExtended = RelatedAsset & {
  perpsAssetId?: string;
};

export const getRelatedAssetImageSource = (
  asset: RelatedAssetExtended,
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

  // 2. Perps SVG for assets with no CAIP-19 (e.g. xyz:TSLA via perpsAssetId)
  //    hlPerpsMarket is skipped intentionally — it is populated for regular
  //    crypto tokens (BTC, ETH, SOL) which are already covered by CAIP-19 above.
  if (asset.perpsAssetId) {
    const urls = getAssetIconUrls(asset.perpsAssetId, K_PREFIX_ASSETS);
    if (urls) {
      return { uri: urls.primary };
    }
  }

  // 3. Bundled icons only (symbol lookup)
  return getTokenImageSource(asset.symbol, undefined);
};

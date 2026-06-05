import type { RelatedAsset } from '@metamask/ai-controllers';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import { CaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { getTokenIconUrl, getTokenImageSource } from '../../../UI/Bridge/utils';
import { getAssetIconUrls } from '../../../UI/Perps/utils/marketUtils';
import { K_PREFIX_ASSETS } from '../../../UI/Perps/components/PerpsTokenLogo/PerpsAssetBgConfig';

/**
 * Discriminated result from {@link getRelatedAssetImageSource}.
 * `bundled` — local require() number, safe for AvatarToken.
 * `png` — wallet-CDN PNG URI, safe for AvatarToken.
 * `perps` — remote Perps SVG; use expo-image/PerpsTokenLogo (AvatarToken
 * cannot reliably load remote SVGs). `symbol` is the raw market id.
 */
export type RelatedAssetImage =
  | { kind: 'bundled'; source: number }
  | { kind: 'png'; uri: string }
  | { kind: 'perps'; symbol: string; primary: string; fallback?: string }
  | undefined;

/**
 * Resolves the image source for a market-overview `RelatedAsset`.
 * Order: (1) wallet CDN/bundled PNG via CAIP-19, (2) Perps SVG via
 * `hlPerpsMarket` when `caip19` is absent (e.g. xyz:TSLA, xyz:BRENT),
 * (3) bundled icon by symbol. `hlPerpsMarket` is skipped when `caip19` is
 * set because the Perps CDN only serves SVGs that AvatarToken cannot render.
 */
export const getRelatedAssetImageSource = (
  asset: RelatedAsset,
): RelatedAssetImage => {
  // 1. Wallet CDN via CAIP-19 (PNG — works with AvatarToken)
  const firstCaip = asset.caip19?.[0];
  if (firstCaip) {
    try {
      const { chainId } = parseCaipAssetType(firstCaip as CaipAssetType);
      const cdnUrl = getTokenIconUrl(
        firstCaip as CaipAssetType,
        isNonEvmChainId(chainId),
      );
      const source = getTokenImageSource(asset.symbol, cdnUrl);
      if (typeof source === 'number') {
        return { kind: 'bundled', source };
      }
      if (
        source &&
        typeof source === 'object' &&
        'uri' in source &&
        typeof source.uri === 'string'
      ) {
        return { kind: 'png', uri: source.uri };
      }
    } catch {
      // Invalid or unsupported CAIP-19 string — fall through
    }
  }

  // 2. Perps SVG for assets with no CAIP-19 (e.g. xyz:TSLA via hlPerpsMarket)
  const firstHlPerpsMarket = asset.hlPerpsMarket?.[0];
  if (firstHlPerpsMarket && !asset.caip19?.length) {
    const urls = getAssetIconUrls(firstHlPerpsMarket, K_PREFIX_ASSETS);
    if (urls) {
      return {
        kind: 'perps',
        symbol: firstHlPerpsMarket,
        primary: urls.primary,
        fallback: urls.fallback,
      };
    }
  }

  // 3. Bundled icons only (symbol lookup)
  const source = getTokenImageSource(asset.symbol, undefined);
  if (typeof source === 'number') {
    return { kind: 'bundled', source };
  }
  return undefined;
};

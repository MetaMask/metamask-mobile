import imageIcons from '../../../images/image-icons';
import type { TokenAmount } from '../../../util/activity-adapters';

/** A locally-bundled image (number) or a remote image source. */
export type TokenIconSource = number | { uri: string };

/**
 * Builds the static token-icon CDN url for a CAIP asset id (e.g.
 * `eip155:1/erc20:0x…` → `…/eip155/1/erc20/0x….png`). EVM ids are lowercased
 * so they match the CDN's casing.
 */
export function getTokenIconUrl(
  assetId: string | undefined,
): string | undefined {
  if (!assetId) {
    return undefined;
  }

  const formattedAssetId = assetId.startsWith('eip155:')
    ? assetId.toLowerCase()
    : assetId;

  return `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${formattedAssetId
    .split(':')
    .join('/')}.png`;
}

/**
 * Resolves the image source for a {@link TokenAmount}: a locally-bundled icon
 * when the symbol is known, otherwise the remote CDN url derived from its asset
 * id. Returns `undefined` when neither is available.
 */
export function getTokenImageSource(
  token: TokenAmount | undefined,
): TokenIconSource | undefined {
  const symbol = token?.symbol;

  if (symbol && Object.keys(imageIcons).includes(symbol)) {
    const localIcon = imageIcons[symbol as keyof typeof imageIcons];
    if (typeof localIcon !== 'function' && typeof localIcon !== 'string') {
      return localIcon as TokenIconSource;
    }
  }

  const iconUrl = getTokenIconUrl(token?.assetId);
  return iconUrl ? { uri: iconUrl } : undefined;
}

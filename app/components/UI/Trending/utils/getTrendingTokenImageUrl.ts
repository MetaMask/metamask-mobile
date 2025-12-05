/**
 * Constructs the token icon image URL from a CAIP assetId
 * @param assetId - The CAIP assetId (e.g., 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')
 * @returns The image URL for the token icon
 */
export const getTrendingTokenImageUrl = (assetId: string): string =>
  `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${assetId
    .split(':')
    .join('/')}.png`;

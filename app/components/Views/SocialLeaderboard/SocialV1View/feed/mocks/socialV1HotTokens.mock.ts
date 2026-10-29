import type { SocialV1HotToken } from '../types';

export const mockHotToken = (
  overrides: Partial<SocialV1HotToken> = {},
): SocialV1HotToken => {
  const { avatar, assetIds, ...rest } = overrides;
  const id = rest.id ?? 'hot-btc';
  const symbol = rest.symbol ?? 'BTC';

  return {
    id,
    symbol,
    label: 'Bitcoin perps',
    ...rest,
    assetIds: assetIds ?? [`eip155:999/perp:${symbol.replace(/:/gu, '.')}`],
    avatar: avatar ?? {
      positionId: id,
      chain: 'hyperliquid',
      tokenAddress: '',
      tokenImageUrl: null,
      tokenSymbol: symbol,
    },
  };
};

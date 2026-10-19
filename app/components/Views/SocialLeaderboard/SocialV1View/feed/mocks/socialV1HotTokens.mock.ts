import type { SocialV1HotToken } from '../types';

export const mockHotToken = (
  overrides: Partial<SocialV1HotToken> = {},
): SocialV1HotToken => {
  const { avatar, ...rest } = overrides;
  const id = rest.id ?? 'hot-btc';
  const symbol = rest.symbol ?? 'BTC';

  return {
    id,
    symbol,
    label: 'Bitcoin perps',
    ...rest,
    avatar: avatar ?? {
      positionId: id,
      chain: 'hyperliquid',
      tokenAddress: '',
      tokenImageUrl: null,
      tokenSymbol: symbol,
    },
  };
};

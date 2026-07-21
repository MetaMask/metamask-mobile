import type { WatchlistTokenWithBalance } from '../../Assets/watchlist/utils/addBalanceToTokens';

import {
  formatWatchlistBalanceFiat,
  mapWatchlistTokenToBridgeToken,
} from './mapWatchlistTokenToBridgeToken';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
}));

const makeWatchlistToken = (
  overrides: Partial<WatchlistTokenWithBalance> = {},
): WatchlistTokenWithBalance => ({
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  balance: '1.5',
  balanceFiat: 3000,
  fiatCurrency: 'usd',
  isInWallet: true,
  ...overrides,
});

describe('formatWatchlistBalanceFiat', () => {
  it('returns undefined when balance or currency is missing', () => {
    expect(formatWatchlistBalanceFiat(undefined, 'usd')).toBeUndefined();
    expect(formatWatchlistBalanceFiat(10, undefined)).toBeUndefined();
  });

  it('formats fiat values for display', () => {
    expect(formatWatchlistBalanceFiat(3000, 'usd', 'en-US')).toBe('$3,000.00');
  });

  it('uses I18n.locale when no locale is provided', () => {
    expect(formatWatchlistBalanceFiat(3000, 'usd')).toBe('$3,000.00');
  });
});

describe('mapWatchlistTokenToBridgeToken', () => {
  it('maps watchlist metadata and balances to a bridge token', () => {
    const result = mapWatchlistTokenToBridgeToken(makeWatchlistToken());

    expect(result).toMatchObject({
      assetId: 'eip155:1/slip44:60',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      chainId: '0x1',
      address: '0x0000000000000000000000000000000000000000',
      balance: '1.5',
      tokenFiatAmount: 3000,
      balanceFiat: '$3,000.00',
    });
  });

  it('maps ERC-20 asset IDs to lowercase contract addresses', () => {
    const result = mapWatchlistTokenToBridgeToken(
      makeWatchlistToken({
        assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        name: 'USD Coin',
      }),
    );

    expect(result.address).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(result.chainId).toBe('0x1');
  });

  it('falls back to the static token icon URL when iconUrl is missing', () => {
    const result = mapWatchlistTokenToBridgeToken(
      makeWatchlistToken({
        assetId: 'eip155:1/erc20:0x6982508145454ce325ddbef9b9008f994fce8312',
        symbol: 'PEPE',
        name: 'Pepe',
        iconUrl: undefined,
      }),
    );

    expect(result.image).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6982508145454ce325ddbef9b9008f994fce8312.png',
    );
  });
});

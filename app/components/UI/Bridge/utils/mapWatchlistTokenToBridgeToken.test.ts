import type { WatchlistTokenWithBalance } from '../../Assets/watchlist/utils/addBalanceToTokens';

import {
  applyWatchlistBridgeTokenFiatDisplay,
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

  it('formats sub-cent balances with subscript notation', () => {
    expect(formatWatchlistBalanceFiat(0.00000614, 'usd', 'en-US')).toBe(
      '$0.0₅614',
    );
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

  it('formats zero-balance watchlist tokens as 0 fiat when currency is missing', () => {
    const result = mapWatchlistTokenToBridgeToken(
      makeWatchlistToken({
        balance: '0',
        balanceFiat: undefined,
        fiatCurrency: undefined,
        isInWallet: false,
      }),
      { defaultCurrency: 'usd' },
    );

    expect(result.balanceFiat).toBe('$0.00');
    expect(result.tokenFiatAmount).toBe(0);
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

  it('re-applies subscript fiat formatting after wallet merge overwrites it', () => {
    const token = applyWatchlistBridgeTokenFiatDisplay(
      {
        address: '0x6982508145454ce325ddbef9b9008f994fce8312',
        symbol: 'PEPE',
        name: 'Pepe',
        decimals: 18,
        chainId: '0x1',
        balance: '1000',
        balanceFiat: '$0.00',
        tokenFiatAmount: 0.00000614,
      },
      'usd',
      'en-US',
    );

    expect(token.balanceFiat).toBe('$0.0₅614');
  });
});

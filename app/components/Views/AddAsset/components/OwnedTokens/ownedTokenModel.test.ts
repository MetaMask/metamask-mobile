import type { V6BalanceItem } from '@metamask/core-backend';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import {
  accountSupportsChain,
  buildCaip10AccountIds,
  buildOwnedTokenRows,
  classifyOwnedBalances,
  createOwnedTokenImageUrl,
  formatOwnedTokenBalance,
  formatOwnedTokenFiat,
  importOwnedTokens,
  indexWalletTokens,
  shortenOwnedTokenAddress,
  type ClassifiedOwnedToken,
} from './ownedTokenModel';

const USDC =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;
const HIDDEN =
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f' as CaipAssetType;
const GHOST =
  'eip155:137/erc20:0x00000000000000000000000000000000000000aa' as CaipAssetType;
const NATIVE = 'eip155:1/slip44:60' as CaipAssetType;

const balance = (
  assetId: string,
  overrides: Partial<V6BalanceItem> = {},
): V6BalanceItem => ({
  object: 'token',
  type: 'erc20',
  accountId: 'eip155:1:0xabc',
  assetId,
  name: 'Token',
  symbol: 'TKN',
  decimals: 18,
  balance: '1',
  ...overrides,
});

const index = indexWalletTokens({
  customAssets: { 'account-1': [USDC] },
  assetsBalance: { 'account-1': { [HIDDEN]: { amount: '5' } } },
  assetsInfo: {},
  assetPreferences: { [HIDDEN]: { hidden: true } },
  ignoredAssetIds: [],
});

describe('accountSupportsChain', () => {
  it('treats eip155:0 as every EVM chain', () => {
    const account = { address: '0xabc', scopes: ['eip155:0'] };

    expect(accountSupportsChain(account, 'eip155:1')).toBe(true);
    expect(accountSupportsChain(account, 'eip155:137')).toBe(true);
    expect(accountSupportsChain(account, 'solana:mainnet')).toBe(false);
  });

  it('matches a non-EVM account only on its scope', () => {
    const account = {
      address: 'sol-address',
      scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    };

    expect(
      accountSupportsChain(account, 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
    ).toBe(true);
    expect(accountSupportsChain(account, 'eip155:1')).toBe(false);
  });
});

describe('buildCaip10AccountIds', () => {
  it('builds one CAIP-10 id per account and supported chain', () => {
    const ids = buildCaip10AccountIds(
      [
        { address: '0xabc', scopes: ['eip155:0'] },
        {
          address: 'sol-address',
          scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        },
      ],
      ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    );

    expect(ids).toEqual([
      'eip155:1:0xabc',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:sol-address',
    ]);
  });
});

describe('classifyOwnedBalances', () => {
  it('keeps hidden tokens and balances that are not in the wallet', () => {
    const tokens = classifyOwnedBalances(
      [
        balance(USDC, { symbol: 'USDC', name: 'USD Coin', balance: '4' }),
        balance(HIDDEN, {
          symbol: 'DAI',
          name: 'Dai',
          balance: '5',
        }),
        balance(GHOST, {
          symbol: 'GHOST',
          name: 'Ghost',
          balance: '9',
          accountId: 'eip155:137:0xabc',
        }),
        balance(NATIVE, { type: 'native', symbol: 'ETH' }),
        balance('eip155:1/erc20:0xzero', { balance: '0', symbol: 'ZERO' }),
        {
          ...balance('eip155:1/erc20:0xdefi'),
          object: 'defi',
        },
      ],
      index,
    );

    expect(tokens.map((token) => token.symbol)).toEqual(['DAI', 'GHOST']);
    expect(tokens[0]).toEqual(
      expect.objectContaining({
        category: 'hidden',
        isTracked: true,
        chainId: 'eip155:1',
        imageUrl:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6b175474e89094c44da98b954eedeac495271d0f.png',
      }),
    );
    expect(tokens[1]).toEqual(
      expect.objectContaining({
        category: 'undetected',
        isTracked: false,
        chainId: 'eip155:137',
      }),
    );
  });

  it('matches hidden preferences case-insensitively', () => {
    const mixedCaseIndex = indexWalletTokens({
      customAssets: {},
      assetsBalance: {},
      assetsInfo: {},
      assetPreferences: {
        [HIDDEN.toUpperCase()]: { hidden: true },
      },
      ignoredAssetIds: [],
    });

    const tokens = classifyOwnedBalances(
      [balance(HIDDEN, { symbol: 'DAI', name: 'Dai' })],
      mixedCaseIndex,
    );

    expect(tokens[0]?.category).toBe('hidden');
  });

  it('treats an asset id already in AssetsController as detected', () => {
    const known =
      'eip155:1/erc20:0x3333333333333333333333333333333333333333' as CaipAssetType;
    const tokens = classifyOwnedBalances(
      [
        balance(known, { symbol: 'KNOWN', name: 'Known' }),
        balance(GHOST, { symbol: 'GHOST', name: 'Ghost' }),
      ],
      indexWalletTokens({
        customAssets: {},
        assetsBalance: {},
        assetsInfo: { [known]: { symbol: 'KNOWN' } },
        assetPreferences: {},
        ignoredAssetIds: [],
      }),
    );

    expect(tokens.map((token) => token.symbol)).toEqual(['GHOST']);
    expect(tokens[0]?.category).toBe('undetected');
  });
});

describe('createOwnedTokenImageUrl', () => {
  it('lowercases EVM addresses and keeps other asset references as written', () => {
    expect(
      createOwnedTokenImageUrl(
        'eip155:1/erc20:0xFeDC5f4a6c38211c1338aa411018DFAf26612c08' as CaipAssetType,
      ),
    ).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xfedc5f4a6c38211c1338aa411018dfaf26612c08.png',
    );
    expect(
      createOwnedTokenImageUrl(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:aBCD' as CaipAssetType,
      ),
    ).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/aBCD.png',
    );
  });
});

describe('buildOwnedTokenRows', () => {
  const hiddenToken = {
    assetId: HIDDEN,
    category: 'hidden' as const,
    symbol: 'DAI',
  } as ClassifiedOwnedToken;
  const ghostToken = {
    assetId: GHOST,
    category: 'undetected' as const,
    symbol: 'GHOST',
  } as ClassifiedOwnedToken;

  it('groups an unfiltered list under hidden and undetected sections', () => {
    const rows = buildOwnedTokenRows([hiddenToken, ghostToken], 'all');

    expect(
      rows.map((row) => (row.kind === 'section' ? row.id : row.token.symbol)),
    ).toEqual(['hidden', 'DAI', 'undetected', 'GHOST']);
  });

  it('leaves a filtered list flat', () => {
    const rows = buildOwnedTokenRows([hiddenToken], 'hidden');

    expect(rows).toEqual([{ kind: 'token', token: hiddenToken }]);
  });
});

describe('owned token formatting', () => {
  it('formats balances and fiat quotes', () => {
    expect(
      shortenOwnedTokenAddress('0x6b175474e89094c44da98b954eedeac495271d0f'),
    ).toBe('0x6b17…1d0f');
    expect(formatOwnedTokenBalance('10000500000', 6)).toBe('10,000.5');
    expect(formatOwnedTokenBalance('1', 6)).toBe('<0.00001');
    expect(formatOwnedTokenBalance('42537675219.45665', 18)).toBe('42.54B');
    expect(formatOwnedTokenFiat('10000000', 6, '1.5')).toBe('$15.00');
    expect(formatOwnedTokenFiat('1', 6, '0.0001')).toBe('<$0.01');
    expect(formatOwnedTokenFiat('10000000', 6)).toBe('—');
  });
});

describe('importOwnedTokens', () => {
  const hiddenToken: ClassifiedOwnedToken = {
    assetId: HIDDEN,
    category: 'hidden',
    isTracked: true,
    name: 'Dai',
    symbol: 'DAI',
    decimals: 18,
    balance: '5',
    chainId: 'eip155:1' as CaipChainId,
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    imageUrl: 'https://example.com/dai.png',
  };
  const ghostToken: ClassifiedOwnedToken = {
    assetId: GHOST,
    category: 'undetected',
    isTracked: false,
    name: 'Ghost',
    symbol: 'GHOST',
    decimals: 18,
    balance: '9',
    chainId: 'eip155:137' as CaipChainId,
    address: '0x00000000000000000000000000000000000000aa',
    imageUrl: 'https://example.com/ghost.png',
  };

  it('unhides tracked tokens and imports balances the wallet does not have', async () => {
    const unhideAsset = jest.fn();
    const addCustomAsset = jest.fn();

    const result = await importOwnedTokens([hiddenToken, ghostToken], {
      unhideAsset,
      addCustomAsset,
      accountForChain: () => ({ id: 'account-1' }),
    });

    expect(unhideAsset).toHaveBeenCalledWith(HIDDEN);
    expect(addCustomAsset).toHaveBeenCalledTimes(1);
    expect(addCustomAsset).toHaveBeenCalledWith(
      GHOST,
      expect.objectContaining({
        symbol: 'GHOST',
        address: '0x00000000000000000000000000000000000000aa',
        chainId: 'eip155:137',
      }),
      'account-1',
    );
    expect(result).toEqual({
      addedAssetIds: [HIDDEN, GHOST],
      failed: 0,
    });
  });

  it('counts a token as failed when its chain has no account', async () => {
    const result = await importOwnedTokens([ghostToken], {
      unhideAsset: jest.fn(),
      addCustomAsset: jest.fn(),
      accountForChain: () => undefined,
    });

    expect(result).toEqual({ addedAssetIds: [], failed: 1 });
  });
});

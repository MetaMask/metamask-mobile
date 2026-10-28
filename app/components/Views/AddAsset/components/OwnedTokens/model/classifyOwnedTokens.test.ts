import BigNumber from 'bignumber.js';
import {
  classifyOwnedTokenBalances,
  classifySpamTier,
  filterOwnedTokenRows,
} from './classifyOwnedTokens';
import type { OwnedTokenAccountTarget, OwnedTokenBalanceItem } from './types';

const ACCOUNT_A = 'eip155:1:0xaaa';
const ACCOUNT_B = 'eip155:1:0xbbb';
const USDC = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const LAPTOP = 'eip155:1/erc20:0x0000000000000000000000000000000000000abc';
const LAPTOP_HEX_CHAIN =
  'eip155:0x1/erc20:0x0000000000000000000000000000000000000abc';

const targetA: OwnedTokenAccountTarget = {
  caipAccountId: ACCOUNT_A,
  internalAccountId: 'account-a',
  chainId: 'eip155:1',
  accountName: 'Account A',
};

const targetB: OwnedTokenAccountTarget = {
  caipAccountId: ACCOUNT_B,
  internalAccountId: 'account-b',
  chainId: 'eip155:1',
  accountName: 'Account B',
};

const targets = new Map<string, OwnedTokenAccountTarget>([
  [ACCOUNT_A, targetA],
  [ACCOUNT_B, targetB],
]);

const token = (
  overrides: Partial<OwnedTokenBalanceItem> &
    Pick<OwnedTokenBalanceItem, 'assetId' | 'accountId'>,
): OwnedTokenBalanceItem => ({
  object: 'token',
  type: 'erc20',
  name: 'Token',
  symbol: 'TOK',
  decimals: 18,
  balance: '1.5',
  price: '2',
  ...overrides,
});

describe('classifyOwnedTokenBalances', () => {
  it('labels a hidden preference as hidden and skips a tracked token', () => {
    const rows = classifyOwnedTokenBalances({
      balances: [
        token({ assetId: LAPTOP, accountId: ACCOUNT_A, symbol: 'LAP' }),
        token({ assetId: USDC, accountId: ACCOUNT_A, symbol: 'USDC' }),
      ],
      targetsByAccountId: targets,
      wallet: {
        assetPreferences: { [LAPTOP]: { hidden: true } },
        assetsInfo: { [USDC]: { symbol: 'USDC' } },
      },
      fiatMultiplier: new BigNumber(1),
    });

    expect(rows.map((row) => row.symbol)).toEqual(['LAP']);
    expect(rows[0]?.category).toBe('hidden');
    expect(rows[0]?.unhideAssetId).toBe(LAPTOP);
  });

  it('matches a hex-chain wallet id to a decimal balance so a tracked token stays out', () => {
    const rows = classifyOwnedTokenBalances({
      balances: [
        token({
          assetId: LAPTOP,
          accountId: ACCOUNT_A,
          symbol: 'LAP',
        }),
      ],
      targetsByAccountId: targets,
      wallet: {
        assetsBalance: {
          'account-a': { [LAPTOP_HEX_CHAIN]: { amount: '1' } },
        },
      },
      fiatMultiplier: new BigNumber(1),
    });

    expect(rows).toEqual([]);
  });

  it('treats a canonical head that is already tracked as tracked', () => {
    const rows = classifyOwnedTokenBalances({
      balances: [
        token({
          assetId: USDC,
          accountId: ACCOUNT_A,
          symbol: 'USDC',
          canonicalHead: LAPTOP,
        }),
      ],
      targetsByAccountId: targets,
      wallet: {
        assetsInfo: { [LAPTOP]: { symbol: 'LAP' } },
      },
      fiatMultiplier: new BigNumber(1),
    });

    expect(rows).toEqual([]);
  });

  it('keeps a separate row for each account that holds the same undetected asset', () => {
    const rows = classifyOwnedTokenBalances({
      balances: [
        token({
          assetId: USDC,
          accountId: ACCOUNT_A,
          symbol: 'USDC',
          balance: '2',
        }),
        token({
          assetId: USDC,
          accountId: ACCOUNT_B,
          symbol: 'USDC',
          balance: '4',
        }),
      ],
      targetsByAccountId: targets,
      wallet: {},
      fiatMultiplier: new BigNumber(1),
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.internalAccountId).sort()).toEqual([
      'account-a',
      'account-b',
    ]);
    expect(rows.every((row) => row.siblingCount === 2)).toBe(true);
    expect(rows.every((row) => row.category === 'undetected')).toBe(true);
  });

  it('skips native, slip44, non-positive, and non-token rows', () => {
    const rows = classifyOwnedTokenBalances({
      balances: [
        token({
          assetId: 'eip155:1/slip44:60',
          accountId: ACCOUNT_A,
          type: 'native',
          symbol: 'ETH',
        }),
        token({
          assetId: USDC,
          accountId: ACCOUNT_A,
          balance: '0',
          symbol: 'ZERO',
        }),
        {
          ...token({ assetId: LAPTOP, accountId: ACCOUNT_A, symbol: 'DEFI' }),
          object: 'defi',
        },
      ],
      targetsByAccountId: targets,
      wallet: {},
      fiatMultiplier: new BigNumber(1),
    });

    expect(rows).toEqual([]);
  });

  it('sorts hidden first, then fiat descending, then symbol', () => {
    const hiddenId =
      'eip155:1/erc20:0x0000000000000000000000000000000000000001';
    const richId = 'eip155:1/erc20:0x0000000000000000000000000000000000000002';
    const poorId = 'eip155:1/erc20:0x0000000000000000000000000000000000000003';

    const rows = classifyOwnedTokenBalances({
      balances: [
        token({
          assetId: poorId,
          accountId: ACCOUNT_A,
          symbol: 'POOR',
          balance: '1',
          price: '1',
        }),
        token({
          assetId: richId,
          accountId: ACCOUNT_A,
          symbol: 'RICH',
          balance: '10',
          price: '5',
        }),
        token({
          assetId: hiddenId,
          accountId: ACCOUNT_A,
          symbol: 'HIDE',
          balance: '1',
          price: '1',
        }),
      ],
      targetsByAccountId: targets,
      wallet: {
        assetPreferences: { [hiddenId]: { hidden: true } },
      },
      fiatMultiplier: new BigNumber(1),
    });

    expect(rows.map((row) => row.symbol)).toEqual(['HIDE', 'RICH', 'POOR']);
  });

  it('marks malicious tokens as not selectable and warning tokens as selectable', () => {
    const maliciousId =
      'eip155:1/erc20:0x00000000000000000000000000000000000000aa';
    const warningId =
      'eip155:1/erc20:0x00000000000000000000000000000000000000bb';

    const rows = classifyOwnedTokenBalances({
      balances: [
        token({
          assetId: maliciousId,
          accountId: ACCOUNT_A,
          symbol: 'BAD',
          securityResultType: 'Malicious',
        }),
        token({
          assetId: warningId,
          accountId: ACCOUNT_A,
          symbol: 'WARN',
          labels: ['spam'],
        }),
      ],
      targetsByAccountId: targets,
      wallet: {},
      fiatMultiplier: new BigNumber(1),
    });

    const malicious = rows.find((row) => row.symbol === 'BAD');
    const warning = rows.find((row) => row.symbol === 'WARN');

    expect(malicious?.spamTier).toBe('malicious');
    expect(malicious?.selectable).toBe(false);
    expect(warning?.spamTier).toBe('warning');
    expect(warning?.selectable).toBe(true);
  });

  it('filters by category and search text', () => {
    const hiddenId =
      'eip155:1/erc20:0x0000000000000000000000000000000000000004';
    const rows = classifyOwnedTokenBalances({
      balances: [
        token({
          assetId: hiddenId,
          accountId: ACCOUNT_A,
          symbol: 'HIDE',
          name: 'Hidden Laptop',
        }),
        token({
          assetId: USDC,
          accountId: ACCOUNT_A,
          symbol: 'USDC',
          name: 'USD Coin',
        }),
      ],
      targetsByAccountId: targets,
      wallet: { assetPreferences: { [hiddenId]: { hidden: true } } },
      fiatMultiplier: new BigNumber(1),
    });

    expect(
      filterOwnedTokenRows(rows, 'hidden', '').map((row) => row.symbol),
    ).toEqual(['HIDE']);
    expect(
      filterOwnedTokenRows(rows, 'all', 'usd').map((row) => row.symbol),
    ).toEqual(['USDC']);
  });
});

describe('classifySpamTier', () => {
  it('maps security result types and labels onto the four tiers', () => {
    expect(classifySpamTier(undefined, 'Verified')).toBe('verified');
    expect(classifySpamTier(['blue_chip'], undefined)).toBe('verified');
    expect(classifySpamTier(undefined, 'Warning')).toBe('warning');
    expect(classifySpamTier(['scam'], 'Verified')).toBe('malicious');
    expect(classifySpamTier(undefined, undefined)).toBe('unknown');
  });
});

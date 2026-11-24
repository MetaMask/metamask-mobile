import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import { TransactionType } from '@metamask/transaction-controller';
import type { RootState } from '../../../../reducers';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import {
  getPreferredTokenOverride,
  selectMetaMaskPayTokensFlags,
} from '../../../../selectors/featureFlagController/confirmations';
import {
  filterMoneyDepositSupportedAssets,
  type MoneyDepositAsset,
  selectMoneyDepositBlockedTokens,
  selectMoneyDepositAssetsMeetingMinimumBalance,
  selectMoneyDepositPayTokens,
} from './depositTokens';
import { selectMoneyDepositMinBalance } from './featureFlags';

jest.mock('../../../../selectors/assets/assets-list');
jest.mock('../../../../selectors/featureFlagController/confirmations');
jest.mock('./featureFlags');

const mockSelectAssetsBySelectedAccountGroup = jest.mocked(
  selectAssetsBySelectedAccountGroup,
);
const mockSelectMetaMaskPayTokensFlags = jest.mocked(
  selectMetaMaskPayTokensFlags,
);
const mockSelectMoneyDepositMinBalance = jest.mocked(
  selectMoneyDepositMinBalance,
);

jest
  .mocked(getPreferredTokenOverride)
  .mockImplementation(
    jest.requireActual(
      '../../../../selectors/featureFlagController/confirmations',
    ).getPreferredTokenOverride,
  );

const createAsset = (
  overrides: Partial<MoneyDepositAsset> = {},
): MoneyDepositAsset =>
  ({
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    assetId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    accountId: 'account-id',
    chainId: '0x1',
    accountType: EthAccountType.Eoa,
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: '10',
    rawBalance: '0x989680',
    fiat: { balance: 10, currency: 'usd' },
    ...overrides,
  }) as MoneyDepositAsset;

const emptyBlockedTokens = { chainIds: [], tokens: [] };

describe('filterMoneyDepositSupportedAssets', () => {
  it('keeps supported EVM assets below the minimum balance', () => {
    const asset = createAsset({
      fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
      rawBalance: '0x0',
    });

    const result = filterMoneyDepositSupportedAssets(
      [asset],
      emptyBlockedTokens,
    );

    expect(result).toEqual([asset]);
  });

  it('excludes blocked EVM assets', () => {
    const asset = createAsset();

    const result = filterMoneyDepositSupportedAssets([asset], {
      chainIds: [],
      tokens: [{ address: asset.address, chainId: asset.chainId as string }],
    });

    expect(result).toEqual([]);
  });

  it('excludes non-EVM assets', () => {
    const asset = {
      ...createAsset(),
      accountType: SolAccountType.DataAccount,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:mock-token',
    } as unknown as Asset;

    const result = filterMoneyDepositSupportedAssets(
      [asset],
      emptyBlockedTokens,
    );

    expect(result).toEqual([]);
  });
});

describe('selectMoneyDepositBlockedTokens', () => {
  it('returns blocked tokens for Money deposits', () => {
    const blockedTokens = {
      chainIds: ['0x1'],
      tokens: [],
    };
    const state = {} as RootState;
    mockSelectMetaMaskPayTokensFlags.mockReturnValue({
      preferredTokens: { default: [], overrides: {} },
      blockedTokens: { default: blockedTokens, overrides: {} },
      minimumRequiredTokenBalance: 0,
    });

    const result = selectMoneyDepositBlockedTokens(state);

    expect(result).toEqual(blockedTokens);
  });

  it('returns the Money deposit transaction-type override', () => {
    const defaultBlockedTokens = {
      chainIds: ['0x1'],
      tokens: [],
    };
    const overrideBlockedTokens = {
      chainIds: [],
      tokens: [{ address: '0xblocked', chainId: '0x1' }],
    };
    const state = {} as RootState;
    mockSelectMetaMaskPayTokensFlags.mockReturnValue({
      preferredTokens: { default: [], overrides: {} },
      blockedTokens: {
        default: defaultBlockedTokens,
        overrides: {
          [TransactionType.moneyAccountDeposit]: overrideBlockedTokens,
        },
      },
      minimumRequiredTokenBalance: 0,
    });

    const result = selectMoneyDepositBlockedTokens(state);

    expect(result).toEqual(overrideBlockedTokens);
  });
});

describe('selectMoneyDepositPayTokens', () => {
  it('returns the Money deposit preferred token override', () => {
    const overrideTokens = [
      {
        address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        chainId: '0x2105',
        successRate: 1,
      },
    ];
    const state = {} as RootState;
    mockSelectMetaMaskPayTokensFlags.mockReturnValue({
      preferredTokens: {
        default: [],
        overrides: { [TransactionType.moneyAccountDeposit]: overrideTokens },
      },
      blockedTokens: { default: emptyBlockedTokens, overrides: {} },
      minimumRequiredTokenBalance: 0,
    });

    const result = selectMoneyDepositPayTokens(state);

    expect(result).toEqual(overrideTokens);
  });

  it('returns an empty list when the Money deposit override is empty', () => {
    const state = {} as RootState;
    mockSelectMetaMaskPayTokensFlags.mockReturnValue({
      preferredTokens: {
        default: [
          {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            chainId: '0x1',
            successRate: 1,
          },
        ],
        overrides: { [TransactionType.moneyAccountDeposit]: [] },
      },
      blockedTokens: { default: emptyBlockedTokens, overrides: {} },
      minimumRequiredTokenBalance: 0,
    });

    const result = selectMoneyDepositPayTokens(state);

    expect(result).toEqual([]);
  });

  it('returns an empty list when the Money deposit override is missing', () => {
    const state = {} as RootState;
    mockSelectMetaMaskPayTokensFlags.mockReturnValue({
      preferredTokens: {
        default: [
          {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            chainId: '0x1',
            successRate: 1,
          },
        ],
        overrides: {},
      },
      blockedTokens: { default: emptyBlockedTokens, overrides: {} },
      minimumRequiredTokenBalance: 0,
    });

    const result = selectMoneyDepositPayTokens(state);

    expect(result).toEqual([]);
  });

  it('does not filter blocked tokens', () => {
    const token = {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x1',
      successRate: 1,
    };
    const state = {} as RootState;
    mockSelectMetaMaskPayTokensFlags.mockReturnValue({
      preferredTokens: {
        default: [],
        overrides: { [TransactionType.moneyAccountDeposit]: [token] },
      },
      blockedTokens: {
        default: {
          chainIds: [],
          tokens: [{ address: token.address, chainId: token.chainId }],
        },
        overrides: {},
      },
      minimumRequiredTokenBalance: 0,
    });

    const result = selectMoneyDepositPayTokens(state);

    expect(result).toEqual([token]);
  });
});

describe('selectMoneyDepositAssetsMeetingMinimumBalance', () => {
  it('excludes assets below the minimum balance', () => {
    const asset = createAsset({
      fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
      rawBalance: '0x0',
    });
    const state = {} as RootState;
    mockSelectAssetsBySelectedAccountGroup.mockReturnValue({
      'eip155:1': [asset],
    });
    mockSelectMetaMaskPayTokensFlags.mockReturnValue({
      preferredTokens: { default: [], overrides: {} },
      blockedTokens: { default: emptyBlockedTokens, overrides: {} },
      minimumRequiredTokenBalance: 0,
    });
    mockSelectMoneyDepositMinBalance.mockReturnValue(0.01);

    const result = selectMoneyDepositAssetsMeetingMinimumBalance(state);

    expect(result).toEqual([]);
  });

  it('returns the same reference when selector inputs are unchanged', () => {
    const asset = createAsset();
    const state = {} as RootState;
    mockSelectAssetsBySelectedAccountGroup.mockReturnValue({
      'eip155:1': [asset],
    });
    mockSelectMetaMaskPayTokensFlags.mockReturnValue({
      preferredTokens: { default: [], overrides: {} },
      blockedTokens: { default: emptyBlockedTokens, overrides: {} },
      minimumRequiredTokenBalance: 0,
    });
    mockSelectMoneyDepositMinBalance.mockReturnValue(0.01);

    const first = selectMoneyDepositAssetsMeetingMinimumBalance(state);
    const second = selectMoneyDepositAssetsMeetingMinimumBalance(state);

    expect(second).toBe(first);
  });
});

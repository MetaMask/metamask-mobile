import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import type { RootState } from '../../../../reducers';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { selectMetaMaskPayTokensFlags } from '../../../../selectors/featureFlagController/confirmations';
import type { AssetType } from '../../../Views/confirmations/types/token';
import {
  filterMoneyDepositEligibleAssets,
  selectMoneyDepositEligibleAssets,
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

const createAsset = (overrides: Partial<AssetType> = {}): AssetType =>
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
    logo: 'usdc.png',
    isETH: false,
    ...overrides,
  }) as AssetType;

const asAsset = (asset: AssetType) => asset as unknown as Asset;
const emptyBlockedTokens = { chainIds: [], tokens: [] };

describe('filterMoneyDepositEligibleAssets', () => {
  it('keeps held EVM assets at the minimum fiat balance', () => {
    const asset = createAsset({ fiat: { balance: 0.01, currency: 'usd' } });

    const result = filterMoneyDepositEligibleAssets(
      [asAsset(asset)],
      emptyBlockedTokens,
      0.01,
    );

    expect(result).toEqual([asset]);
  });

  it('excludes non-EVM assets', () => {
    const asset = createAsset({
      accountType: SolAccountType.DataAccount,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });

    const result = filterMoneyDepositEligibleAssets(
      [asAsset(asset)],
      emptyBlockedTokens,
      0.01,
    );

    expect(result).toEqual([]);
  });

  it('excludes assets blocked for Money deposits', () => {
    const asset = createAsset();

    const result = filterMoneyDepositEligibleAssets(
      [asAsset(asset)],
      {
        chainIds: [],
        tokens: [{ address: asset.address, chainId: asset.chainId as string }],
      },
      0.01,
    );

    expect(result).toEqual([]);
  });

  it('excludes assets below the minimum fiat balance', () => {
    const asset = createAsset({ fiat: { balance: 0.009, currency: 'usd' } });

    const result = filterMoneyDepositEligibleAssets(
      [asAsset(asset)],
      emptyBlockedTokens,
      0.01,
    );

    expect(result).toEqual([]);
  });

  it('excludes assets without fiat balance', () => {
    const asset = createAsset({ fiat: undefined });

    const result = filterMoneyDepositEligibleAssets(
      [asAsset(asset)],
      emptyBlockedTokens,
      0.01,
    );

    expect(result).toEqual([]);
  });

  it('sorts eligible assets by descending fiat balance', () => {
    const smaller = createAsset({
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'SMALL',
      fiat: { balance: 1, currency: 'usd' },
    });
    const larger = createAsset({
      address: '0x0000000000000000000000000000000000000002',
      symbol: 'LARGE',
      fiat: { balance: 2, currency: 'usd' },
    });

    const result = filterMoneyDepositEligibleAssets(
      [asAsset(smaller), asAsset(larger)],
      emptyBlockedTokens,
      0.01,
    );

    expect(result.map(({ symbol }) => symbol)).toEqual(['LARGE', 'SMALL']);
  });
});

describe('selectMoneyDepositEligibleAssets', () => {
  it('returns the same reference when selector inputs are unchanged', () => {
    const asset = createAsset();
    const state = {} as RootState;
    mockSelectAssetsBySelectedAccountGroup.mockReturnValue({
      'eip155:1': [asAsset(asset)],
    });
    mockSelectMetaMaskPayTokensFlags.mockReturnValue({
      preferredTokens: { default: [], overrides: {} },
      blockedTokens: { default: emptyBlockedTokens, overrides: {} },
      minimumRequiredTokenBalance: 0,
    });
    mockSelectMoneyDepositMinBalance.mockReturnValue(0.01);

    const first = selectMoneyDepositEligibleAssets(state);
    const second = selectMoneyDepositEligibleAssets(state);

    expect(second).toBe(first);
  });
});

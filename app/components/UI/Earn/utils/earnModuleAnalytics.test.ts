import mockBigNumber from 'bignumber.js';
import { EthAccountType } from '@metamask/keyring-api';
import { EARN_EXPERIENCES } from '../constants/experiences';
import {
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_SCREEN_NAMES,
} from '../constants/earnModuleEvents';
import type { EarnAsset, EarnExperience } from '../types/earnAssets';
import { formatChainIdForAnalytics } from './analytics';
import { hasEarnAssetBalance } from './earnAssets';
import { getEarnInputExperiences } from './earnAssets/earnExperience';
import {
  buildEarnModuleNavigationContext,
  getEarnModuleAssetProperties,
} from './earnModuleAnalytics';
import { truncateNumber } from './number';

jest.mock('./analytics', () => ({
  formatChainIdForAnalytics: jest.fn((chainId?: string | number) =>
    chainId ? 'chain-id-sentinel' : undefined,
  ),
}));

jest.mock('./earnAssets', () => ({
  hasEarnAssetBalance: jest.fn(
    (earnAsset: EarnAsset) =>
      earnAsset.wallet.status === 'tracked' &&
      new mockBigNumber(earnAsset.wallet.asset.rawBalance).isGreaterThan(0),
  ),
}));

jest.mock('./earnAssets/earnExperience', () => ({
  getEarnInputExperiences: jest.fn((experiences: readonly EarnExperience[]) =>
    experiences.filter((experience) => experience.role !== 'output'),
  ),
}));

jest.mock('./number', () => ({
  truncateNumber: jest.fn((value: string | number) =>
    String(Math.trunc(Number(value) * 100) / 100),
  ),
}));

const mockFormatChainIdForAnalytics = jest.mocked(formatChainIdForAnalytics);
const mockHasEarnAssetBalance = jest.mocked(hasEarnAssetBalance);
const mockGetEarnInputExperiences = jest.mocked(getEarnInputExperiences);
const mockTruncateNumber = jest.mocked(truncateNumber);

const createExperience = (
  type: EarnExperience['type'],
  overrides: Partial<EarnExperience> = {},
): EarnExperience => ({
  id: `experience:${type}`,
  type,
  role: 'underlying',
  depositReadiness: { status: 'ready' },
  rate: { type: 'APY', status: 'ready', percentage: 4.259 },
  isFeeSubsidized: false,
  ...overrides,
});

const TRACKED_ASSET_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const UNTRACKED_ASSET_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';

const createTrackedAsset = (
  experiences: readonly EarnExperience[],
  balance = '10',
  metadataOverrides: Partial<EarnAsset['metadata']> = {},
): EarnAsset => ({
  assetId: `eip155:1/erc20:${TRACKED_ASSET_ADDRESS}` as EarnAsset['assetId'],
  metadata: {
    address: TRACKED_ASSET_ADDRESS,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    ticker: 'USDC',
    logo: 'usdc.png',
    isETH: false,
    ...metadataOverrides,
  },
  wallet: {
    status: 'tracked',
    asset: {
      accountType: EthAccountType.Eoa,
      accountId: 'account-id',
      assetId: TRACKED_ASSET_ADDRESS,
      address: TRACKED_ASSET_ADDRESS,
      chainId: '0x1',
      decimals: 6,
      image: 'usdc.png',
      name: 'USD Coin',
      symbol: 'USDC',
      balance,
      rawBalance: balance === '0' ? '0x0' : '0x1',
      fiat: { balance: Number(balance), currency: 'USD', conversionRate: 1 },
      isNative: false,
    },
  },
  experiences,
});

const createUntrackedAsset = (
  experiences: readonly EarnExperience[],
  metadataOverrides: Partial<EarnAsset['metadata']> = {},
): EarnAsset => ({
  assetId: `eip155:1/erc20:${UNTRACKED_ASSET_ADDRESS}` as EarnAsset['assetId'],
  metadata: {
    address: UNTRACKED_ASSET_ADDRESS,
    chainId: '1',
    decimals: 6,
    image: 'usdt.png',
    name: 'Tether USD',
    symbol: 'USDT',
    ticker: 'USDTX',
    logo: 'usdt.png',
    isETH: false,
    ...metadataOverrides,
  },
  wallet: { status: 'untracked' },
  experiences,
});

describe('getEarnModuleAssetProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tracked asset metadata with ready rate and fee properties', () => {
    const asset = createTrackedAsset([
      createExperience('MONEY_ACCOUNT_DEPOSIT', {
        isFeeSubsidized: true,
      }),
    ]);

    const result = getEarnModuleAssetProperties(asset, 2, 5);

    expect(result).toEqual({
      asset_symbol: 'USDC',
      chain_id: 'chain-id-sentinel',
      asset_position: 2,
      assets_in_list: 5,
      eligible_strategy_count: 1,
      eligible_strategy_types: ['money_account_deposit'],
      asset_has_balance: true,
      rate_percentage: 4.25,
      is_fee_subsidized: true,
    });
    expect(mockFormatChainIdForAnalytics).toHaveBeenCalledWith('0x1');
    expect(mockGetEarnInputExperiences).toHaveBeenCalledWith(asset.experiences);
    expect(mockHasEarnAssetBalance).toHaveBeenCalledWith(asset);
    expect(mockTruncateNumber).toHaveBeenCalledWith(4.259);
  });

  it('returns untracked metadata without balance, rate, or fee properties for multiple strategies', () => {
    const asset = createUntrackedAsset([
      createExperience(EARN_EXPERIENCES.POOLED_STAKING),
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
      createExperience(EARN_EXPERIENCES.POOLED_STAKING, { role: 'output' }),
    ]);

    const result = getEarnModuleAssetProperties(asset);

    expect(result).toEqual({
      asset_symbol: 'USDTX',
      chain_id: 'chain-id-sentinel',
      eligible_strategy_count: 2,
      eligible_strategy_types: ['pooled_staking', 'stablecoin_lending'],
      asset_has_balance: false,
    });
  });

  it('returns undefined chain ID when chain ID is unavailable', () => {
    const asset = createTrackedAsset([], '10', { chainId: '' });

    const result = getEarnModuleAssetProperties(asset);

    expect(result.chain_id).toBeUndefined();
    expect(mockFormatChainIdForAnalytics).toHaveBeenCalledWith('');
  });

  it('falls back to the symbol when ticker is unavailable', () => {
    const asset = createTrackedAsset([], '10', { ticker: undefined });

    const result = getEarnModuleAssetProperties(asset);

    expect(result.asset_symbol).toBe('USDC');
  });

  it('falls back to the name when ticker and symbol are unavailable', () => {
    const asset = createUntrackedAsset([], { ticker: undefined });
    Reflect.deleteProperty(asset.metadata, 'symbol');

    const result = getEarnModuleAssetProperties(asset);

    expect(result.asset_symbol).toBe('Tether USD');
  });

  it('preserves zero asset position and list size', () => {
    const asset = createTrackedAsset([]);

    const result = getEarnModuleAssetProperties(asset, 0, 0);

    expect(result.asset_position).toBe(0);
    expect(result.assets_in_list).toBe(0);
  });

  it('omits rate percentage when the only strategy rate is unavailable', () => {
    const asset = createTrackedAsset(
      [
        createExperience(EARN_EXPERIENCES.TRX_STAKING, {
          rate: { type: 'APR', status: 'unavailable' },
        }),
      ],
      '0',
    );

    const result = getEarnModuleAssetProperties(asset);

    expect(result).toEqual({
      asset_symbol: 'USDC',
      chain_id: 'chain-id-sentinel',
      eligible_strategy_count: 1,
      eligible_strategy_types: ['trx_staking'],
      asset_has_balance: false,
      is_fee_subsidized: false,
    });
  });
});

describe('buildEarnModuleNavigationContext', () => {
  it('includes location and asset list metadata when provided', () => {
    const result = buildEarnModuleNavigationContext(
      {
        entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
        screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE_NOW_TAB,
      },
      1,
      3,
    );

    expect(result).toEqual({
      entry_point: 'explore',
      screen_name: 'explore_now_tab',
      asset_position: 1,
      assets_in_list: 3,
    });
  });

  it('omits optional navigation metadata when not provided', () => {
    const result = buildEarnModuleNavigationContext({
      entry_point: EARN_MODULE_ENTRY_POINTS.HOMEPAGE,
      screen_name: undefined,
    });

    expect(result).toEqual({ entry_point: 'homepage' });
  });

  it('preserves zero asset position and list size', () => {
    const result = buildEarnModuleNavigationContext(
      {
        entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
        screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE,
      },
      0,
      0,
    );

    expect(result).toEqual({
      entry_point: 'explore',
      screen_name: 'explore',
      asset_position: 0,
      assets_in_list: 0,
    });
  });
});

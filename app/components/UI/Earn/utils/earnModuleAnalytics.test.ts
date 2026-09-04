import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { EARN_EXPERIENCES } from '../constants/experiences';
import {
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_SCREEN_NAMES,
} from '../constants/earnModuleEvents';
import type {
  DiscoveryEarnAsset,
  EarnAsset,
  EarnExperience,
  HeldEarnAsset,
} from '../types/earnAssets';
import {
  buildEarnModuleNavigationContext,
  getEarnModuleAssetProperties,
} from './earnModuleAnalytics';

jest.mock('./analytics', () => ({
  formatChainIdForAnalytics: jest.fn((chainId?: string | number) =>
    chainId === undefined ? undefined : `formatted:${chainId}`,
  ),
}));

const createExperience = (
  type: EarnExperience['type'],
  overrides: Partial<EarnExperience> = {},
): EarnExperience => ({
  id: `experience:${type}`,
  type,
  role: 'underlying',
  rate: { type: 'APY', status: 'ready', percentage: 4.259 },
  isFeeSubsidized: false,
  ...overrides,
});

const createHeldAsset = (
  experiences: readonly EarnExperience[],
  balance = '10',
): HeldEarnAsset => ({
  kind: 'held',
  assetId: 'eip155:1/erc20:0x123' as HeldEarnAsset['assetId'],
  asset: {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: '0x123',
    address: '0x123',
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance,
    rawBalance: balance === '0' ? '0x0' : '0x1',
    fiat: { balance: Number(balance), currency: 'USD', conversionRate: 1 },
    isNative: false,
  } as unknown as Asset,
  experiences,
});

const createDiscoveryAsset = (
  experiences: readonly EarnExperience[],
): DiscoveryEarnAsset => ({
  kind: 'discovery',
  assetId: 'eip155:1/erc20:0x456' as DiscoveryEarnAsset['assetId'],
  metadata: {
    address: '0x456',
    chainId: '1',
    decimals: 6,
    image: 'usdt.png',
    name: 'Tether USD',
    symbol: 'USDT',
    ticker: 'USDTX',
    logo: 'usdt.png',
    isETH: false,
  },
  experiences,
});

describe('getEarnModuleAssetProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns held asset metadata with ready rate and fee properties', () => {
    const asset = createHeldAsset([
      createExperience('MONEY_ACCOUNT_DEPOSIT', {
        isFeeSubsidized: true,
      }),
    ]);

    const result = getEarnModuleAssetProperties(asset, 2, 5);

    expect(result).toEqual({
      asset_symbol: 'USDC',
      chain_id: 'formatted:0x1',
      asset_position: 2,
      assets_in_list: 5,
      eligible_strategy_count: 1,
      eligible_strategy_types: ['money_account_deposit'],
      asset_has_balance: true,
      rate_percentage: 4.25,
      is_fee_subsidized: true,
    });
  });

  it('returns discovery metadata without balance, rate, or fee properties for multiple strategies', () => {
    const asset = createDiscoveryAsset([
      createExperience(EARN_EXPERIENCES.POOLED_STAKING),
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING),
    ]);

    const result = getEarnModuleAssetProperties(asset);

    expect(result).toEqual({
      asset_symbol: 'USDTX',
      chain_id: 'formatted:1',
      eligible_strategy_count: 2,
      eligible_strategy_types: ['pooled_staking', 'stablecoin_lending'],
      asset_has_balance: false,
    });
  });

  it('omits rate percentage when the only strategy rate is unavailable', () => {
    const asset = createHeldAsset(
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
      chain_id: 'formatted:0x1',
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
});

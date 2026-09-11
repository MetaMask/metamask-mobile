import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import type {
  DiscoveryEarnAsset,
  EarnAsset,
  EarnAssetId,
} from '../../types/earnAssets';
import { buildEarnAssets } from './buildEarnAssets';

const assetId =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId;

const createAsset = (
  overrides: Partial<DiscoveryEarnAsset> = {},
): DiscoveryEarnAsset => ({
  kind: 'discovery',
  assetId,
  metadata: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    ticker: 'USDC',
    logo: 'usdc.png',
    isETH: false,
  },
  experiences: [
    {
      id: 'money:usdc',
      type: 'MONEY_ACCOUNT_DEPOSIT',
      role: 'funding',
      rate: { type: 'APY', percentage: 6.2, status: 'ready' },
      isFeeSubsidized: false,
    },
  ],
  ...overrides,
});

const createHeldAsset = (): EarnAsset => ({
  kind: 'held',
  assetId,
  asset: {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x1',
    decimals: 6,
    image: 'held-usdc.png',
    name: 'Held USD Coin',
    symbol: 'USDC',
    balance: '10',
    rawBalance: '0x989680',
    fiat: { balance: 10, currency: 'USD', conversionRate: 1 },
    isNative: false,
  } as Asset,
  experiences: [],
});

describe('buildEarnAssets', () => {
  it('returns one asset for each CAIP-19 identity', () => {
    const usdt = createAsset({
      assetId:
        'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7' as EarnAssetId,
      metadata: {
        ...createAsset().metadata,
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        symbol: 'USDT',
      },
    });

    const result = buildEarnAssets([createAsset(), usdt]);

    expect(
      result.map((asset) =>
        asset.kind === 'discovery' ? asset.metadata.symbol : asset.asset.symbol,
      ),
    ).toEqual(['USDC', 'USDT']);
  });

  it('keeps wallet asset data over discovery metadata', () => {
    const held = createHeldAsset();
    const discovery = createAsset();

    const [result] = buildEarnAssets([discovery, held]);

    expect(result.kind).toBe('held');
    if (result.kind === 'held') {
      expect(result.asset.name).toBe('Held USD Coin');
      expect(result.asset.balance).toBe('10');
    }
  });

  it('merges experiences by stable experience ID', () => {
    const lending = createAsset({
      experiences: [
        {
          id: 'lending:1:aave:usdc',
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          role: 'underlying',
          rate: { type: 'APY', percentage: 4.2, status: 'ready' },
          isFeeSubsidized: false,
        },
      ],
    });

    const [result] = buildEarnAssets([createAsset(), lending, lending]);

    expect(result.experiences.map(({ id }) => id)).toEqual([
      'money:usdc',
      'lending:1:aave:usdc',
    ]);
  });

  it('orders merged experiences by strategy priority', () => {
    const lending = createAsset({
      experiences: [
        {
          id: 'lending:1:aave:usdc',
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          role: 'underlying',
          rate: { type: 'APY', percentage: 4.2, status: 'ready' },
          isFeeSubsidized: false,
        },
      ],
    });
    const staking = createAsset({
      experiences: [
        {
          id: 'pooled:eth',
          type: EARN_EXPERIENCES.POOLED_STAKING,
          role: 'underlying',
          rate: { type: 'APR', percentage: 3.8, status: 'ready' },
          isFeeSubsidized: false,
        },
        {
          id: 'trx:trx',
          type: EARN_EXPERIENCES.TRX_STAKING,
          role: 'underlying',
          rate: { type: 'APR', percentage: 4.5, status: 'ready' },
          isFeeSubsidized: false,
        },
      ],
    });

    const [result] = buildEarnAssets([staking, lending, createAsset()]);

    expect(result.experiences.map(({ id }) => id)).toEqual([
      'money:usdc',
      'lending:1:aave:usdc',
      'pooled:eth',
      'trx:trx',
    ]);
  });

  it('orders experiences from a single candidate by strategy priority', () => {
    const asset = createAsset({
      experiences: [
        {
          id: 'trx:trx',
          type: EARN_EXPERIENCES.TRX_STAKING,
          role: 'underlying',
          rate: { type: 'APR', percentage: 4.5, status: 'ready' },
          isFeeSubsidized: false,
        },
        {
          id: 'lending:1:aave:usdc',
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          role: 'underlying',
          rate: { type: 'APY', percentage: 4.2, status: 'ready' },
          isFeeSubsidized: false,
        },
        {
          id: 'money:usdc',
          type: 'MONEY_ACCOUNT_DEPOSIT',
          role: 'funding',
          rate: { type: 'APY', percentage: 6.2, status: 'ready' },
          isFeeSubsidized: false,
        },
      ],
    });

    const [result] = buildEarnAssets([asset]);

    expect(result.experiences.map(({ id }) => id)).toEqual([
      'money:usdc',
      'lending:1:aave:usdc',
      'trx:trx',
    ]);
  });
});

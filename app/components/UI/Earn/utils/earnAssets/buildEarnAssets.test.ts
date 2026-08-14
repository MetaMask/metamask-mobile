import { EARN_EXPERIENCES } from '../../constants/experiences';
import type { EarnAsset, EarnAssetId } from '../../types/earnAssets';
import { buildEarnAssets } from './buildEarnAssets';

const assetId =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId;

const createAsset = (overrides: Partial<EarnAsset> = {}): EarnAsset => ({
  assetId,
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1',
  decimals: 6,
  image: 'usdc.png',
  name: 'USD Coin',
  symbol: 'USDC',
  ticker: 'USDC',
  balance: '10',
  logo: 'usdc.png',
  isETH: false,
  experiences: [
    {
      id: 'money:usdc',
      type: 'MONEY_ACCOUNT_DEPOSIT',
      role: 'funding',
      rate: { type: 'APY', percentage: 6.2, status: 'ready' },
    },
  ],
  ...overrides,
});

describe('buildEarnAssets', () => {
  it('returns one asset for each CAIP-19 identity', () => {
    const usdt = createAsset({
      assetId:
        'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7' as EarnAssetId,
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      symbol: 'USDT',
    });

    const result = buildEarnAssets([createAsset(), usdt]);

    expect(result.map(({ symbol }) => symbol)).toEqual(['USDC', 'USDT']);
  });

  it('keeps metadata from the first candidate', () => {
    const held = createAsset({ name: 'Held USD Coin' });
    const discovery = createAsset({ name: 'Remote USD Coin', balance: '0' });

    const [result] = buildEarnAssets([held, discovery]);

    expect(result.name).toBe('Held USD Coin');
    expect(result.balance).toBe('10');
  });

  it('adds fields missing from the first candidate', () => {
    const held = createAsset({ fiat: undefined });
    const money = createAsset({
      fiat: { balance: 10, currency: 'usd' },
    });

    const [result] = buildEarnAssets([held, money]);

    expect(result.fiat).toEqual({ balance: 10, currency: 'usd' });
  });

  it('merges experiences by stable experience ID', () => {
    const lending = createAsset({
      experiences: [
        {
          id: 'lending:1:aave:usdc',
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          role: 'underlying',
          rate: { type: 'APY', percentage: 4.2, status: 'ready' },
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
        },
        {
          id: 'trx:trx',
          type: EARN_EXPERIENCES.TRX_STAKING,
          role: 'underlying',
          rate: { type: 'APR', percentage: 4.5, status: 'ready' },
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
        },
        {
          id: 'lending:1:aave:usdc',
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          role: 'underlying',
          rate: { type: 'APY', percentage: 4.2, status: 'ready' },
        },
        {
          id: 'money:usdc',
          type: 'MONEY_ACCOUNT_DEPOSIT',
          role: 'funding',
          rate: { type: 'APY', percentage: 6.2, status: 'ready' },
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

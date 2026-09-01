import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
} from '../../types/earnAssets';
import { getEarnAssetMetadata } from '../earnAssets';
import {
  EARN_SECTION_ASSET_LIMIT,
  rankEarnAssets,
  rankEarnSectionAssets,
} from './rankEarnSectionAssets';

const createAsset = (
  symbol: string,
  experiences?: readonly EarnExperience[],
): EarnAsset => ({
  kind: 'discovery',
  assetId:
    `eip155:1/erc20:0x${symbol.toLowerCase().padEnd(40, '0')}` as EarnAssetId,
  metadata: {
    address: `0x${symbol.toLowerCase().padEnd(40, '0')}`,
    chainId: '0x1',
    decimals: 6,
    image: `${symbol}.png`,
    name: symbol,
    symbol,
    logo: `${symbol}.png`,
    isETH: false,
  },
  experiences: experiences ?? [
    {
      id: `lending:1:aave:${symbol}`,
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      role: 'underlying',
      rate: {
        type: 'APR',
        percentage: 3,
        status: 'ready',
      },
      isFeeSubsidized: false,
    },
  ],
});

const createHeldAsset = (symbol: string, fiatBalance: number): EarnAsset => {
  const discovery = createAsset(symbol);
  return {
    kind: 'held',
    assetId: discovery.assetId,
    experiences: discovery.experiences,
    asset: {
      accountType: EthAccountType.Eoa,
      accountId: 'account-id',
      assetId: `0x${symbol.toLowerCase().padEnd(40, '0')}`,
      address: `0x${symbol.toLowerCase().padEnd(40, '0')}`,
      chainId: '0x1',
      decimals: 6,
      image: `${symbol}.png`,
      name: symbol,
      symbol,
      balance: '1',
      rawBalance: '0x1',
      fiat: { balance: fiatBalance, currency: 'USD', conversionRate: 1 },
      isNative: false,
    } as Asset,
  };
};

describe('rankEarnSectionAssets', () => {
  it('ranks held assets by descending fiat balance before unheld assets', () => {
    const unheld = createAsset('USDT');
    const smallerHeld = createHeldAsset('DAI', 10);
    const largerHeld = createHeldAsset('USDC', 20);

    const result = rankEarnSectionAssets([unheld, smallerHeld, largerHeld]);

    expect(
      result.flatMap((slot) =>
        slot.kind === 'asset' ? [getEarnAssetMetadata(slot.asset).symbol] : [],
      ),
    ).toEqual(['USDC', 'DAI', 'USDT']);
  });

  it('ranks unheld assets by descending highest rate', () => {
    const lowerRate = createAsset('USDT');
    const higherRate = createAsset('USDC', [
      {
        id: 'money:usdc',
        type: 'MONEY_ACCOUNT_DEPOSIT',
        role: 'funding',
        rate: {
          type: 'APY',
          percentage: 6.2,
          status: 'ready',
        },
        isFeeSubsidized: false,
      },
    ]);

    const result = rankEarnSectionAssets([lowerRate, higherRate]);

    expect(
      result.flatMap((slot) =>
        slot.kind === 'asset' ? [getEarnAssetMetadata(slot.asset).symbol] : [],
      ),
    ).toEqual(['USDC', 'USDT']);
  });

  it('selects the experience with the highest available rate', () => {
    const asset = createAsset('USDC', [
      {
        id: 'lending:usdc',
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        role: 'underlying',
        rate: { type: 'APR', percentage: 4, status: 'ready' },
        isFeeSubsidized: false,
      },
      {
        id: 'money:usdc',
        type: 'MONEY_ACCOUNT_DEPOSIT',
        role: 'funding',
        rate: { type: 'APY', percentage: 6.2, status: 'ready' },
        isFeeSubsidized: false,
      },
    ]);

    const [result] = rankEarnSectionAssets([asset]);

    expect(result.kind).toBe('asset');
    if (result.kind === 'asset') {
      expect(result.asset.highestRatePercent).toBe(6.2);
      expect(result.asset.highestRateExperience?.id).toBe('money:usdc');
    }
  });

  it('pads missing assets to the fixed section limit', () => {
    const result = rankEarnSectionAssets([createAsset('USDC')]);

    expect(result).toHaveLength(EARN_SECTION_ASSET_LIMIT);
    expect(result.filter(({ kind }) => kind === 'unavailable')).toHaveLength(4);
  });

  it('truncates ranked assets to the fixed section limit', () => {
    const assets = ['USDC', 'USDT', 'DAI', 'ETH', 'TRX', 'MUSD'].map((symbol) =>
      createAsset(symbol),
    );

    const result = rankEarnSectionAssets(assets);

    expect(result).toHaveLength(EARN_SECTION_ASSET_LIMIT);
    expect(result.every(({ kind }) => kind === 'asset')).toBe(true);
  });

  it('reports an error rate when no experience has a value', () => {
    const asset = createAsset('USDC', [
      {
        id: 'lending:usdc',
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        role: 'underlying',
        rate: { type: 'APR', status: 'error' },
        isFeeSubsidized: false,
      },
    ]);

    const [result] = rankEarnSectionAssets([asset]);

    expect(result.kind).toBe('asset');
    if (result.kind === 'asset') {
      expect(result.asset.rateStatus).toBe('error');
    }
  });
});

describe('rankEarnAssets', () => {
  it('returns every enriched asset without padding', () => {
    const result = rankEarnAssets([
      createAsset('USDT'),
      createHeldAsset('DAI', 10),
      createHeldAsset('USDC', 20),
    ]);

    expect(result).toHaveLength(3);
    expect(result.map((asset) => getEarnAssetMetadata(asset).symbol)).toEqual([
      'USDC',
      'DAI',
      'USDT',
    ]);
    expect(result.every((asset) => asset.rateStatus === 'ready')).toBe(true);
  });

  it('preserves the selected highest-rate APR or APY experience', () => {
    const [result] = rankEarnAssets([
      createAsset('ETH', [
        {
          id: 'pooled:eth',
          type: EARN_EXPERIENCES.POOLED_STAKING,
          role: 'underlying',
          rate: { type: 'APR', percentage: 4.1, status: 'ready' },
          isFeeSubsidized: false,
        },
        {
          id: 'lending:eth',
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          role: 'underlying',
          rate: { type: 'APY', percentage: 3.9, status: 'ready' },
          isFeeSubsidized: false,
        },
      ]),
    ]);

    expect(result.highestRatePercent).toBe(4.1);
    expect(result.highestRateExperience?.rate.type).toBe('APR');
  });
});

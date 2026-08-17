import { EARN_EXPERIENCES } from '../../constants/experiences';
import type { EarnAsset, EarnAssetId } from '../../types/earnAssets';
import {
  EARN_SECTION_ASSET_LIMIT,
  rankEarnSectionAssets,
} from './rankEarnSectionAssets';

const createAsset = (
  symbol: string,
  overrides: Partial<EarnAsset> = {},
): EarnAsset => ({
  assetId:
    `eip155:1/erc20:0x${symbol.toLowerCase().padEnd(40, '0')}` as EarnAssetId,
  address: `0x${symbol.toLowerCase().padEnd(40, '0')}`,
  chainId: '0x1',
  decimals: 6,
  image: `${symbol}.png`,
  name: symbol,
  symbol,
  balance: '0',
  balanceMinimalUnit: '0',
  logo: `${symbol}.png`,
  isETH: false,
  experiences: [
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
  ...overrides,
});

describe('rankEarnSectionAssets', () => {
  it('ranks held assets by descending fiat balance before unheld assets', () => {
    const unheld = createAsset('USDT');
    const smallerHeld = createAsset('DAI', {
      balanceMinimalUnit: '1',
      balanceFiatNumber: 10,
    });
    const largerHeld = createAsset('USDC', {
      balanceMinimalUnit: '1',
      balanceFiatNumber: 20,
    });

    const result = rankEarnSectionAssets([unheld, smallerHeld, largerHeld]);

    expect(
      result.flatMap((slot) =>
        slot.kind === 'asset' ? [slot.asset.symbol] : [],
      ),
    ).toEqual(['USDC', 'DAI', 'USDT']);
  });

  it('ranks unheld assets by descending highest rate', () => {
    const lowerRate = createAsset('USDT');
    const higherRate = createAsset('USDC', {
      experiences: [
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
      ],
    });

    const result = rankEarnSectionAssets([lowerRate, higherRate]);

    expect(
      result.flatMap((slot) =>
        slot.kind === 'asset' ? [slot.asset.symbol] : [],
      ),
    ).toEqual(['USDC', 'USDT']);
  });

  it('selects the experience with the highest available rate', () => {
    const asset = createAsset('USDC', {
      experiences: [
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
      ],
    });

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
    const asset = createAsset('USDC', {
      experiences: [
        {
          id: 'lending:usdc',
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          role: 'underlying',
          rate: { type: 'APR', status: 'error' },
          isFeeSubsidized: false,
        },
      ],
    });

    const [result] = rankEarnSectionAssets([asset]);

    expect(result.kind).toBe('asset');
    if (result.kind === 'asset') {
      expect(result.asset.rateStatus).toBe('error');
    }
  });
});

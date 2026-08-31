import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { strings } from '../../../../../../locales/i18n';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import type { EarnAssetId, EarnExperience } from '../../types/earnAssets';
import type { EarnSectionRankedAsset } from './rankEarnSectionAssets';
import { getEarnAssetRateCopy } from './getEarnAssetRateCopy';

const createExperience = (
  type: 'APR' | 'APY',
  percentage: number,
): EarnExperience => ({
  id: `earn:${type}`,
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  rate: {
    type,
    percentage,
    status: 'ready',
  },
  isFeeSubsidized: false,
});

const createAsset = ({
  kind = 'discovery',
  rateType = 'APY',
  percentage = 4.2,
  fiatBalance,
}: {
  kind?: 'held' | 'discovery';
  rateType?: 'APR' | 'APY';
  percentage?: number;
  fiatBalance?: number;
} = {}): EarnSectionRankedAsset => {
  const experience = createExperience(rateType, percentage);
  const common = {
    assetId: 'eip155:1/erc20:0xusdc' as EarnAssetId,
    experiences: [experience],
    highestRatePercent: percentage,
    highestRateExperience: experience,
    rateStatus: 'ready' as const,
  };

  if (kind === 'held') {
    return {
      ...common,
      kind,
      asset: {
        accountType: EthAccountType.Eoa,
        accountId: 'account-id',
        assetId: '0xusdc',
        address: '0xusdc',
        chainId: '0x1',
        decimals: 6,
        image: 'usdc.png',
        name: 'USD Coin',
        symbol: 'USDC',
        balance: '1',
        rawBalance: '0x1',
        fiat: {
          balance: fiatBalance ?? 1,
          currency: 'USD',
          conversionRate: 1,
        },
        isNative: false,
      } as Asset,
    };
  }

  return {
    ...common,
    kind,
    metadata: {
      address: '0xusdc',
      chainId: '0x1',
      decimals: 6,
      image: 'usdc.png',
      name: 'USD Coin',
      symbol: 'USDC',
      logo: 'usdc.png',
      isETH: false,
    },
  };
};

describe('getEarnAssetRateCopy', () => {
  it('returns unavailable copy when no rate is available', () => {
    const asset = {
      ...createAsset(),
      highestRatePercent: undefined,
      highestRateExperience: undefined,
    };

    const result = getEarnAssetRateCopy({ asset });

    expect(result).toBe(strings('earn_module.rate_unavailable'));
  });

  it.each([
    ['APR', 'rate_apr'],
    ['APY', 'rate_apy'],
  ] as const)('returns %s copy for a discovery asset', (rateType, key) => {
    const asset = createAsset({ rateType });

    const result = getEarnAssetRateCopy({ asset });

    expect(result).toBe(strings(`earn_module.${key}`, { percentage: '4.2' }));
  });

  it('returns get-started copy for a held asset with enough balance', () => {
    const asset = createAsset({ kind: 'held', fiatBalance: 1 });

    const result = getEarnAssetRateCopy({ asset });

    expect(result).toBe(
      strings('earn_module.get_rate_apy', { percentage: '4.2' }),
    );
  });

  it('returns rate copy for a discovery asset', () => {
    const asset = createAsset({ kind: 'discovery' });

    const result = getEarnAssetRateCopy({ asset });

    expect(result).toBe(strings('earn_module.rate_apy', { percentage: '4.2' }));
  });

  it('truncates the displayed percentage to two decimal places', () => {
    const asset = createAsset({ percentage: 4.219 });

    const result = getEarnAssetRateCopy({ asset });

    expect(result).toBe(
      strings('earn_module.rate_apy', { percentage: '4.21' }),
    );
  });
});

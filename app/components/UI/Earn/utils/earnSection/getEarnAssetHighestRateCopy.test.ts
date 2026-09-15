import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { strings } from '../../../../../../locales/i18n';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import type { EarnAssetId, EarnExperience } from '../../types/earnAssets';
import type { EarnSectionRankedAsset } from './rankEarnSectionAssets';
import { getEarnAssetHighestRateCopy } from './getEarnAssetHighestRateCopy';

const createExperience = (
  type: 'APR' | 'APY',
  percentage: number,
  depositReadiness: EarnExperience['depositReadiness'],
): EarnExperience => ({
  id: `earn:${type}`,
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  depositReadiness,
  rate: {
    type,
    percentage,
    status: 'ready',
  },
  isFeeSubsidized: false,
});

interface CreateAssetOptions {
  rateType?: 'APR' | 'APY';
  percentage?: number;
  fiatBalance?: number;
  depositReadiness?: EarnExperience['depositReadiness'];
}

const createAsset = ({
  rateType = 'APY',
  percentage = 4.2,
  depositReadiness,
}: CreateAssetOptions = {}): EarnSectionRankedAsset => {
  const experience = createExperience(
    rateType,
    percentage,
    depositReadiness ?? { status: 'not_ready', reason: 'asset_not_tracked' },
  );
  const common = {
    assetId: 'eip155:1/erc20:0xusdc' as EarnAssetId,
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
    experiences: [experience],
    highestRatePercent: percentage,
    highestRateExperience: experience,
    rateStatus: 'ready' as const,
  };

  return {
    ...common,
    wallet: { status: 'untracked' as const },
  };
};

const createTrackedAsset = ({
  fiatBalance = 1,
  depositReadiness = { status: 'ready' },
  ...options
}: CreateAssetOptions = {}): EarnSectionRankedAsset => ({
  ...createAsset({ ...options, depositReadiness }),
  wallet: {
    status: 'tracked',
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
        balance: fiatBalance,
        currency: 'USD',
        conversionRate: 1,
      },
      isNative: false,
    } as Asset,
  },
});

describe('getEarnAssetHighestRateCopy', () => {
  it('returns unavailable copy when no rate is available', () => {
    const asset = {
      ...createAsset(),
      highestRatePercent: undefined,
      highestRateExperience: undefined,
    };

    const result = getEarnAssetHighestRateCopy({ asset });

    expect(result).toBe(strings('earn_module.rate_unavailable'));
  });

  it.each([
    ['APR', 'rate_apr'],
    ['APY', 'rate_apy'],
  ] as const)('returns %s copy for an untracked asset', (rateType, key) => {
    const asset = createAsset({ rateType });

    const result = getEarnAssetHighestRateCopy({ asset });

    expect(result).toBe(strings(`earn_module.${key}`, { percentage: '4.2' }));
  });

  it('returns get-started copy for a tracked asset with enough balance', () => {
    const asset = createTrackedAsset({ fiatBalance: 1 });

    const result = getEarnAssetHighestRateCopy({ asset });

    expect(result).toBe(
      strings('earn_module.get_rate_apy', { percentage: '4.2' }),
    );
  });

  it('returns APR get-started copy for a tracked asset with enough balance', () => {
    const asset = createTrackedAsset({
      rateType: 'APR',
      fiatBalance: 1,
    });

    const result = getEarnAssetHighestRateCopy({ asset });

    expect(result).toBe(
      strings('earn_module.get_rate_apr', { percentage: '4.2' }),
    );
  });

  it('returns rate copy for a tracked asset with insufficient balance', () => {
    const asset = createTrackedAsset({
      depositReadiness: {
        status: 'not_ready',
        reason: 'insufficient_balance',
      },
    });

    const result = getEarnAssetHighestRateCopy({ asset });

    expect(result).toBe(strings('earn_module.rate_apy', { percentage: '4.2' }));
  });

  it('truncates the displayed percentage to two decimal places', () => {
    const asset = createAsset({ percentage: 4.219 });

    const result = getEarnAssetHighestRateCopy({ asset });

    expect(result).toBe(
      strings('earn_module.rate_apy', { percentage: '4.21' }),
    );
  });
});

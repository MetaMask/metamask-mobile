import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { strings } from '../../../../../../locales/i18n';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
} from '../../types/earnAssets';
import { rankEarnAssets } from '../earnSection';
import { deriveEarnAssetDisplayData } from './deriveEarnAssetDisplayData';

const createRate = (
  isFeeSubsidized = false,
  overrides: Partial<EarnExperience> = {},
): EarnExperience => ({
  id: 'lending:1:aave:usdc',
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  depositReadiness: { status: 'ready' },
  rate: {
    type: 'APY',
    percentage: 4.2,
    status: 'ready',
  },
  isFeeSubsidized,
  ...overrides,
});

const createTrackedAsset = (
  balance: number,
  isFeeSubsidized = false,
  experiences: readonly EarnExperience[] = [createRate(isFeeSubsidized)],
): EarnAsset => {
  const symbol = 'USDC';
  const asset = {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol,
    balance: String(balance),
    rawBalance: balance === 0 ? '0x0' : '0x1',
    fiat: {
      balance,
      currency: 'USD',
      conversionRate: 1,
    },
    isNative: false,
  } as Asset;

  return {
    assetId:
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId,
    metadata: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x1',
      decimals: 6,
      image: 'usdc.png',
      name: 'USD Coin',
      symbol,
      ticker: symbol,
      logo: 'usdc.png',
      isETH: false,
      isStaked: false,
    },
    wallet: { status: 'tracked', asset },
    experiences,
  };
};

const createUntrackedAsset = (): EarnAsset => ({
  assetId:
    'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7' as EarnAssetId,
  metadata: {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    chainId: '0x1',
    decimals: 6,
    image: 'usdt.png',
    name: 'Tether USD',
    symbol: 'USDT',
    ticker: 'USDT',
    logo: 'usdt.png',
    isETH: false,
  },
  wallet: { status: 'untracked' },
  experiences: [
    {
      ...createRate(),
      depositReadiness: { status: 'not_ready', reason: 'asset_not_tracked' },
    },
  ],
});

const rankAsset = (asset: EarnAsset) => rankEarnAssets([asset])[0];

describe('earnDisplayData', () => {
  describe('deriveEarnAssetDisplayData', () => {
    it('derives display data for a tracked asset with a ready deposit', () => {
      const displayData = deriveEarnAssetDisplayData(
        rankAsset(createTrackedAsset(10, true)),
      );

      expect(displayData.metadata).toMatchObject({
        name: 'USD Coin',
        symbol: 'USDC',
        ticker: 'USDC',
        chainId: '0x1',
      });
      expect(displayData.fiatBalance).toBe('$10.00');
      expect(displayData.hasMinDepositAmount).toBe(true);
      expect(displayData.hasSubsidizedFee).toBe(true);
      expect(displayData.highestRateCopy).toBe(
        strings('earn_module.get_rate_apy', { percentage: '4.2' }),
      );
    });

    it('derives display data for a deposit that is not ready', () => {
      const asset: EarnAsset = {
        ...createTrackedAsset(10),
        experiences: [
          {
            ...createRate(),
            depositReadiness: {
              status: 'not_ready',
              reason: 'insufficient_balance',
            },
          },
        ],
      };

      const displayData = deriveEarnAssetDisplayData(rankAsset(asset));

      expect(displayData.fiatBalance).toBe('$10.00');
      expect(displayData.hasMinDepositAmount).toBe(false);
      expect(displayData.hasSubsidizedFee).toBe(false);
      expect(displayData.highestRateCopy).toBe(
        strings('earn_module.rate_apy', { percentage: '4.2' }),
      );
    });

    it('derives APR get-started copy for a ready APR experience', () => {
      const displayData = deriveEarnAssetDisplayData(
        rankAsset(
          createTrackedAsset(10, false, [
            createRate(false, {
              rate: {
                type: 'APR',
                percentage: 3.8,
                status: 'ready',
              },
            }),
          ]),
        ),
      );

      expect(displayData.highestRateCopy).toBe(
        strings('earn_module.get_rate_apr', { percentage: '3.8' }),
      );
    });

    it('derives unavailable copy for an experience without a ready rate', () => {
      const displayData = deriveEarnAssetDisplayData(
        rankAsset(
          createTrackedAsset(10, false, [
            createRate(false, {
              rate: {
                type: 'APY',
                status: 'unavailable',
              },
            }),
          ]),
        ),
      );

      expect(displayData.highestRateCopy).toBe(
        strings('earn_module.rate_unavailable'),
      );
    });

    it('derives unavailable copy when the asset has no experiences', () => {
      const displayData = deriveEarnAssetDisplayData(
        rankAsset(createTrackedAsset(10, false, [])),
      );

      expect(displayData.highestRateCopy).toBe(
        strings('earn_module.rate_unavailable'),
      );
    });

    it('ignores output experiences when deriving display rate data', () => {
      const displayData = deriveEarnAssetDisplayData(
        rankAsset(
          createTrackedAsset(10, false, [
            createRate(false, {
              role: 'output',
              rate: {
                type: 'APR',
                percentage: 3.8,
                status: 'ready',
              },
            }),
          ]),
        ),
      );

      expect(displayData.hasMinDepositAmount).toBe(false);
      expect(displayData.highestRateCopy).toBe(
        strings('earn_module.rate_unavailable'),
      );
    });

    it('derives display data for an untracked asset without a fiat balance', () => {
      const displayData = deriveEarnAssetDisplayData(
        rankAsset(createUntrackedAsset()),
      );

      expect(displayData.fiatBalance).toBeUndefined();
      expect(displayData.hasMinDepositAmount).toBe(false);
      expect(displayData.highestRateCopy).toBe(
        strings('earn_module.rate_apy', { percentage: '4.2' }),
      );
    });
  });
});

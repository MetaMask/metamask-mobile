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

const createRate = (isFeeSubsidized = false): EarnExperience => ({
  id: 'lending:1:aave:usdc',
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  rate: {
    type: 'APY',
    percentage: 4.2,
    status: 'ready',
  },
  isFeeSubsidized,
});

const createHeldAsset = (
  balance: number,
  isFeeSubsidized = false,
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
    kind: 'held',
    assetId:
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId,
    asset,
    experiences: [createRate(isFeeSubsidized)],
  };
};

const createDiscoveryAsset = (): EarnAsset => ({
  kind: 'discovery',
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
  experiences: [createRate()],
});

const rankAsset = (asset: EarnAsset) => rankEarnAssets([asset])[0];

describe('earnDisplayData', () => {
  describe('deriveEarnAssetDisplayData', () => {
    it('derives display data for a held asset meeting the minimum deposit', () => {
      const displayData = deriveEarnAssetDisplayData(
        rankAsset(createHeldAsset(10, true)),
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
      expect(displayData.rateCopy).toBe(
        strings('earn_module.get_rate_apy', { percentage: '4.2' }),
      );
    });

    it('derives display data for a held asset below the minimum deposit', () => {
      const displayData = deriveEarnAssetDisplayData(
        rankAsset(createHeldAsset(0.001)),
      );

      expect(displayData.fiatBalance).toBe('$0.00');
      expect(displayData.hasMinDepositAmount).toBe(false);
      expect(displayData.hasSubsidizedFee).toBe(false);
      expect(displayData.rateCopy).toBe(
        strings('earn_module.rate_apy', { percentage: '4.2' }),
      );
    });

    it('derives display data for a discovery asset without a fiat balance', () => {
      const displayData = deriveEarnAssetDisplayData(
        rankAsset(createDiscoveryAsset()),
      );

      expect(displayData.fiatBalance).toBeUndefined();
      expect(displayData.hasMinDepositAmount).toBe(false);
      expect(displayData.rateCopy).toBe(
        strings('earn_module.rate_apy', { percentage: '4.2' }),
      );
    });
  });
});

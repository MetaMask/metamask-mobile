import { renderHook } from '@testing-library/react-native';
import { EarnStrategyRiskLevel } from '../components/EarnStrategyCard';
import { EARN_EXPERIENCES } from '../constants/experiences';
import type { EarnAsset, EarnAssetId } from '../types/earnAssets';
import useEarnAssetCatalogue from './useEarnAssetCatalogue';
import useEarnAssetStrategies from './useEarnAssetStrategies';

jest.mock('./useEarnAssetCatalogue');

const mockUseEarnAssetCatalogue = useEarnAssetCatalogue as jest.MockedFunction<
  typeof useEarnAssetCatalogue
>;
const assetId =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId;

const createCatalogueResult = (): ReturnType<typeof useEarnAssetCatalogue> => {
  const asset: EarnAsset = {
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
        rate: {
          type: 'APY',
          percentage: 6.2,
          status: 'ready',
        },
        isFeeSubsidized: false,
      },
      {
        id: 'lending:usdc',
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        role: 'underlying',
        rate: {
          type: 'APY',
          percentage: 4.2,
          status: 'ready',
        },
        isFeeSubsidized: false,
      },
    ],
  };
  return {
    assets: [asset],
    assetsById: { [assetId]: asset },
    isLoading: false,
    hasError: false,
    errors: [],
    refresh: jest.fn(),
    moneyApyPercent: 6.2,
    moneyRateStatus: 'ready',
  };
};

const withAssets = (
  catalogue: ReturnType<typeof useEarnAssetCatalogue>,
  assets: ReturnType<typeof useEarnAssetCatalogue>['assets'],
): ReturnType<typeof useEarnAssetCatalogue> => ({
  ...catalogue,
  assets,
  assetsById: Object.fromEntries(
    assets.map((asset) => [asset.assetId.toLowerCase(), asset]),
  ),
});

describe('useEarnAssetStrategies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEarnAssetCatalogue.mockReturnValue(createCatalogueResult());
  });

  it('maps all asset experiences to live strategy models', () => {
    const { result } = renderHook(() => useEarnAssetStrategies(assetId));

    expect(result.current.strategies.map(({ title }) => title)).toEqual([
      '6.2% APY',
      '4.2% APY',
    ]);
    expect(result.current.strategies.map(({ risk }) => risk)).toEqual([
      EarnStrategyRiskLevel.Recommended,
      EarnStrategyRiskLevel.Medium,
    ]);
  });

  it('uses unavailable copy when an experience has no rate', () => {
    const catalogue = createCatalogueResult();
    mockUseEarnAssetCatalogue.mockReturnValue(
      withAssets(catalogue, [
        {
          ...catalogue.assets[0],
          experiences: [
            {
              ...catalogue.assets[0].experiences[0],
              rate: {
                type: 'APY',
                status: 'error',
              },
            },
            catalogue.assets[0].experiences[1],
          ],
        },
      ]),
    );

    const { result } = renderHook(() => useEarnAssetStrategies(assetId));

    expect(result.current.strategies[0].title).toBe('Rate unavailable');
  });

  it('returns no strategies when the asset ID is absent', () => {
    const missingAssetId =
      'eip155:1/erc20:0x0000000000000000000000000000000000000001' as EarnAssetId;

    const { result } = renderHook(() => useEarnAssetStrategies(missingAssetId));

    expect(result.current.asset).toBeUndefined();
    expect(result.current.strategies).toEqual([]);
  });

  it('maps TRX staking to the low-risk staking presentation', () => {
    const catalogue = createCatalogueResult();
    mockUseEarnAssetCatalogue.mockReturnValue(
      withAssets(catalogue, [
        {
          ...catalogue.assets[0],
          experiences: [
            {
              id: 'trx-staking:trx',
              type: EARN_EXPERIENCES.TRX_STAKING,
              role: 'underlying',
              rate: {
                type: 'APR',
                percentage: 4.5,
                status: 'ready',
              },
              isFeeSubsidized: false,
            },
          ],
        },
      ]),
    );

    const { result } = renderHook(() => useEarnAssetStrategies(assetId));

    expect(result.current.strategies[0].risk).toBe(EarnStrategyRiskLevel.Low);
    expect(result.current.strategies[0].title).toBe('4.5% APR');
    expect(result.current.strategies[0].subtitle).toBe('Stake USDC');
  });

  it('labels pooled staking rates as APR', () => {
    const catalogue = createCatalogueResult();
    mockUseEarnAssetCatalogue.mockReturnValue(
      withAssets(catalogue, [
        {
          ...catalogue.assets[0],
          experiences: [
            {
              id: 'pooled:eth',
              type: EARN_EXPERIENCES.POOLED_STAKING,
              role: 'underlying',
              rate: {
                type: 'APR',
                percentage: 3.8,
                status: 'ready',
              },
              isFeeSubsidized: false,
            },
          ],
        },
      ]),
    );

    const { result } = renderHook(() => useEarnAssetStrategies(assetId));

    expect(result.current.strategies[0].title).toBe('3.8% APR');
  });
});

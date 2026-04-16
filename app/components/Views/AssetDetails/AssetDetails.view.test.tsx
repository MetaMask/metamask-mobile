import '../../../../tests/component-view/mocks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { renderAssetDetailsView } from '../../../../tests/component-view/renderers/assetDetails';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { MarketInsightsSelectorsIDs } from '../../../components/UI/MarketInsights/MarketInsights.testIds';
import { remoteFeatureFlagMarketInsightsEnabled } from '../../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import {
  MOCK_PERPS_MARKET_INSIGHTS_REPORT,
  setupMarketInsightsEngineMock,
} from '../../../../tests/component-view/fixtures/perpsMarketInsights';

// addresses Regression: #25100 – Token Details page shows wrong network

const ETH_NATIVE = '0x0000000000000000000000000000000000000000';

describeForPlatforms('AssetDetails', () => {
  it('displays network name from token chainId, not from selected network', () => {
    const polygonTokenAddress = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';

    const { getAllByText, queryByText } = renderAssetDetailsView({
      deterministicFiat: true,
      routeParams: {
        address: polygonTokenAddress,
        chainId: '0x89',
        asset: {
          address: polygonTokenAddress,
          symbol: 'WETH',
          decimals: 18,
          name: 'Wrapped Ether',
          image: '',
          isNative: false,
          isETH: false,
          aggregators: [],
        },
      },
    });

    // Network name should appear twice: header subtitle + "Network" section body
    const polygonTexts = getAllByText('Polygon');
    expect(polygonTexts.length).toBeGreaterThanOrEqual(2);

    // The globally selected network (Ethereum Main Network) should NOT appear
    expect(queryByText('Ethereum Main Network')).toBeNull();
  });

  describe('Market Insights entry card (token details)', () => {
    const ethereumMainnetRoute = {
      address: ETH_NATIVE,
      chainId: CHAIN_IDS.MAINNET,
      asset: {
        address: ETH_NATIVE,
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
        image: '',
        isNative: true,
        isETH: true,
        aggregators: [],
      },
    };

    it('does not display entry card when API returns no data', () => {
      setupMarketInsightsEngineMock(null);

      const { queryByTestId } = renderAssetDetailsView({
        deterministicFiat: true,
        routeParams: ethereumMainnetRoute,
        overrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags:
                  remoteFeatureFlagMarketInsightsEnabled(true),
              },
            },
          },
        },
      });

      expect(queryByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD)).toBeNull();
    });

    it('does not display entry card when feature flag is disabled', () => {
      setupMarketInsightsEngineMock(MOCK_PERPS_MARKET_INSIGHTS_REPORT);

      const { queryByTestId } = renderAssetDetailsView({
        deterministicFiat: true,
        routeParams: ethereumMainnetRoute,
        overrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags:
                  remoteFeatureFlagMarketInsightsEnabled(false),
              },
            },
          },
        },
      });

      expect(queryByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD)).toBeNull();
    });
  });
});

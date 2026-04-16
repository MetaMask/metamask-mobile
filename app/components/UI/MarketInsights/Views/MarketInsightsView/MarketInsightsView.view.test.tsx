/**
 * Component view tests for token (non-Perps) MarketInsightsView: content, swap/buy navigation, thumbs up.
 * Mirrors smoke: tests/smoke/assets/market-insights/view-market-insights.spec.ts (cases 7, 10, 11).
 * Run: yarn test:view:one MarketInsightsView.view.test.tsx
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  MOCK_PERPS_MARKET_INSIGHTS_REPORT,
  setupMarketInsightsEngineMock,
} from '../../../../../../tests/component-view/fixtures/perpsMarketInsights';
import { renderMarketInsightsViewWithNavigation } from '../../../../../../tests/component-view/renderers/marketInsights';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { BuildQuoteSelectors } from '../../../Ramp/Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';
import { analytics } from '../../../../../util/analytics/analytics';
import { resetFeedbackCache } from './MarketInsightsView';

const ETH_MAINNET_ROUTE_PARAMS = {
  assetSymbol: 'ETH',
  assetIdentifier: 'eip155:1/slip44:60',
  tokenAddress: '0x0000000000000000000000000000000000000000',
  tokenDecimals: 18,
  tokenName: 'Ethereum',
  tokenChainId: CHAIN_IDS.MAINNET,
};

describeForPlatforms('MarketInsightsView (token flow)', () => {
  beforeEach(() => {
    setupMarketInsightsEngineMock(MOCK_PERPS_MARKET_INSIGHTS_REPORT);
  });

  afterEach(() => {
    resetFeedbackCache();
  });

  it('displays market insights content and navigates to swap', async () => {
    renderMarketInsightsViewWithNavigation({
      initialParams: ETH_MAINNET_ROUTE_PARAMS,
    });

    expect(
      await screen.findByTestId(MarketInsightsSelectorsIDs.VIEW_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(
        'Ethereum shows strong momentum amid institutional demand',
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(
        'Ethereum continues to attract institutional interest with increasing on-chain activity and a healthy DeFi ecosystem.',
      ),
    ).toBeOnTheScreen();
    expect(await screen.findByText('Institutional Adoption')).toBeOnTheScreen();
    expect(await screen.findByText('DeFi Activity Surge')).toBeOnTheScreen();

    fireEvent.press(
      await screen.findByTestId(MarketInsightsSelectorsIDs.SWAP_BUTTON),
    );

    expect(await screen.findByTestId('route-BridgeView')).toBeOnTheScreen();
  });

  it('navigates to buy flow when tapping Buy button', async () => {
    renderMarketInsightsViewWithNavigation({
      initialParams: ETH_MAINNET_ROUTE_PARAMS,
    });

    await screen.findByTestId(MarketInsightsSelectorsIDs.VIEW_CONTAINER);

    fireEvent.press(
      await screen.findByTestId(MarketInsightsSelectorsIDs.BUY_BUTTON),
    );

    expect(
      await screen.findByTestId(BuildQuoteSelectors.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('can tap thumbs up feedback button', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    try {
      renderMarketInsightsViewWithNavigation({
        initialParams: ETH_MAINNET_ROUTE_PARAMS,
      });

      await screen.findByTestId(MarketInsightsSelectorsIDs.VIEW_CONTAINER);

      const thumbsUp = await screen.findByTestId(
        MarketInsightsSelectorsIDs.THUMBS_UP_BUTTON,
      );
      trackEventSpy.mockClear();
      fireEvent.press(thumbsUp);

      await waitFor(() => {
        expect(trackEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Market Insights Interaction',
            properties: expect.objectContaining({
              interaction_type: 'thumbs_up',
            }),
          }),
        );
      });
    } finally {
      trackEventSpy.mockRestore();
    }
  });
});

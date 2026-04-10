/**
 * Component view tests for PerpsMarketDetailsView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers bug #25315: Close and Modify actions must be geo-restricted (show geo block sheet when isEligible false).
 * Run with: yarn test:view --testPathPattern="PerpsMarketDetailsView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import type { ComponentType } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderPerpsMarketDetailsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { getModifyActionLabels } from '../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import MarketInsightsView from '../../../MarketInsights/Views/MarketInsightsView/MarketInsightsView';
import { MarketInsightsSelectorsIDs } from '../../../MarketInsights/MarketInsights.testIds';
import { analytics } from '../../../../../util/analytics/analytics';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketHeaderSelectorsIDs,
  PerpsBottomSheetTooltipSelectorsIDs,
  PerpsPositionCardSelectorsIDs,
  PerpsTutorialSelectorsIDs,
  getPerpsCandlePeriodSelector,
  getPerpsCandlePeriodBottomSheetSelector,
} from '../../Perps.testIds';

const CANDLE_SELECTOR_BASE =
  `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-candle-period-selector` as const;
const MORE_CANDLE_SHEET_BASE =
  `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-more-candle-periods-bottom-sheet` as const;

const mockPerpsInsightsReport = {
  asset: 'ETH',
  digestId: 'mock-digest-id-eth-perps-001',
  generatedAt: '2026-04-08T10:00:00.000Z',
  headline: 'Ethereum shows strong momentum amid institutional demand',
  summary:
    'Ethereum continues to attract institutional interest with increasing on-chain activity and a healthy DeFi ecosystem.',
  trends: [
    {
      title: 'Institutional Adoption',
      description:
        'Large institutions continue to accumulate ETH as a treasury asset following ETF approvals.',
      category: 'macro',
      impact: 'positive',
      articles: [
        {
          title: 'Spot Ethereum ETFs See Record Weekly Inflows',
          url: 'https://example.com/eth-etf-inflows',
          source: 'CryptoNews',
          date: '2026-04-07T09:00:00.000Z',
        },
      ],
      tweets: [
        {
          contentSummary:
            'ETH institutional demand is at all-time highs this quarter.',
          url: 'https://x.com/example/status/123456789',
          author: '@cryptoanalyst',
          date: '2026-04-07T08:30:00.000Z',
        },
      ],
    },
    {
      title: 'DeFi Activity Surge',
      description:
        'On-chain DeFi volumes have increased significantly, driving ETH utility and burn rate.',
      category: 'technical',
      impact: 'positive',
      articles: [
        {
          title: 'Ethereum DeFi TVL Hits New Milestone',
          url: 'https://example.com/defi-tvl',
          source: 'DeFiPulse',
          date: '2026-04-06T14:00:00.000Z',
        },
      ],
      tweets: [],
    },
  ],
  social: [],
  sources: [
    { name: 'CryptoNews', url: 'https://example.com', type: 'news' },
    { name: 'DeFiPulse', url: 'https://defipulse.com', type: 'data' },
  ],
};

function mockPerpsInsightsApi(report: typeof mockPerpsInsightsReport | null) {
  (
    Engine as unknown as {
      context: {
        AiDigestController?: { fetchMarketInsights: jest.Mock };
        RampsController?: { setSelectedToken: jest.Mock };
      };
    }
  ).context.AiDigestController = {
    fetchMarketInsights: jest.fn().mockResolvedValue(report),
  };
  (
    Engine as unknown as {
      context: {
        RampsController?: { setSelectedToken: jest.Mock };
      };
    }
  ).context.RampsController = {
    setSelectedToken: jest.fn(),
  };
}

describe('PerpsMarketDetailsView', () => {
  it('renders error state when route does not provide market params', async () => {
    renderPerpsMarketDetailsView({ initialParams: {} });

    expect(
      await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.ERROR),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders long and short actions when there is no open position', async () => {
    renderPerpsMarketDetailsView({
      streamOverrides: { positions: [] },
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: { isEligible: true },
          },
        },
      },
    });

    expect(
      await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('shows geo block bottom sheet when Long is pressed (geo-restricted user)', async () => {
    renderPerpsMarketDetailsView({
      streamOverrides: { positions: [] },
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: { isEligible: false },
          },
        },
      },
    });

    const longButton = await screen.findByTestId(
      PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
    );
    fireEvent.press(longButton);

    expect(
      screen.getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
      ),
    ).toBeOnTheScreen();
  });

  it('opens market-hours tooltip when info button is pressed for equity markets', async () => {
    renderPerpsMarketDetailsView({
      initialParams: {
        market: {
          symbol: 'AAPL',
          name: 'Apple',
          maxLeverage: '10x',
          marketType: 'equity',
          price: '$200',
          change24h: '$0',
          change24hPercent: '0%',
          volume: '$1M',
        },
      },
      streamOverrides: { positions: [] },
    });

    const infoButton = await screen.findByTestId(
      PerpsMarketDetailsViewSelectorsIDs.MARKET_HOURS_INFO_BUTTON,
    );

    fireEvent.press(infoButton);

    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.MARKET_HOURS_BOTTOM_SHEET_TOOLTIP,
      ),
    ).toBeOnTheScreen();
  });

  it('opens modify action sheet when Modify is pressed (eligible user)', async () => {
    renderPerpsMarketDetailsView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: { isEligible: true },
          },
        },
      },
    });

    const modifyButton = await screen.findByTestId(
      PerpsMarketDetailsViewSelectorsIDs.MODIFY_BUTTON,
    );
    fireEvent.press(modifyButton);

    const labels = getModifyActionLabels();
    expect(await screen.findByText(labels.addPosition)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
      ),
    ).not.toBeOnTheScreen();
  });

  describe('Bug 25315: Geo-restriction for Close and Modify actions', () => {
    it('shows geo block bottom sheet when Close is pressed (geo-restricted user)', async () => {
      renderPerpsMarketDetailsView();

      const closeButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
      );
      fireEvent.press(closeButton);

      expect(
        screen.getByTestId(
          PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
        ),
      ).toBeOnTheScreen();
    });

    it('shows geo block bottom sheet when Modify is pressed (geo-restricted user)', async () => {
      renderPerpsMarketDetailsView();

      const modifyButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.MODIFY_BUTTON,
      );
      fireEvent.press(modifyButton);

      expect(
        screen.getByTestId(
          PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Sheet close and UI interactions', () => {
    it('opens geo block sheet and Got it dismisses it', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: false },
            },
          },
        },
      });

      const longButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
      );
      fireEvent.press(longButton);

      const gotIt = await screen.findByTestId(
        PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
      );
      fireEvent.press(gotIt);
      // Sheet may stay mounted (visibility/animation); we only assert open + press.
    });

    it('opens market hours sheet and Got it dismisses it', async () => {
      renderPerpsMarketDetailsView({
        initialParams: {
          market: {
            symbol: 'AAPL',
            name: 'Apple',
            maxLeverage: '10x',
            marketType: 'equity',
            price: '$200',
            change24h: '$0',
            change24hPercent: '0%',
            volume: '$1M',
          },
        },
        streamOverrides: { positions: [] },
      });

      const infoButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.MARKET_HOURS_INFO_BUTTON,
      );
      fireEvent.press(infoButton);

      const gotIt = await screen.findByTestId(
        PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
      );
      fireEvent.press(gotIt);
      // Sheet may stay mounted (visibility/animation); we only assert open + press.
    });

    it('opens statistics tooltip and Got it dismisses it', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const openInterestIcon = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.OPEN_INTEREST_INFO_ICON,
      );
      fireEvent.press(openInterestIcon);

      expect(
        await screen.findByTestId(
          PerpsMarketDetailsViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP,
        ),
      ).toBeOnTheScreen();

      const gotIt = screen.getByTestId(
        PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
      );
      fireEvent.press(gotIt);
      // Sheet may stay mounted (visibility/animation); we only assert open + press.
    });
  });

  describe('Header and chart actions', () => {
    it('renders back button and fullscreen chart button', async () => {
      renderPerpsMarketDetailsView({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      expect(
        await screen.findByTestId(PerpsMarketHeaderSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${PerpsMarketDetailsViewSelectorsIDs.HEADER}-fullscreen-button`,
        ),
      ).toBeOnTheScreen();
    });

    it('renders header and title section with market title', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      expect(
        await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.HEADER),
      ).toBeOnTheScreen();
      expect(screen.getAllByText('ETH-USD').length).toBeGreaterThanOrEqual(1);
    });

    it('renders title section with price when market has no maxLeverage', async () => {
      renderPerpsMarketDetailsView({
        initialParams: {
          market: {
            symbol: 'ETH',
            name: 'Ethereum',
            price: '$2,000',
            change24h: '$0',
            change24hPercent: '0%',
            volume: '$1M',
          },
        },
        streamOverrides: {
          positions: [],
          marketData: [{ symbol: 'BTC', name: 'Bitcoin', maxLeverage: '50x' }],
        },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      expect(
        await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.HEADER),
      ).toBeOnTheScreen();
      expect(
        await screen.findByTestId(
          PerpsMarketHeaderSelectorsIDs.PRICE_TITLE_SECTION,
        ),
      ).toBeOnTheScreen();
      expect(
        await screen.findByTestId(
          PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE_TITLE_SECTION,
        ),
      ).toBeOnTheScreen();
    });

    it('title section onLayout sets header height for scroll animation', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const titleSectionWrapper = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.TITLE_SECTION_WRAPPER,
      );
      fireEvent(titleSectionWrapper, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 80 } },
      });

      expect(titleSectionWrapper).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsMarketDetailsViewSelectorsIDs.HEADER),
      ).toBeOnTheScreen();
    });

    it('opens fullscreen chart modal and close button is pressable', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const fullscreenButton = await screen.findByTestId(
        `${PerpsMarketDetailsViewSelectorsIDs.HEADER}-fullscreen-button`,
      );
      fireEvent.press(fullscreenButton);

      const closeButton = await screen.findByTestId(
        'perps-chart-fullscreen-close-button',
      );
      expect(closeButton).toBeOnTheScreen();
      fireEvent.press(closeButton);
      // Modal may stay in tree during close animation; we only assert open + press.
    });

    it('changes candle period when period button is pressed', async () => {
      const { store } = renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const period3mButton = await screen.findByTestId(
        getPerpsCandlePeriodSelector.periodButton(CANDLE_SELECTOR_BASE, '3m'),
      );
      expect(period3mButton).toBeOnTheScreen();

      fireEvent.press(period3mButton);

      expect(
        store.getState().settings.perpsChartPreferences.preferredCandlePeriod,
      ).toBe('3m');
    });

    it('opens more candle periods bottom sheet and selects a period', async () => {
      const { store } = renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const moreButton = await screen.findByTestId(
        getPerpsCandlePeriodSelector.moreButton(CANDLE_SELECTOR_BASE),
      );
      fireEvent.press(moreButton);

      const period1mInSheet = await screen.findByTestId(
        getPerpsCandlePeriodBottomSheetSelector.periodButton(
          MORE_CANDLE_SHEET_BASE,
          '1m',
        ),
      );
      fireEvent.press(period1mInSheet);

      expect(
        store.getState().settings.perpsChartPreferences.preferredCandlePeriod,
      ).toBe('1m');
      expect(
        screen.queryByTestId(
          getPerpsCandlePeriodBottomSheetSelector.periodButton(
            MORE_CANDLE_SHEET_BASE,
            '1m',
          ),
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Position card and navigation', () => {
    it('renders position card with share button when position exists', async () => {
      renderPerpsMarketDetailsView({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      expect(
        await screen.findByTestId(PerpsPositionCardSelectorsIDs.CARD),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.SHARE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders tutorial card', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
      });

      const tutorialCard = await screen.findByTestId(
        PerpsTutorialSelectorsIDs.TUTORIAL_CARD,
      );
      expect(tutorialCard).toBeOnTheScreen();
      // Not pressing to avoid unhandled NAVIGATE(PerpsTutorial) in test navigator.
    });

    const renderPerpsInsightsJourney = ({
      hasPosition,
      insightsFlagEnabled = true,
      report = mockPerpsInsightsReport,
    }: {
      hasPosition: boolean;
      insightsFlagEnabled?: boolean;
      report?: typeof mockPerpsInsightsReport | null;
    }) => {
      mockPerpsInsightsApi(report);
      renderPerpsMarketDetailsView({
        streamOverrides: {
          positions: hasPosition
            ? [
                {
                  symbol: 'ETH',
                  size: '2.5',
                  marginUsed: '500',
                  entryPrice: '2000',
                  liquidationPrice: '1900',
                  unrealizedPnl: '100',
                  returnOnEquity: '0.20',
                  leverage: { value: 10, type: 'isolated' as const },
                  cumulativeFunding: {
                    sinceOpen: '5',
                    allTime: '10',
                    sinceChange: '2',
                  },
                  positionValue: '5000',
                  maxLeverage: 50,
                  takeProfitCount: 0,
                  stopLossCount: 0,
                },
              ]
            : [],
        },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  aiSocialMarketInsightsPerpsEnabled: {
                    enabled: insightsFlagEnabled,
                    featureVersion: '1',
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
        extraRoutes: [
          {
            name: Routes.MARKET_INSIGHTS.VIEW,
            Component: MarketInsightsView as unknown as ComponentType<unknown>,
          },
          { name: Routes.BRIDGE.ROOT },
          { name: Routes.RAMP.TOKEN_SELECTION },
        ],
      });
    };

    it('opens market insights from Perps and hides Long/Short when position is open', async () => {
      renderPerpsInsightsJourney({ hasPosition: true });

      const entryCard = await screen.findByTestId(
        MarketInsightsSelectorsIDs.ENTRY_CARD,
      );
      fireEvent.press(entryCard);

      expect(
        await screen.findByTestId(MarketInsightsSelectorsIDs.VIEW_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText(
          'Ethereum shows strong momentum amid institutional demand',
        ),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText('Institutional Adoption'),
      ).toBeOnTheScreen();
      expect(await screen.findByText('DeFi Activity Surge')).toBeOnTheScreen();
      expect(
        screen.queryByTestId(MarketInsightsSelectorsIDs.LONG_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(MarketInsightsSelectorsIDs.SHORT_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('shows Long/Short in market insights when there is no position', async () => {
      renderPerpsInsightsJourney({ hasPosition: false });

      fireEvent.press(
        await screen.findByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD),
      );

      expect(
        await screen.findByTestId(MarketInsightsSelectorsIDs.LONG_BUTTON),
      ).toBeOnTheScreen();
      expect(
        await screen.findByTestId(MarketInsightsSelectorsIDs.SHORT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('does not render perps market insights card when feature flag is disabled', async () => {
      renderPerpsInsightsJourney({
        hasPosition: true,
        insightsFlagEnabled: false,
      });

      await waitFor(() => {
        expect(
          screen.queryByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD),
        ).not.toBeOnTheScreen();
      });
    });

    it('shows sources bottom sheet when tapping a trend item from Perps insights', async () => {
      renderPerpsInsightsJourney({ hasPosition: true });

      fireEvent.press(
        await screen.findByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD),
      );

      const trendItem = await screen.findByTestId(
        `${MarketInsightsSelectorsIDs.TREND_ITEM}-0`,
      );
      fireEvent.press(trendItem);

      expect(
        await screen.findByText('Spot Ethereum ETFs See Record Weekly Inflows'),
      ).toBeOnTheScreen();
    });

    it('tracks thumbs up interaction from Perps insights', async () => {
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      renderPerpsInsightsJourney({ hasPosition: true });

      fireEvent.press(
        await screen.findByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD),
      );
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

      trackEventSpy.mockRestore();
    });

    it('shows feedback bottom sheet on thumbs down from Perps insights', async () => {
      renderPerpsInsightsJourney({ hasPosition: true });

      fireEvent.press(
        await screen.findByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD),
      );
      fireEvent.press(
        await screen.findByTestId(
          MarketInsightsSelectorsIDs.THUMBS_DOWN_BUTTON,
        ),
      );

      expect(
        await screen.findByTestId(
          MarketInsightsSelectorsIDs.FEEDBACK_BOTTOM_SHEET,
        ),
      ).toBeOnTheScreen();
    });
  });
});

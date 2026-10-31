/**
 * Component view tests for PerpsMarketDetailsView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers bug #25315: Close and Modify actions must be geo-restricted (show geo block sheet when isEligible false).
 * Run with: yarn test:view --testPathPattern="PerpsMarketDetailsView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import type { ComponentType } from 'react';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import {
  CandlePeriod,
  type CandleData,
  type Position,
} from '@metamask/perps-controller';
import {
  MOCK_PERPS_MARKET_INSIGHTS_REPORT,
  OPEN_POSITION_STREAM_ITEM,
  setupPerpsMarketInsightsEngineMock,
} from '../../../../../../tests/component-view/fixtures/perpsMarketInsights';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsMarketDetailsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import {
  SOCIAL_V1_AB_KEY,
  SocialV1Variant,
} from '../../../../Views/SocialLeaderboard/SocialV1View/abTestConfig';
import {
  createPerpsControllerStateHarness,
  getModifyActionLabels,
} from '../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import { getTraderRowTestId } from '../../../../Views/Homepage/Sections/TopTraders/components/TraderRow.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import EngineService from '../../../../../core/EngineService';
import MarketInsightsView from '../../../MarketInsights/Views/MarketInsightsView/MarketInsightsView';
import { MarketInsightsSelectorsIDs } from '../../../MarketInsights/MarketInsights.testIds';
import { analytics } from '../../../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  clearLeaderboardApiMock,
  getLeaderboardMessengerSpy,
  mockPerpsTraders,
  setupLeaderboardApiMock,
} from '../../../../../../tests/component-view/api-mocking/socialLeaderboard';
import { mockPerpFeedItem } from '../../../SocialFeed/mocks/coreFeed.mock';
import { SocialFeedPostShellSelectorsIDs } from '../../../SocialFeed/components/SocialFeedPostShell.testIds';
import { LiveViewSelectorsIDs } from '../../../../Views/SocialLeaderboard/LiveView/LiveView.testIds';
import { SocialLeaderboardSelectorsIDs } from '../../../SocialLeaderboard';
import {
  getPerpsMarketDetailsTabSelector,
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketHeaderSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
  PerpsModeToggleSelectorsIDs,
  PerpsBottomSheetTooltipSelectorsIDs,
  PerpsPositionCardSelectorsIDs,
  PerpsTPSLViewSelectorsIDs,
  PerpsTutorialSelectorsIDs,
} from '../../Perps.testIds';
import PerpsTPSLView from '../PerpsTPSLView/PerpsTPSLView';
import {
  getCandlePeriodSelectorSelectors as getPerpsCandlePeriodSelector,
  getCandlePeriodBottomSheetSelectors as getPerpsCandlePeriodBottomSheetSelector,
} from '../../../Charts/CandlePeriodSelector';
import { strings } from '../../../../../../locales/i18n';
import {
  acceptSocialTerms,
  resetSocialTermsAcceptance,
} from '../../../../Views/SocialLeaderboard/terms/socialTermsAcceptance';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { PERPS_SHARE_POSITION_INTERACTION_TYPE } from '../PerpsSharePositionView/PerpsSharePositionView.constants';

const CANDLE_SELECTOR_BASE =
  `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-candle-period-selector` as const;
const MORE_CANDLE_SHEET_BASE =
  `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-more-candle-periods-bottom-sheet` as const;

function renderEligibleNoPositionPerpsDetails(
  params?: Partial<Parameters<typeof renderPerpsMarketDetailsView>[0]>,
) {
  return renderPerpsMarketDetailsView({
    streamOverrides: { positions: [] },
    overrides: {
      engine: {
        backgroundState: {
          PerpsController: { isEligible: true },
        },
      },
    },
    ...params,
  });
}

beforeEach(async () => {
  await acceptSocialTerms();
});

afterEach(async () => {
  await resetSocialTermsAcceptance();
});

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
    renderEligibleNoPositionPerpsDetails();

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

  it('opens market-hours tooltip when info button is pressed for stock markets', async () => {
    renderPerpsMarketDetailsView({
      initialParams: {
        market: {
          symbol: 'AAPL',
          name: 'Apple',
          maxLeverage: '10x',
          marketType: 'stock',
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

  it('keeps a long position open above liquidation, then removes close actions after liquidation', async () => {
    const { stream } = renderPerpsMarketDetailsView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: {
              isEligible: true,
              isFirstTimeUser: { mainnet: false, testnet: false },
            },
          },
        },
      },
      initialParams: { market: createEthMarketForViews() },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [createLongPositionForViews()],
        orders: [],
        marketData: [createEthMarketForViews()],
      },
    });

    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();

    act(() => {
      stream.emitPositions([
        {
          ...createLongPositionForViews(),
          unrealizedPnl: '-100',
          returnOnEquity: '-0.12',
        },
      ]);
    });

    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();

    act(() => {
      stream.emitPositions([]);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  it('removes close actions after a stop-loss-triggered close stream update', async () => {
    const stopLossPosition: Position = {
      ...createLongPositionForViews(),
      stopLossPrice: '2300',
      stopLossCount: 1,
    };
    const { stream } = renderPerpsMarketDetailsView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: {
              isEligible: true,
              isFirstTimeUser: { mainnet: false, testnet: false },
            },
          },
        },
      },
      initialParams: { market: createEthMarketForViews() },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [stopLossPosition],
        orders: [],
        marketData: [createEthMarketForViews()],
      },
    });

    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();

    act(() => {
      stream.emitPositions([]);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  it('shows the reduced live position after a partial close stream update', async () => {
    const position = createLongPositionForViews();
    const partiallyClosedPosition: Position = {
      ...position,
      size: '0.4',
      marginUsed: '333.33',
      unrealizedPnl: '120',
      returnOnEquity: '0.36',
      positionValue: '1000',
    };
    const { stream } = renderPerpsMarketDetailsView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: {
              isEligible: true,
              isFirstTimeUser: { mainnet: false, testnet: false },
            },
          },
        },
      },
      initialParams: { market: createEthMarketForViews() },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        orders: [],
        marketData: [createEthMarketForViews()],
      },
    });

    expect(
      await screen.findByTestId(
        PerpsPositionCardSelectorsIDs.SIZE_VALUE,
        {},
        { timeout: 5000 },
      ),
    ).toHaveTextContent(/1\s+ETH/u);

    act(() => {
      stream.emitPositions([partiallyClosedPosition]);
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.SIZE_VALUE),
      ).toHaveTextContent(/0\.4\s+ETH/u);
    });
    expect(
      screen.getByTestId(PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('removes close actions after a take-profit-triggered close stream update', async () => {
    const takeProfitPosition: Position = {
      ...createLongPositionForViews(),
      takeProfitPrice: '2800',
      takeProfitCount: 1,
    };
    const { stream } = renderPerpsMarketDetailsView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: {
              isEligible: true,
              isFirstTimeUser: { mainnet: false, testnet: false },
            },
          },
        },
      },
      initialParams: { market: createEthMarketForViews() },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [takeProfitPosition],
        orders: [],
        marketData: [createEthMarketForViews()],
      },
    });

    expect(
      await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();

    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2800',
          markPrice: '2800',
          timestamp: Date.now(),
          isTradable: true,
        },
      });
      stream.emitPositions([]);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON),
      ).not.toBeOnTheScreen();
    });
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
            marketType: 'stock',
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
      renderEligibleNoPositionPerpsDetails();

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
    const cleanupCallbacks: (() => void)[] = [];

    afterEach(() => {
      while (cleanupCallbacks.length > 0) {
        cleanupCallbacks.pop()?.();
      }

      const toggleWatchlistMarket = Engine.context.PerpsController
        .toggleWatchlistMarket as jest.Mock;
      const getWatchlistMarkets = Engine.context.PerpsController
        .getWatchlistMarkets as jest.Mock;
      toggleWatchlistMarket.mockReset().mockResolvedValue(undefined);
      getWatchlistMarkets.mockReset().mockReturnValue([]);
    });

    it('renders back button and fullscreen chart button', async () => {
      renderEligibleNoPositionPerpsDetails();

      expect(
        await screen.findByTestId(PerpsMarketHeaderSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          PerpsMarketDetailsViewSelectorsIDs.FULLSCREEN_CHART_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('renders header with full asset name and market pair subtitle', async () => {
      renderEligibleNoPositionPerpsDetails();

      expect(
        await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.HEADER),
      ).toBeOnTheScreen();
      expect(screen.getByText('Ethereum')).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsMarketHeaderSelectorsIDs.SUBTITLE),
      ).toHaveTextContent('ETH-USD perp');
    });

    it('opens the market list when the header identity is pressed', async () => {
      renderPerpsMarketDetailsView({
        streamOverrides: { positions: [] },
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
        extraRoutes: [{ name: Routes.PERPS.MARKET_LIST }],
      });

      fireEvent.press(
        await screen.findByTestId(
          PerpsMarketHeaderSelectorsIDs.MARKET_LIST_BUTTON,
        ),
      );

      expect(
        await screen.findByTestId(`route-${Routes.PERPS.MARKET_LIST}`),
      ).toBeOnTheScreen();
    });

    it('toggles watchlist when the header favorite button is pressed', async () => {
      const toggleWatchlistMarket = Engine.context.PerpsController
        .toggleWatchlistMarket as jest.Mock;
      const getWatchlistMarkets = Engine.context.PerpsController
        .getWatchlistMarkets as jest.Mock;
      getWatchlistMarkets.mockReturnValue([]);

      renderEligibleNoPositionPerpsDetails();

      fireEvent.press(
        await screen.findByTestId(
          PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON,
        ),
      );

      await waitFor(() => {
        expect(toggleWatchlistMarket).toHaveBeenCalledWith('ETH');
      });
    });

    it('switches from removing to adding after the watchlist state updates', async () => {
      let watchlist = ['ETH'];
      const toggleStates: boolean[] = [];
      const persistResolvers: (() => void)[] = [];
      const persistPromises: Promise<void>[] = [];
      const toggleWatchlistMarket = Engine.context.PerpsController
        .toggleWatchlistMarket as jest.Mock;
      const getWatchlistMarkets = Engine.context.PerpsController
        .getWatchlistMarkets as jest.Mock;
      getWatchlistMarkets.mockImplementation(() => watchlist);

      const { store } = renderEligibleNoPositionPerpsDetails({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                isEligible: true,
                isTestnet: false,
                watchlistMarkets: {
                  testnet: [],
                  mainnet: ['ETH'],
                },
              },
            },
          },
        },
      });
      const stateHarness = createPerpsControllerStateHarness(store);
      cleanupCallbacks.push(stateHarness.cleanup);
      const flushStateSpy = jest
        .spyOn(EngineService, 'flushState')
        .mockImplementation(stateHarness.flush);
      cleanupCallbacks.push(() => flushStateSpy.mockRestore());

      toggleWatchlistMarket.mockImplementation((symbol: string) => {
        toggleStates.push(watchlist.includes(symbol));
        watchlist = watchlist.includes(symbol)
          ? watchlist.filter((marketSymbol) => marketSymbol !== symbol)
          : [...watchlist, symbol];

        stateHarness.stage({
          isTestnet: false,
          watchlistMarkets: {
            testnet: [],
            mainnet: watchlist,
          },
        });

        const persistPromise = new Promise<void>((resolve) => {
          persistResolvers.push(resolve);
        });
        persistPromises.push(persistPromise);
        return persistPromise;
      });

      const favoriteButton = await screen.findByTestId(
        PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON,
      );
      expect(
        screen.getByLabelText(
          strings('perps.market_details.remove_from_watchlist'),
        ),
      ).toBeOnTheScreen();

      fireEvent.press(favoriteButton);

      await waitFor(() => {
        expect(
          screen.getByLabelText(
            strings('perps.market_details.add_to_watchlist'),
          ),
        ).toBeOnTheScreen();
      });
      expect(toggleStates).toEqual([true]);

      fireEvent.press(
        screen.getByTestId(PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON),
      );

      await waitFor(() => {
        expect(toggleStates).toEqual([true, false]);
        expect(
          screen.getByLabelText(
            strings('perps.market_details.remove_from_watchlist'),
          ),
        ).toBeOnTheScreen();
      });

      await act(async () => {
        persistResolvers.forEach((resolve) => resolve());
        await Promise.all(persistPromises);
      });
    });

    it('restores the filled star after watchlist persistence reverts', async () => {
      let watchlist = ['ETH'];
      let resolvePersist: () => void = () => undefined;
      let persistPromise: Promise<void> = Promise.resolve();
      const toggleWatchlistMarket = Engine.context.PerpsController
        .toggleWatchlistMarket as jest.Mock;
      const getWatchlistMarkets = Engine.context.PerpsController
        .getWatchlistMarkets as jest.Mock;
      getWatchlistMarkets.mockImplementation(() => watchlist);

      const { store } = renderEligibleNoPositionPerpsDetails({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                isEligible: true,
                isTestnet: false,
                watchlistMarkets: {
                  testnet: [],
                  mainnet: ['ETH'],
                },
              },
            },
          },
        },
      });
      const stateHarness = createPerpsControllerStateHarness(store);
      cleanupCallbacks.push(stateHarness.cleanup);
      const flushStateSpy = jest
        .spyOn(EngineService, 'flushState')
        .mockImplementation(stateHarness.flush);
      cleanupCallbacks.push(() => flushStateSpy.mockRestore());

      toggleWatchlistMarket.mockImplementation(() => {
        watchlist = [];
        stateHarness.stage({
          isTestnet: false,
          watchlistMarkets: {
            testnet: [],
            mainnet: watchlist,
          },
        });
        persistPromise = new Promise<void>((resolve) => {
          resolvePersist = () => {
            watchlist = ['ETH'];
            stateHarness.stage({
              isTestnet: false,
              watchlistMarkets: {
                testnet: [],
                mainnet: watchlist,
              },
            });
            resolve();
          };
        });
        return persistPromise;
      });

      fireEvent.press(
        await screen.findByTestId(
          PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON,
        ),
      );

      expect(
        await screen.findByLabelText(
          strings('perps.market_details.add_to_watchlist'),
        ),
      ).toBeOnTheScreen();

      await act(async () => {
        resolvePersist();
        await persistPromise;
      });

      expect(
        await screen.findByLabelText(
          strings('perps.market_details.remove_from_watchlist'),
        ),
      ).toBeOnTheScreen();
      expect(flushStateSpy).toHaveBeenCalledTimes(2);
    });

    it('shows Lite header actions without the Pro wallet button', async () => {
      renderEligibleNoPositionPerpsDetails({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsProModeEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
        extraRoutes: [{ name: Routes.PERPS.MARKET_LIST }],
      });

      expect(
        await screen.findByTestId(PerpsMarketHeaderSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsModeToggleSelectorsIDs.LITE_SEGMENT),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON,
        ),
      ).not.toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(PerpsMarketHeaderSelectorsIDs.MARKET_LIST_BUTTON),
      );

      expect(
        await screen.findByTestId(`route-${Routes.PERPS.MARKET_LIST}`),
      ).toBeOnTheScreen();
    });

    it('renders live price, 24h change, and fullscreen button inside the market summary row', async () => {
      renderEligibleNoPositionPerpsDetails();

      const marketSummary = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.MARKET_SUMMARY,
      );

      expect(
        within(marketSummary).getByTestId(PerpsMarketHeaderSelectorsIDs.PRICE),
      ).toBeOnTheScreen();
      expect(
        within(marketSummary).getByTestId(
          PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          PerpsMarketDetailsViewSelectorsIDs.FULLSCREEN_CHART_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('renders the market summary price when the market has no maxLeverage', async () => {
      renderPerpsMarketDetailsView({
        initialParams: {
          market: {
            symbol: 'ETH',
            name: 'Ethereum',
            price: '$2,000',
            change24h: '$0',
            change24hPercent: '0%',
            volume: '$1M',
            openInterest: '$500K',
          },
        },
        streamOverrides: {
          positions: [],
          marketData: [
            {
              symbol: 'BTC',
              name: 'Bitcoin',
              maxLeverage: '50x',
              volume: '$1M',
              openInterest: '$500K',
            },
          ],
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
      const marketSummary = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.MARKET_SUMMARY,
      );
      expect(
        within(marketSummary).getByTestId(PerpsMarketHeaderSelectorsIDs.PRICE),
      ).toBeOnTheScreen();
      expect(
        within(marketSummary).getByTestId(
          PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE,
        ),
      ).toBeOnTheScreen();
    });

    it('opens fullscreen chart modal and close button is pressable', async () => {
      renderEligibleNoPositionPerpsDetails();

      const fullscreenButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.FULLSCREEN_CHART_BUTTON,
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

      const period1hButton = await screen.findByTestId(
        getPerpsCandlePeriodSelector.periodButton(CANDLE_SELECTOR_BASE, '1h'),
      );
      expect(period1hButton).toBeOnTheScreen();

      fireEvent.press(period1hButton);

      expect(
        store.getState().settings.perpsChartPreferences.preferredCandlePeriod,
      ).toBe('1h');
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
    const indexedEthLong = {
      positionId: 'social-eth-long',
      tokenSymbol: 'ETH',
      tokenName: 'Ethereum',
      tokenAddress: 'ETH',
      chain: 'hyperliquid',
      positionAmount: 2.5,
      isOpen: true,
      boughtUsd: 5000,
      soldUsd: 0,
      realizedPnl: 0,
      costBasis: 500,
      trades: [],
      lastTradeAt: 1_700_000_000,
      currentValueUSD: 5100,
      pnlValueUsd: 100,
      pnlPercent: 20,
      perpPositionType: 'long' as const,
      perpLeverage: 10,
      positionAmountWithLeverage: 2.5,
    };

    const canPostOverrides: DeepPartial<RootState> = {
      engine: {
        backgroundState: {
          PerpsController: { isEligible: true },
          KeyringController: { isUnlocked: true },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsSocialEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              [SOCIAL_V1_AB_KEY]: SocialV1Variant.Treatment,
              aiSocialLeaderboardEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
            },
          },
          ProfileController: {
            profile: {
              profileId: 'profile-1',
              username: 'trader',
              displayName: 'trader',
              bio: '',
              linkedAddresses: [
                'eip155:1:0x0000000000000000000000000000000000000001',
              ],
              avatarUrl: '',
              tradingPrivacy: 'public',
              connectedToX: false,
              createdAt: '',
              updatedAt: '',
            },
          },
        },
      },
    };

    afterEach(() => {
      clearLeaderboardApiMock();
    });

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

    it('opens the Share position sheet from the position card when the user can post to Social', async () => {
      setupLeaderboardApiMock({ openPositions: [indexedEthLong] });
      renderPerpsMarketDetailsView({
        overrides: canPostOverrides,
        extraRoutes: [{ name: Routes.PERPS.MODALS.ROOT }],
      });

      await screen.findByTestId(PerpsPositionCardSelectorsIDs.SHARE_BUTTON);
      await waitFor(() =>
        expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
          'SocialService:fetchOpenPositions',
          expect.anything(),
        ),
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.SHARE_BUTTON),
      );

      expect(
        await screen.findByTestId(
          getRouteProbeTestId(Routes.PERPS.MODALS.ROOT),
        ),
      ).toBeOnTheScreen();
    });

    it('hides Post to feed and opens the PnL hero card when the position is not indexed', async () => {
      setupLeaderboardApiMock({ openPositions: [] });
      renderPerpsMarketDetailsView({
        overrides: canPostOverrides,
        extraRoutes: [{ name: Routes.PERPS.PNL_HERO_CARD }],
      });

      await screen.findByTestId(PerpsPositionCardSelectorsIDs.SHARE_BUTTON);
      await waitFor(() =>
        expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
          'SocialService:fetchOpenPositions',
          expect.anything(),
        ),
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.SHARE_BUTTON),
      );

      expect(
        screen.queryByTestId(PerpsPositionCardSelectorsIDs.POST_TO_FEED_BUTTON),
      ).toBeNull();
      expect(
        await screen.findByTestId(
          getRouteProbeTestId(Routes.PERPS.PNL_HERO_CARD),
        ),
      ).toBeOnTheScreen();
    });

    it('opens the composer from Post to feed and tracks the Post to MetaMask interaction', async () => {
      setupLeaderboardApiMock({ openPositions: [indexedEthLong] });
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      try {
        renderPerpsMarketDetailsView({
          overrides: canPostOverrides,
          extraRoutes: [{ name: Routes.SOCIAL.POST_COMPOSER }],
        });

        fireEvent.press(
          await screen.findByTestId(
            PerpsPositionCardSelectorsIDs.POST_TO_FEED_BUTTON,
          ),
        );

        expect(
          await screen.findByTestId(
            getRouteProbeTestId(Routes.SOCIAL.POST_COMPOSER),
          ),
        ).toBeOnTheScreen();
        expect(trackEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.PERPS_UI_INTERACTION.category,
            properties: expect.objectContaining({
              interaction_type:
                PERPS_SHARE_POSITION_INTERACTION_TYPE.POST_TO_METAMASK,
              asset: 'ETH',
              direction: 'long',
            }),
          }),
        );
      } finally {
        trackEventSpy.mockRestore();
      }
    });

    it('does not load the Social profile on open when the user cannot post', async () => {
      const getSessionProfile = jest.mocked(
        Engine.context.AuthenticationController.getSessionProfile,
      );
      const fetchAndUpdateProfile = jest.mocked(
        Engine.context.ProfileController.fetchAndUpdateProfile,
      );
      const signedOutSessionProfile = getSessionProfile.getMockImplementation();
      getSessionProfile.mockResolvedValue({
        profileId: 'session-profile-id',
      } as Awaited<ReturnType<typeof getSessionProfile>>);
      fetchAndUpdateProfile.mockClear();
      try {
        renderPerpsMarketDetailsView({
          overrides: {
            engine: {
              backgroundState: {
                PerpsController: { isEligible: true },
              },
            },
          },
        });

        await screen.findByTestId(PerpsPositionCardSelectorsIDs.SHARE_BUTTON);
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(fetchAndUpdateProfile).not.toHaveBeenCalled();
      } finally {
        getSessionProfile.mockImplementation(signedOutSessionProfile);
      }
    });

    it('opens the PnL hero card from the position card when the user cannot post to Social', async () => {
      renderPerpsMarketDetailsView({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
        },
        extraRoutes: [{ name: Routes.PERPS.PNL_HERO_CARD }],
      });

      fireEvent.press(
        await screen.findByTestId(PerpsPositionCardSelectorsIDs.SHARE_BUTTON),
      );

      expect(
        await screen.findByTestId(
          getRouteProbeTestId(Routes.PERPS.PNL_HERO_CARD),
        ),
      ).toBeOnTheScreen();
    });

    it('explains the post-only network-upgrade window when a TP/SL update is rejected', async () => {
      const updatePositionTPSL = jest.mocked(
        Engine.context.PerpsController.updatePositionTPSL,
      );
      updatePositionTPSL.mockResolvedValueOnce({
        success: false,
        error:
          'order 0: Only post-only orders allowed immediately after network upgrade',
      });
      const position = createLongPositionForViews();
      const { stream } = renderPerpsMarketDetailsView({
        includeToasts: true,
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                isEligible: true,
                isFirstTimeUser: { mainnet: false, testnet: false },
              },
            },
          },
        },
        initialParams: { market: createEthMarketForViews() },
        streamOverrides: {
          account: createFundedAccountForViews('10000'),
          positions: [position],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
        extraRoutes: [
          {
            name: Routes.PERPS.TPSL,
            Component: PerpsTPSLView as unknown as ComponentType<unknown>,
          },
        ],
      });
      act(() => {
        stream.emitPrices({
          ETH: {
            symbol: 'ETH',
            price: '2500',
            markPrice: '2500',
            timestamp: Date.now(),
            isTradable: true,
          },
        });
      });

      fireEvent.press(
        within(
          await screen.findByTestId(PerpsPositionCardSelectorsIDs.CARD),
        ).getByText(strings('perps.auto_close.set_button')),
      );
      fireEvent.changeText(
        await screen.findByTestId(
          PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
        ),
        '2300',
      );
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
        );
      });

      expect(
        await screen.findByText(
          strings('perps.errors.postOnlyWindow'),
          {},
          { timeout: 5000 },
        ),
      ).toBeOnTheScreen();
      expect(updatePositionTPSL).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'ETH', stopLossPrice: '2300' }),
      );
      expect(
        screen.getByText(strings('perps.position.tpsl.update_failed')),
      ).toBeOnTheScreen();
      expect(
        screen.queryAllByText(/only post-only orders allowed/i),
      ).toHaveLength(0);
      expect(screen.queryAllByText(/\[missing/iu)).toHaveLength(0);
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
      report = MOCK_PERPS_MARKET_INSIGHTS_REPORT,
    }: {
      hasPosition: boolean;
      insightsFlagEnabled?: boolean;
      report?: typeof MOCK_PERPS_MARKET_INSIGHTS_REPORT | null;
    }) => {
      setupPerpsMarketInsightsEngineMock(report);
      renderPerpsMarketDetailsView({
        streamOverrides: {
          positions: hasPosition ? [OPEN_POSITION_STREAM_ITEM] : [],
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
            mount: 'root',
          },
          { name: Routes.BRIDGE.ROOT, mount: 'root' },
          { name: Routes.RAMP.TOKEN_SELECTION, mount: 'root' },
        ],
      });
    };

    // The entry card replaces a skeleton only after the AiDigestController fetch
    // resolves, so it needs the same explicit timeout AssetOverviewContent's CV
    // test uses for this card. The 1s default is not enough on a loaded CV shard.
    const findInsightsEntryCard = () =>
      screen.findByTestId(
        MarketInsightsSelectorsIDs.ENTRY_CARD,
        {},
        { timeout: 15000 },
      );

    const openInsightsFromEntryCard = async () => {
      fireEvent.press(await findInsightsEntryCard());
    };

    it('opens market insights from Perps and hides Long/Short when position is open', async () => {
      renderPerpsInsightsJourney({ hasPosition: true });

      await openInsightsFromEntryCard();

      expect(
        await screen.findByTestId(MarketInsightsSelectorsIDs.VIEW_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText(
          'Ethereum shows strong momentum amid institutional demand',
        ),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText(MOCK_PERPS_MARKET_INSIGHTS_REPORT.summary),
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

      await openInsightsFromEntryCard();

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

      // Assert the absence only once the view is mounted and no skeleton is
      // pending, otherwise the expectation passes before insights could render.
      expect(
        await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      await waitFor(
        () => {
          expect(
            screen.queryByTestId(
              MarketInsightsSelectorsIDs.ENTRY_CARD_SKELETON,
            ),
          ).toBeNull();
        },
        { timeout: 15000 },
      );
      expect(
        screen.queryByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD),
      ).toBeNull();
    });

    it('shows sources bottom sheet when tapping a trend item from Perps insights', async () => {
      renderPerpsInsightsJourney({ hasPosition: true });

      await openInsightsFromEntryCard();

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
      try {
        renderPerpsInsightsJourney({ hasPosition: true });

        await openInsightsFromEntryCard();
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

    it('shows feedback bottom sheet on thumbs down from Perps insights', async () => {
      renderPerpsInsightsJourney({ hasPosition: true });

      await openInsightsFromEntryCard();
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

  describe('About section', () => {
    const aboutDescription =
      'Ethereum is a decentralized smart contract platform. It powers DeFi, NFTs, and a large ecosystem of applications secured by proof of stake.';

    it('shows About with Read more when the market has a description, then expands on press', async () => {
      renderEligibleNoPositionPerpsDetails({
        initialParams: {
          market: createEthMarketForViews({
            description: aboutDescription,
          }),
        },
        streamOverrides: {
          positions: [],
          marketData: [
            createEthMarketForViews({ description: aboutDescription }),
          ],
        },
      });

      expect(
        await screen.findByTestId(
          PerpsMarketDetailsViewSelectorsIDs.ABOUT_SECTION,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          strings('perps.market.about_asset', { assetName: 'Ethereum' }),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION,
        ),
      ).toHaveTextContent(aboutDescription);

      // Measure text reports more than 3 lines → Read more becomes available.
      fireEvent(
        screen.getByTestId(
          `${PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION}-measure`,
        ),
        'textLayout',
        {
          nativeEvent: {
            lines: [
              { text: 'line 1' },
              { text: 'line 2' },
              { text: 'line 3' },
              { text: 'line 4' },
            ],
          },
        },
      );

      const readMore = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.ABOUT_READ_MORE,
      );
      fireEvent.press(readMore);

      await waitFor(() => {
        expect(
          screen.queryByTestId(
            PerpsMarketDetailsViewSelectorsIDs.ABOUT_READ_MORE,
          ),
        ).not.toBeOnTheScreen();
      });
      expect(
        screen.getByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION)
          .props.numberOfLines,
      ).toBeUndefined();
    });

    it('does not show About when the market has no description', async () => {
      renderEligibleNoPositionPerpsDetails({
        initialParams: {
          market: createEthMarketForViews(),
        },
        streamOverrides: {
          positions: [],
          marketData: [createEthMarketForViews()],
        },
      });

      expect(
        await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();

      expect(
        screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_SECTION),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Social tabs', () => {
    const socialOverrides = {
      engine: {
        backgroundState: {
          PerpsController: { isEligible: true },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              aiSocialLeaderboardEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              aiSocialLeaderboardPerpsEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      },
    };
    const ethPost = mockPerpFeedItem({ positionId: 'eth-perp-post' });
    const ethPostTestId = `${SocialFeedPostShellSelectorsIDs.CONTAINER}-${ethPost.positionId}-${ethPost.timestamp}`;
    const statsSectionTestId = 'perps-home-section-stats';
    const postTestId = (post: typeof ethPost) =>
      `${SocialFeedPostShellSelectorsIDs.CONTAINER}-${post.positionId}-${post.timestamp}`;

    afterEach(() => {
      clearLeaderboardApiMock();
    });

    it('shows Overview by default with the position above the tab bar', async () => {
      setupLeaderboardApiMock({ feedItems: [ethPost] });

      renderPerpsMarketDetailsView({
        overrides: socialOverrides,
        socialEnabled: true,
      });

      expect(
        await screen.findByTestId(
          PerpsMarketDetailsViewSelectorsIDs.SOCIAL_TABS,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByTestId(statsSectionTestId)).toBeOnTheScreen();
      const orderedIds = screen.UNSAFE_root.findAll(
        (node) =>
          node.props.testID === PerpsPositionCardSelectorsIDs.CARD ||
          node.props.testID === PerpsMarketDetailsViewSelectorsIDs.SOCIAL_TABS,
      ).map((node) => node.props.testID);
      expect(
        orderedIds.indexOf(PerpsPositionCardSelectorsIDs.CARD),
      ).toBeLessThan(
        orderedIds.indexOf(PerpsMarketDetailsViewSelectorsIDs.SOCIAL_TABS),
      );
      expect(screen.queryByTestId(ethPostTestId)).not.toBeOnTheScreen();
      expect(
        screen.queryByText(strings('perps.position.card.details_title')),
      ).not.toBeOnTheScreen();
    });

    it('orders the tabs Overview, Holders, Feed', async () => {
      setupLeaderboardApiMock();
      const tabIds = (['overview', 'top_traders', 'feed'] as const).map(
        getPerpsMarketDetailsTabSelector,
      );

      renderPerpsMarketDetailsView({
        overrides: socialOverrides,
        socialEnabled: true,
      });

      expect(
        await screen.findByTestId(
          PerpsMarketDetailsViewSelectorsIDs.SOCIAL_TABS,
        ),
      ).toBeOnTheScreen();
      const orderedIds = screen.UNSAFE_root.findAll((node) =>
        tabIds.includes(node.props.testID),
      ).map((node) => node.props.testID);
      expect([...new Set(orderedIds)]).toEqual(tabIds);
    });

    it('shows Market insights first in Overview, below the tab bar', async () => {
      setupPerpsMarketInsightsEngineMock(MOCK_PERPS_MARKET_INSIGHTS_REPORT);
      setupLeaderboardApiMock({ feedItems: [ethPost] });

      renderPerpsMarketDetailsView({
        overrides: {
          engine: {
            backgroundState: {
              ...socialOverrides.engine.backgroundState,
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  ...socialOverrides.engine.backgroundState
                    .RemoteFeatureFlagController.remoteFeatureFlags,
                  aiSocialMarketInsightsPerpsEnabled: {
                    enabled: true,
                    featureVersion: '1',
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
        socialEnabled: true,
      });

      expect(
        await screen.findByTestId(
          MarketInsightsSelectorsIDs.ENTRY_CARD,
          {},
          { timeout: 15000 },
        ),
      ).toBeOnTheScreen();
      const orderedIds = screen.UNSAFE_root.findAll(
        (node) =>
          node.props.testID ===
            PerpsMarketDetailsViewSelectorsIDs.SOCIAL_TABS ||
          node.props.testID === MarketInsightsSelectorsIDs.ENTRY_CARD ||
          node.props.testID === statsSectionTestId,
      ).map((node) => node.props.testID);
      expect([...new Set(orderedIds)]).toEqual([
        PerpsMarketDetailsViewSelectorsIDs.SOCIAL_TABS,
        MarketInsightsSelectorsIDs.ENTRY_CARD,
        statsSectionTestId,
      ]);

      fireEvent.press(
        screen.getByTestId(getPerpsMarketDetailsTabSelector('feed')),
      );

      expect(
        screen.queryByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD),
      ).not.toBeOnTheScreen();
    });

    it('does not offer Live trades, so no fixture trades reach the market page', async () => {
      setupLeaderboardApiMock({ feedItems: [ethPost] });

      renderPerpsMarketDetailsView({
        overrides: socialOverrides,
        socialEnabled: true,
      });

      expect(
        await screen.findByTestId(
          getPerpsMarketDetailsTabSelector('top_traders'),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(getPerpsMarketDetailsTabSelector('live_trades')),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(LiveViewSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('keeps About inside Overview when the market has a description', async () => {
      const description =
        'Ethereum is a decentralized smart contract platform.';
      setupLeaderboardApiMock({ feedItems: [ethPost] });

      renderPerpsMarketDetailsView({
        overrides: socialOverrides,
        socialEnabled: true,
        initialParams: {
          market: createEthMarketForViews({ description }),
        },
        streamOverrides: {
          positions: [],
          marketData: [createEthMarketForViews({ description })],
        },
      });

      expect(
        await screen.findByTestId(
          PerpsMarketDetailsViewSelectorsIDs.ABOUT_SECTION,
        ),
      ).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(getPerpsMarketDetailsTabSelector('feed')),
      );

      expect(
        screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.ABOUT_SECTION),
      ).not.toBeOnTheScreen();
    });

    it('shows this market feed on Feed, hides Overview, and keeps the position', async () => {
      const messengerSpy = setupLeaderboardApiMock({ feedItems: [ethPost] });
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      try {
        renderPerpsMarketDetailsView({
          overrides: socialOverrides,
          socialEnabled: true,
        });

        fireEvent.press(
          await screen.findByTestId(getPerpsMarketDetailsTabSelector('feed')),
        );

        expect(await screen.findByTestId(ethPostTestId)).toBeOnTheScreen();
        expect(screen.queryByTestId(statsSectionTestId)).not.toBeOnTheScreen();
        expect(
          screen.getByTestId(PerpsPositionCardSelectorsIDs.CARD),
        ).toBeOnTheScreen();
        expect(messengerSpy).toHaveBeenCalledWith(
          'SocialService:fetchFeed',
          expect.objectContaining({
            scope: 'all',
            chains: ['eip155:999'],
            assetIds: ['eip155:999/perp:ETH'],
          }),
        );
        expect(trackEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.PERPS_UI_INTERACTION.category,
            properties: expect.objectContaining({
              interaction_type: 'tap',
              screen_name: 'perps_market_details',
              tab_name: 'feed',
              asset: 'ETH',
            }),
          }),
        );
      } finally {
        trackEventSpy.mockRestore();
      }
    });

    it('keeps the current layout with no tab bar when Perps social is off', async () => {
      setupLeaderboardApiMock({ feedItems: [ethPost] });

      renderPerpsMarketDetailsView({
        overrides: socialOverrides,
        socialEnabled: false,
      });

      expect(await screen.findByTestId(statsSectionTestId)).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CARD),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.card.details_title')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsMarketDetailsViewSelectorsIDs.SOCIAL_TABS),
      ).not.toBeOnTheScreen();
    });

    it('lists every loaded post on Feed with no See more', async () => {
      const posts = Array.from({ length: 6 }, (_, index) =>
        mockPerpFeedItem({
          positionId: `eth-perp-post-${index}`,
          timestamp: 1_700_000_500 - index,
          lastTradeAt: 1_700_000_500 - index,
        }),
      );
      setupLeaderboardApiMock({ feedItems: posts });

      renderPerpsMarketDetailsView({
        overrides: socialOverrides,
        socialEnabled: true,
      });

      fireEvent.press(
        await screen.findByTestId(getPerpsMarketDetailsTabSelector('feed')),
      );

      for (const post of posts) {
        expect(await screen.findByTestId(postTestId(post))).toBeOnTheScreen();
      }
      expect(
        screen.queryByText(strings('perps.home.see_more')),
      ).not.toBeOnTheScreen();
    });

    it('shows the Social leaderboard for this market on Holders with no See more, unavailable until Social ranks per market', async () => {
      const messengerSpy = setupLeaderboardApiMock();

      renderPerpsMarketDetailsView({
        overrides: socialOverrides,
        socialEnabled: true,
      });

      fireEvent.press(
        await screen.findByTestId(
          getPerpsMarketDetailsTabSelector('top_traders'),
        ),
      );

      expect(
        await screen.findByTestId(SocialLeaderboardSelectorsIDs.UNAVAILABLE),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('social_leaderboard.feed.no_data')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(getTraderRowTestId(mockPerpsTraders[0].profileId)),
      ).not.toBeOnTheScreen();
      expect(messengerSpy).not.toHaveBeenCalledWith(
        'SocialService:fetchLeaderboard',
        expect.anything(),
      );
      expect(
        screen.queryByText(strings('perps.home.see_more')),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Chart loading', () => {
    const DETAIL_SKELETON_ID = `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-chart-skeleton`;
    const TRADINGVIEW_CHART_ID = `${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`;
    const ethCandles: CandleData = {
      symbol: 'ETH',
      interval: CandlePeriod.FifteenMinutes,
      candles: [
        {
          time: Date.now(),
          open: '2737.9',
          high: '2737.9',
          low: '2737.9',
          close: '2737.9',
          volume: '1',
        },
      ],
    };

    it('shows the candle skeleton while candle data is missing', async () => {
      renderEligibleNoPositionPerpsDetails();

      expect(await screen.findByTestId(DETAIL_SKELETON_ID)).toBeOnTheScreen();
      expect(
        screen.getByTestId(`${DETAIL_SKELETON_ID}-candle-0`),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(TRADINGVIEW_CHART_ID)).not.toBeOnTheScreen();
    });

    it('swaps the candle skeleton for the chart once the chart is ready', async () => {
      renderEligibleNoPositionPerpsDetails({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: { isEligible: true },
            },
          },
          settings: {
            perpsChartPreferences: {
              preferredCandlePeriod: CandlePeriod.FifteenMinutes,
            },
          },
        },
        streamOverrides: { positions: [], liveCandles: ethCandles },
      });

      expect(
        await screen.findByTestId(`${TRADINGVIEW_CHART_ID}-skeleton`),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(DETAIL_SKELETON_ID)).not.toBeOnTheScreen();

      act(() => {
        screen.getByTestId(`${TRADINGVIEW_CHART_ID}-webview`).props.onMessage({
          nativeEvent: { data: JSON.stringify({ type: 'CHART_READY' }) },
        });
      });

      await waitFor(() =>
        expect(
          screen.queryByTestId(`${TRADINGVIEW_CHART_ID}-skeleton`),
        ).not.toBeOnTheScreen(),
      );
      expect(
        screen.getByTestId(`${TRADINGVIEW_CHART_ID}-webview`),
      ).toBeOnTheScreen();
    });
  });
});

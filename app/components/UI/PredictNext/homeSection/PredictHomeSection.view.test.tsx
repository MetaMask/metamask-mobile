import '../../../../../tests/component-view/mocks';
import React, { Profiler, createRef } from 'react';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../../../../../tests/component-view/render';
import { initialStatePredict } from '../../../../../tests/component-view/presets/predict';
import {
  composePredictNextPortfolioTrading,
  configurePredictNextFeeds,
  makePredictNextPlayerPropsEvent,
  makePredictNextPosition,
  makePredictNextThresholdEntry,
  makePredictNextSellPreview,
  makePredictNextSellReceipt,
  makePredictNextSummary,
  messengerCall,
  routePredictPortfolioServicesTo,
} from '../../../../../tests/component-view/fixtures/predictNext';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import type { RootState } from '../../../../reducers';
import type { SectionRefreshHandle } from '../../../Views/Homepage/types';
import { usePredictSlice } from '../../../Views/Homepage/BalanceBreakdown/hooks/slices/usePredictSlice';
import {
  PredictPositionStatus,
  type PredictPosition as LegacyPredictPosition,
} from '../../Predict/types';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import type { PredictConfig } from '../config/predictConfig';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';
import { PredictNextRoutes } from '../navigation/routes';
import {
  usePredictPortfolioValue,
  type PredictPortfolioValue,
} from '../portfolio';
import type {
  PredictEntityId,
  PredictOutcomeSide,
  PredictVenueId,
} from '../types';
import { PredictHomeSectionTestIds } from './PredictHomeSection.testIds';
import { PredictHomeSection } from '.';

const POSITION: LegacyPredictPosition = {
  amount: 10,
  avgPrice: 1,
  cashPnl: 4,
  claimable: false,
  currentValue: 24,
  endDate: '2026-12-01T00:00:00Z',
  icon: 'https://example.com/icon.png',
  id: 'france',
  initialValue: 20,
  marketId: 'market-france',
  outcome: 'Yes',
  outcomeId: 'outcome-france',
  outcomeIndex: 0,
  outcomeTokenId: 'token-france',
  percentPnl: 20,
  price: 1,
  providerId: 'polymarket',
  size: 10,
  status: PredictPositionStatus.OPEN,
  title: 'Will France win the 2026 FIFA World Cup?',
};

const LEGACY_LANE: PredictConfig = {
  enabled: false,
  venues: {
    polymarket: { enabled: false },
    kalshi: { enabled: false },
  },
  venueSelection: { enabled: false },
};

const rollout = (venues: {
  polymarket: boolean;
  kalshi: boolean;
}): PredictConfig => ({
  enabled: true,
  venues: {
    polymarket: { enabled: venues.polymarket },
    kalshi: { enabled: venues.kalshi },
  },
  venueSelection: { enabled: venues.polymarket && venues.kalshi },
});

const KALSHI_ONLY = rollout({ polymarket: false, kalshi: true });

/** A user-currency rate, so the slice proves the conversion is applied once. */
const USD_TO_USER_CURRENCY = 0.5;
const toUserCurrency = (usd: number) => usd * USD_TO_USER_CURRENCY;

/** Every value the BalanceBreakdown inputs took, with the Venue the store
 * named when they were rendered. Render-phase records over-report, which
 * only makes the "never" assertions stricter. */
let renderedTotals: {
  venue: string | null;
  value: PredictPortfolioValue;
}[] = [];

const selectPreference = (state: RootState) =>
  state.engine.backgroundState.PredictVenueController
    ?.venueSelectionPreference ?? null;

/** What BalanceBreakdown consumes: the public value and the Predict slice. */
const TotalProbe = () => {
  const value = usePredictPortfolioValue();
  const slice = usePredictSlice(toUserCurrency);
  const venue = useSelector(selectPreference);
  renderedTotals.push({ venue, value });
  return (
    <>
      <Text testID="total-value">{JSON.stringify(value)}</Text>
      <Text testID="total-slice">
        {JSON.stringify({ status: slice.status, valueFiat: slice.valueFiat })}
      </Text>
    </>
  );
};

const sectionRef = createRef<SectionRefreshHandle>();

/** Committed frames whose tree showed Polymarket holdings while the store
 * already named Kalshi as the Active Venue. */
let inactiveVenueFrames = 0;
let committedFrames = 0;
let readTree:
  | (() => { venue: string | null; polymarketRows: boolean })
  | undefined;

const onCommit = () => {
  committedFrames += 1;
  const frame = readTree?.();
  if (frame?.venue === 'kalshi' && frame.polymarketRows) {
    inactiveVenueFrames += 1;
  }
};

const HomeProbe = () => (
  <Profiler id="predict-home" onRender={onCommit}>
    <TotalProbe />
    <PredictHomeSection
      ref={sectionRef}
      sectionIndex={0}
      totalSectionsLoaded={1}
    />
  </Profiler>
);

const stateFor = ({
  predictConfig,
  venueSelectionPreference = null,
  privacyMode = false,
}: {
  predictConfig: PredictConfig;
  venueSelectionPreference?: PredictVenueControllerState['venueSelectionPreference'];
  privacyMode?: boolean;
}) =>
  initialStatePredict()
    .withRemoteFeatureFlags({ predictConfig })
    .withPreferences({ privacyMode })
    .withOverrides({
      engine: {
        backgroundState: {
          PredictVenueController: {
            venueSelectionPreference,
            lastActiveVenue: null,
            sessionDefault: null,
          },
        },
      },
    })
    .build();

const renderSection = (options: Parameters<typeof stateFor>[0]) => {
  const view = renderComponentViewScreen(
    HomeProbe,
    { name: 'PredictHomeSectionProbe' },
    { state: stateFor(options) },
  );
  readTree = () => ({
    venue: selectPreference(view.store.getState() as RootState),
    polymarketRows: view.queryByText(POSITION.title) !== null,
  });
  return view;
};

type View = ReturnType<typeof renderSection>;

const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;
const getLegacyPositions = Engine.context.PredictController
  .getPositions as jest.Mock;

/** Publishes a new Venue Selection Preference to Redux, as the Engine does. */
const selectVenue = (view: View, venue: 'polymarket' | 'kalshi') => {
  act(() => {
    engine.state = {
      ...engine.state,
      PredictVenueController: {
        ...view.store.getState().engine.backgroundState.PredictVenueController,
        venueSelectionPreference: venue,
      },
    };
    view.store.dispatch(updateBgState({ key: 'PredictVenueController' }));
  });
};

const readJson = (view: View, testID: string) =>
  JSON.parse(String(view.getByTestId(testID).props.children));

const totalOf = (view: View) => readJson(view, 'total-value');
const sliceOf = (view: View) => readJson(view, 'total-slice');

const portfolioReads = () =>
  messengerCall.mock.calls
    .map(([action]) => action as string)
    .filter((action) => action.startsWith('PredictPortfolioService:get'));

const celticsPosition = (overrides: Record<string, unknown> = {}) =>
  makePredictNextPosition({
    marketId: 'KXNBAGAME-26MAY12-LALBOS-BOS' as PredictEntityId,
    side: 'no' as PredictOutcomeSide,
    shares: '20.00',
    costBasis: '12.00',
    currentValue: '10.40',
    unrealizedPnl: '-1.60',
    unrealizedPnlPercent: '-13.33',
    context: {
      eventId: 'KXNBAGAME-26MAY12-LALBOS' as PredictEntityId,
      eventTitle: 'Celtics to win',
      marketQuestion: 'Will the Celtics win?',
      outcomeLabel: 'Celtics',
    },
    ...overrides,
  });

describe('PredictHomeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    renderedTotals = [];
    inactiveVenueFrames = 0;
    committedFrames = 0;
    getLegacyPositions.mockResolvedValue([POSITION]);
    configurePredictNextFeeds({
      positions: [makePredictNextPosition(), celticsPosition()],
    });
  });

  afterEach(() => {
    engine.state = originalEngineState;
    readTree = undefined;
    onlineManager.setOnline(true);
    jest.restoreAllMocks();
  });

  describe('legacy implementation', () => {
    it.each([
      ['the legacy lane', LEGACY_LANE],
      [
        'a Polymarket-only rollout',
        rollout({ polymarket: true, kalshi: false }),
      ],
    ])(
      'renders the Polymarket section and its positions on %s',
      async (_, predictConfig) => {
        const view = renderSection({ predictConfig });

        expect(await view.findByText(POSITION.title)).toBeOnTheScreen();
        expect(view.getByText('Predictions')).toBeOnTheScreen();
        expect(getLegacyPositions).toHaveBeenCalled();
        expect(portfolioReads()).toEqual([]);
      },
    );
  });

  describe('Kalshi', () => {
    it('renders the open Positions and the Summary PnL, and totals the Summary exactly', async () => {
      // Two open Positions are the top by value; settled holdings outside
      // the open read carry the rest of positionsValue. A page sum (55.40),
      // the rows plus the balance (175.90), or any total that drops the
      // claimable part (432.90) would all be wrong.
      configurePredictNextFeeds({
        positions: [makePredictNextPosition(), celticsPosition()],
        summary: makePredictNextSummary({
          availableBalance: '120.50',
          positionsValue: '312.40',
          claimableValue: '7.10',
          totalValue: '440.00',
          unrealizedPnl: '2.15',
          unrealizedPnlPercent: '4.06',
        }),
      });

      const view = renderSection({ predictConfig: KALSHI_ONLY });

      expect(await view.findByText('Lakers vs Celtics')).toBeOnTheScreen();
      expect(view.getByText('Predictions')).toBeOnTheScreen();
      expect(
        view.getByText('$41.25 on Lakers to win $75.00'),
      ).toBeOnTheScreen();
      expect(
        view.getByText('$12.00 on Celtics to win $20.00'),
      ).toBeOnTheScreen();
      const values = view.getAllByTestId(
        PredictHomeSectionTestIds.POSITION_ROW_VALUE,
      );
      expect(values.map((node) => node.props.children)).toEqual([
        '$45.00',
        '$10.40',
      ]);
      const pnls = view.getAllByTestId(
        PredictHomeSectionTestIds.POSITION_ROW_PNL,
      );
      expect(pnls.map((node) => node.props.children)).toEqual([
        '+9.09%',
        '-13.33%',
      ]);
      expect(
        await view.findByTestId(
          `${PredictHomeSectionTestIds.UNREALIZED_PNL}-value`,
        ),
      ).toHaveTextContent('+$2.15 (+4.06%)');
      expect(
        view.getByTestId(`${PredictHomeSectionTestIds.UNREALIZED_PNL}-label`),
      ).toHaveTextContent('Unrealized P&L');

      await waitFor(() =>
        expect(totalOf(view)).toEqual({ status: 'ready', valueUsd: 440 }),
      );
      expect(sliceOf(view)).toEqual({ status: 'ready', valueFiat: 220 });
    });

    it('names threshold Positions by their line, so two Players in one Game read differently', async () => {
      const event = makePredictNextPlayerPropsEvent();
      configurePredictNextFeeds({
        positions: [
          makePredictNextPosition(
            makePredictNextThresholdEntry(
              event,
              'Rhamondre Stevenson',
              60,
              'yes',
            ),
          ),
          makePredictNextPosition({
            ...makePredictNextThresholdEntry(
              event,
              'Kenneth Walker',
              50,
              'yes',
            ),
            costBasis: undefined,
            unrealizedPnl: undefined,
            unrealizedPnlPercent: undefined,
          }),
        ],
      });

      const view = renderSection({ predictConfig: KALSHI_ONLY });

      expect(
        await view.findByText(
          '$41.25 on Yes · Rhamondre Stevenson · 60+ to win $75.00',
        ),
      ).toBeOnTheScreen();
      expect(
        view.getByText('Yes · Kenneth Walker · 50+ · 75 shares'),
      ).toBeOnTheScreen();
      expect(
        view.getByLabelText(`${event.title} - Yes · Rhamondre Stevenson · 60+`),
      ).toBeOnTheScreen();
    });

    it('subscribes to the Summary once and the top open Positions by value, and nothing else', async () => {
      const view = renderSection({ predictConfig: KALSHI_ONLY });
      await view.findByText('Lakers vs Celtics');
      await waitFor(() => expect(totalOf(view).status).toBe('ready'));

      expect(messengerCall).toHaveBeenCalledWith(
        'PredictPortfolioService:getPositions',
        KALSHI_VENUE_ID,
        { status: ['open'], sort: 'value', limit: 5 },
      );
      // The section's PnL row and BalanceBreakdown share one Summary entry.
      expect(portfolioReads().sort()).toEqual([
        'PredictPortfolioService:getPortfolioSummary',
        'PredictPortfolioService:getPositions',
      ]);
      expect(getLegacyPositions).not.toHaveBeenCalled();
    });

    it('offers no claim, Cash Out or other trading action on the rows', async () => {
      const view = renderSection({ predictConfig: KALSHI_ONLY });
      await view.findByText('Lakers vs Celtics');

      expect(view.queryByText(/claim/i)).not.toBeOnTheScreen();
      expect(view.queryByText('Cash Out')).not.toBeOnTheScreen();
    });

    it('includes a partial Summary in the total and shows an unpriced Position as having no price', async () => {
      configurePredictNextFeeds({
        positions: [
          makePredictNextPosition(),
          celticsPosition({
            currentValue: undefined,
            unrealizedPnl: undefined,
            unrealizedPnlPercent: undefined,
          }),
        ],
        summary: makePredictNextSummary({ complete: false }),
      });

      const view = renderSection({ predictConfig: KALSHI_ONLY });

      expect(
        await view.findByTestId(
          PredictHomeSectionTestIds.POSITION_ROW_VALUE_UNAVAILABLE,
        ),
      ).toHaveTextContent('No price');
      expect(view.queryByText('$0.00')).not.toBeOnTheScreen();
      expect(
        view.getAllByTestId(PredictHomeSectionTestIds.POSITION_ROW_PNL),
      ).toHaveLength(1);
      await waitFor(() =>
        expect(totalOf(view)).toEqual({ status: 'ready', valueUsd: 168.13 }),
      );
    });

    it('shows a missing Summary as unavailable, never as zero', async () => {
      configurePredictNextFeeds({
        positions: [makePredictNextPosition()],
        summary: new Error('Summary unavailable'),
      });

      const view = renderSection({ predictConfig: KALSHI_ONLY });

      expect(
        await view.findByTestId(
          `${PredictHomeSectionTestIds.UNREALIZED_PNL}-value`,
        ),
      ).toHaveTextContent('Unavailable');
      expect(view.getByText('Lakers vs Celtics')).toBeOnTheScreen();
      expect(totalOf(view)).toEqual({ status: 'error' });
      expect(sliceOf(view)).toEqual({ status: 'error', valueFiat: 0 });
      expect(
        renderedTotals.filter(({ value }) => value.status === 'ready'),
      ).toEqual([]);
    });

    it('drops a stale Summary when a refresh fails instead of showing the old total', async () => {
      const view = renderSection({ predictConfig: KALSHI_ONLY });
      await waitFor(() =>
        expect(totalOf(view)).toEqual({ status: 'ready', valueUsd: 168.13 }),
      );
      expect(
        view.getByTestId(`${PredictHomeSectionTestIds.UNREALIZED_PNL}-value`),
      ).toHaveTextContent('+$3.75 (+9.09%)');

      configurePredictNextFeeds({
        positions: [makePredictNextPosition()],
        summary: new Error('Summary refresh failed'),
      });
      await act(async () => {
        await sectionRef.current?.refresh();
      });

      await waitFor(() => expect(totalOf(view)).toEqual({ status: 'error' }));
      expect(
        view.getByTestId(`${PredictHomeSectionTestIds.UNREALIZED_PNL}-value`),
      ).toHaveTextContent('Unavailable');
      expect(view.queryByText('+$3.75 (+9.09%)')).not.toBeOnTheScreen();
    });

    it('keeps an offline cold start loading, never ready at $0, until the reads can run', async () => {
      onlineManager.setOnline(false);

      const view = renderSection({ predictConfig: KALSHI_ONLY });
      await act(async () => undefined);

      expect(totalOf(view)).toEqual({ status: 'loading' });
      expect(sliceOf(view)).toEqual({ status: 'loading', valueFiat: 0 });
      expect(
        view.getAllByTestId(PredictHomeSectionTestIds.POSITION_ROW_SKELETON),
      ).toHaveLength(2);
      expect(portfolioReads()).toEqual([]);

      act(() => onlineManager.setOnline(true));

      await waitFor(() =>
        expect(totalOf(view)).toEqual({ status: 'ready', valueUsd: 168.13 }),
      );
      expect(
        renderedTotals.filter(
          ({ value }) => value.status === 'ready' && value.valueUsd === 0,
        ),
      ).toEqual([]);
    });

    it('replaces the total on a pull-to-refresh instead of adding to it', async () => {
      const view = renderSection({ predictConfig: KALSHI_ONLY });
      await waitFor(() =>
        expect(totalOf(view)).toEqual({ status: 'ready', valueUsd: 168.13 }),
      );

      configurePredictNextFeeds({
        positions: [makePredictNextPosition()],
        summary: makePredictNextSummary({
          availableBalance: '100.00',
          totalValue: '145.00',
        }),
      });
      await act(async () => {
        await sectionRef.current?.refresh();
      });
      await act(async () => {
        await sectionRef.current?.refresh();
      });

      await waitFor(() =>
        expect(totalOf(view)).toEqual({ status: 'ready', valueUsd: 145 }),
      );
      expect(sliceOf(view)).toEqual({ status: 'ready', valueFiat: 72.5 });
    });

    it('shows discovery instead of the rows, and never reads Polymarket positions, without open Positions', async () => {
      configurePredictNextFeeds({ positions: [] });

      const view = renderSection({ predictConfig: KALSHI_ONLY });

      expect(
        await view.findByTestId(PredictHomeSectionTestIds.DISCOVERY),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeSectionTestIds.POSITIONS),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeSectionTestIds.UNREALIZED_PNL),
      ).not.toBeOnTheScreen();
      expect(getLegacyPositions).not.toHaveBeenCalled();
    });

    it('hides the PnL row and masks amounts in privacy mode', async () => {
      const view = renderSection({
        predictConfig: KALSHI_ONLY,
        privacyMode: true,
      });
      await view.findByText('Lakers vs Celtics');

      expect(
        view.queryByTestId(PredictHomeSectionTestIds.UNREALIZED_PNL),
      ).not.toBeOnTheScreen();
      expect(view.queryByText('$45.00')).not.toBeOnTheScreen();
      expect(
        view.queryByText('$41.25 on Lakers to win $75.00'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('venue change', () => {
    it('never paints Polymarket holdings or reports their value under Kalshi', async () => {
      const view = renderSection({
        predictConfig: rollout({ polymarket: true, kalshi: true }),
        venueSelectionPreference: 'polymarket',
      });
      expect(await view.findByText(POSITION.title)).toBeOnTheScreen();
      await waitFor(() => expect(totalOf(view).status).toBe('ready'));
      const legacyTotal = totalOf(view);
      const framesBefore = committedFrames;

      selectVenue(view, 'kalshi');

      // The first committed frame after the change: Kalshi is resolving.
      expect(view.queryByText(POSITION.title)).not.toBeOnTheScreen();
      expect(
        view.getAllByTestId(PredictHomeSectionTestIds.POSITION_ROW_SKELETON),
      ).toHaveLength(2);
      expect(totalOf(view)).toEqual({ status: 'loading' });

      expect(await view.findByText('Lakers vs Celtics')).toBeOnTheScreen();
      await waitFor(() =>
        expect(totalOf(view)).toEqual({ status: 'ready', valueUsd: 168.13 }),
      );

      expect(committedFrames).toBeGreaterThan(framesBefore);
      expect(inactiveVenueFrames).toBe(0);
      expect(
        renderedTotals.filter(
          ({ venue, value }) =>
            venue === 'kalshi' &&
            value.status === 'ready' &&
            value.valueUsd === legacyTotal.valueUsd,
        ),
      ).toEqual([]);

      selectVenue(view, 'polymarket');

      expect(view.queryByText('Lakers vs Celtics')).not.toBeOnTheScreen();
      expect(await view.findByText(POSITION.title)).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    const renderWithRoutes = () =>
      renderScreenWithRoutes(
        () => <PredictHomeSection sectionIndex={0} totalSectionsLoaded={1} />,
        { name: 'PredictHomeSectionProbe' },
        [
          {
            name: Routes.PREDICT.ROOT,
            Component: createRouteParamsProbe(Routes.PREDICT.ROOT),
          },
        ],
        { state: stateFor({ predictConfig: KALSHI_ONLY }) },
      );

    it('opens the Position’s Event', async () => {
      const view = renderWithRoutes();

      fireEvent.press(await view.findByText('Lakers vs Celtics'));

      expect(
        JSON.parse(
          String(
            (
              await view.findByTestId(
                getRouteParamsProbeTestId(Routes.PREDICT.ROOT),
              )
            ).props.children,
          ),
        ),
      ).toEqual({
        screen: PredictNextRoutes.EVENT,
        params: {
          venueId: KALSHI_VENUE_ID,
          eventId: 'KXNBAGAME-26MAY12-LALBOS',
          titleSnapshot: 'Lakers vs Celtics',
        },
      });
    });

    it('opens Predict Home from the section header', async () => {
      const view = renderWithRoutes();

      fireEvent.press(await view.findByText('Predictions'));

      expect(
        JSON.parse(
          String(
            (
              await view.findByTestId(
                getRouteParamsProbeTestId(Routes.PREDICT.ROOT),
              )
            ).props.children,
          ),
        ),
      ).toEqual({ screen: PredictNextRoutes.HOME });
    });
  });

  describe('after an Order', () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
    const originalFetch = globalThis.fetch;
    const cleanups: (() => void)[] = [];

    afterEach(() => {
      cleanups.splice(0).forEach((cleanup) => cleanup());
      globalThis.fetch = originalFetch;
    });

    it('updates the rows and the total once from the refreshed reads, without a manual refresh', async () => {
      // Real elapsed time: the preview must not expire and the refreshed
      // snapshot must be strictly newer for the UI cache to hydrate it.
      jest.spyOn(Date, 'now').mockImplementation(() => new Date().getTime());
      let positionsBody: unknown = {
        venueId: 'kalshi',
        positions: [makePredictNextPosition()],
      };
      let summaryBody: unknown = makePredictNextSummary({
        availableBalance: '123.12',
        totalValue: '168.12',
      });
      const summaryFetches: string[] = [];
      fetchMock.mockImplementation(async (url, init) => {
        const path = String(url);
        if (path.endsWith('/orders/preview')) {
          const body = JSON.parse(String(init?.body)) as {
            marketId: string;
            contracts: string;
          };
          return {
            ok: true,
            status: 200,
            json: async () =>
              makePredictNextSellPreview({
                marketId: body.marketId,
                requestedContracts: Number(body.contracts),
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
              }),
          } as Response;
        }
        if (path.endsWith('/orders/commit')) {
          return {
            ok: true,
            status: 200,
            json: async () =>
              makePredictNextSellReceipt({
                marketId: 'KXNBAGAME-26MAY12-LALBOS-LAL',
              }),
          } as Response;
        }
        if (path.includes('/venues/kalshi/positions')) {
          return {
            ok: true,
            status: 200,
            json: async () => positionsBody,
          } as Response;
        }
        if (path.includes('/venues/kalshi/portfolio/summary')) {
          summaryFetches.push(path);
          return {
            ok: true,
            status: 200,
            json: async () => summaryBody,
          } as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const trading = composePredictNextPortfolioTrading();
      cleanups.push(() => trading.destroy());
      cleanups.push(routePredictPortfolioServicesTo(trading.rootMessenger));
      const resolved: unknown[] = [];
      (
        trading.rootMessenger.subscribe as unknown as (
          event: string,
          listener: (payload: unknown) => void,
        ) => void
      )('PredictOrderService:orderResolved', (payload) =>
        resolved.push(payload),
      );

      const view = renderSection({ predictConfig: KALSHI_ONLY });
      expect(
        await view.findByText('$41.25 on Lakers to win $75.00'),
      ).toBeOnTheScreen();
      await waitFor(() =>
        expect(totalOf(view)).toEqual({ status: 'ready', valueUsd: 168.12 }),
      );
      const fetchesBeforeOrder = summaryFetches.length;

      // The Venue reports the post-trade reads once the Order fills.
      positionsBody = {
        venueId: 'kalshi',
        positions: [
          makePredictNextPosition({
            shares: '5.00',
            costBasis: '2.75',
            currentValue: '3.00',
            unrealizedPnl: '0.25',
            unrealizedPnlPercent: '9.09',
          }),
        ],
      };
      summaryBody = makePredictNextSummary({
        availableBalance: '156.38',
        positionsValue: '3.00',
        totalValue: '159.38',
        unrealizedPnl: '0.25',
        unrealizedPnlPercent: '9.09',
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const preview = await trading.orderService.requestQuote(
          'kalshi' as PredictVenueId,
          {
            action: 'sell',
            marketId: 'KXNBAGAME-26MAY12-LALBOS-LAL' as PredictEntityId,
            side: 'yes',
            contracts: '70' as never,
          },
        );
        await trading.orderService.commitPreview(
          'kalshi' as PredictVenueId,
          preview.previewId,
        );
      });

      expect(
        await view.findByText('$2.75 on Lakers to win $5.00'),
      ).toBeOnTheScreen();
      await waitFor(() =>
        expect(totalOf(view)).toEqual({ status: 'ready', valueUsd: 159.38 }),
      );
      expect(sliceOf(view)).toEqual({ status: 'ready', valueFiat: 79.69 });
      expect(
        view.getByTestId(`${PredictHomeSectionTestIds.UNREALIZED_PNL}-value`),
      ).toHaveTextContent('+$0.25 (+9.09%)');
      expect(resolved).toHaveLength(1);
      // One Summary read per Order: the receipt's refresh. The UI hydrates
      // from it rather than reading again.
      expect(summaryFetches.length - fetchesBeforeOrder).toBe(1);
      expect(
        renderedTotals.some(
          ({ value }) =>
            value.status === 'ready' &&
            value.valueUsd !== 168.12 &&
            value.valueUsd !== 159.38,
        ),
      ).toBe(false);
    });
  });
});

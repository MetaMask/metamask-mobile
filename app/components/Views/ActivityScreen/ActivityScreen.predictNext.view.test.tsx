import '../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { updateBgState } from '../../../core/redux/slices/engine';
import { strings } from '../../../../locales/i18n';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../tests/component-view/render';
import {
  ActivityDetailsWithProviders,
  renderActivityScreenViewWithRoutes,
} from '../../../../tests/component-view/renderers/activity';
import {
  ACTIVITY_CV_PREDICT_DEPOSIT_HASH,
  activityPredictTradingEnabledFlag,
  buildConfirmedLocalPredictDepositTransaction,
  buildPredictBuyActivity,
  initialStateActivityWithLocalTransactions,
} from '../../../../tests/component-view/presets/activity';
import {
  makePredictNextSettlement,
  makePredictNextTrade,
  messengerCall,
  mockPredictNextMessenger,
} from '../../../../tests/component-view/fixtures/predictNext';
import { setupAccountsTransactionsApiMock } from '../../../../tests/component-view/api-mocking/accounts-transactions';
import { ActivityTypeFilter } from './types';

// Details testIDs mirrored locally so this route suite does not import from
// the sibling ActivityDetails route (ADR 0020).
const DETAILS_SCREEN = 'activity-details-screen';
const DETAILS_HEADER = 'activity-details-header';
const DETAILS_STATUS_ROW = 'activity-details-status-row';
const DETAILS_DO_IT_AGAIN = 'activity-details-do-it-again-button';
const DETAILS_BLOCK_EXPLORER = 'activity-details-block-explorer-button';
const DETAILS_NETWORK_ROW = 'activity-details-network-row';
const DETAILS_NOT_FOUND = 'activity-details-not-found';
const rowTitle = (hash: string) => `activity-title-${hash}`;
const rowSubtitle = (hash: string) => `activity-subtitle-${hash}`;
const rowPrimaryAmount = (hash: string) => `activity-primary-amount-${hash}`;
const rowSecondaryAmount = (hash: string) =>
  `activity-secondary-amount-${hash}`;

const KALSHI_CONFIG = {
  enabled: true,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};
const POLYMARKET_CONFIG = {
  ...KALSHI_CONFIG,
  venues: { polymarket: { enabled: true }, kalshi: { enabled: false } },
};

const BUY_ID = '0199e2b4-1f0d-7c55-8a10-6b7c8d9e0f1a';
const SELL_ID = '0199f6a0-8c1e-7b3a-9d2e-4f1a2b3c4d5e';
const SETTLEMENT_ID = 'settlement-KXNBAGAME-20MAY01-LALBOS-LAL-yes';
const BARE_TRADE_ID = '0199d0c3-0000-7000-8000-000000000001';
const BARE_SETTLEMENT_ID = 'settlement-utah-byu-no-20261019';

const sell = makePredictNextTrade();
const buy = makePredictNextTrade({
  id: BUY_ID,
  action: 'buy',
  shares: '50',
  price: '0.55',
  amount: '28.28',
  fee: '0.78',
  realizedPnl: undefined,
  timestamp: '2026-08-30T12:00:00.000Z',
});
const settlement = makePredictNextSettlement();
/** A Market outside the catalog: no context, and no established cost basis. */
const bareTrade = makePredictNextTrade({
  id: BARE_TRADE_ID,
  action: 'buy',
  realizedPnl: undefined,
  context: undefined,
  timestamp: '2026-05-20T00:00:00.000Z',
});
const bareSettlement = makePredictNextSettlement({
  id: BARE_SETTLEMENT_ID,
  side: 'no',
  shares: '8',
  result: 'yes',
  proceeds: '0',
  realizedPnl: undefined,
  context: undefined,
  timestamp: '2026-05-19T00:00:00.000Z',
});

/** Two pages whose boundary repeats the Settlement. */
const ACTIVITY_PAGES: Record<string, unknown> = {
  first: {
    venueId: 'kalshi',
    activity: [sell, buy, settlement],
    nextCursor: 'page-2',
  },
  'page-2': {
    venueId: 'kalshi',
    activity: [settlement, bareTrade, bareSettlement],
  },
};

const serveKalshiActivity = () =>
  mockPredictNextMessenger((action: string, ...params: unknown[]) => {
    if (action === 'PredictPortfolioService:getActivity') {
      const cursor = params[2] as string | undefined;
      return Promise.resolve(ACTIVITY_PAGES[cursor ?? 'first']);
    }
    return Promise.resolve(undefined);
  });

const canonicalActivityReads = () =>
  messengerCall.mock.calls.filter(
    ([action]) => action === 'PredictPortfolioService:getActivity',
  );

const legacyGetActivity = () =>
  Engine.context.PredictController.getActivity as jest.Mock;

const renderPredictions = (predictConfig: unknown) => {
  const state = initialStateActivityWithLocalTransactions([
    buildConfirmedLocalPredictDepositTransaction(),
  ])
    .withRemoteFeatureFlags({
      ...activityPredictTradingEnabledFlag,
      predictConfig,
    })
    .build();

  return renderActivityScreenViewWithRoutes({
    state,
    params: { initialTypeFilter: ActivityTypeFilter.Predictions },
    extraRoutes: [
      {
        name: Routes.ACTIVITY_DETAILS,
        Component: ActivityDetailsWithProviders,
      },
      {
        name: Routes.PREDICT.ROOT,
        Component: createRouteParamsProbe(Routes.PREDICT.ROOT),
      },
    ],
  });
};

/** Patches the remote flags the way the controller does at runtime. */
const switchPredictConfig = (
  store: ReturnType<typeof renderPredictions>['store'],
  predictConfig: unknown,
) => {
  const engine = Engine as unknown as { state?: Record<string, unknown> };
  const current = store.getState().engine.backgroundState
    .RemoteFeatureFlagController as unknown as {
    remoteFeatureFlags: Record<string, unknown>;
  };
  engine.state = {
    ...(engine.state ?? {}),
    RemoteFeatureFlagController: {
      ...current,
      remoteFeatureFlags: { ...current.remoteFeatureFlags, predictConfig },
    },
  };
  act(() => {
    store.dispatch(updateBgState({ key: 'RemoteFeatureFlagController' }));
  });
};

const expectPlaceAnotherPrediction = async (
  screen: ReturnType<typeof renderPredictions>,
) => {
  const cta = screen.getByTestId(DETAILS_DO_IT_AGAIN);
  expect(cta).toHaveTextContent(
    strings('predict.transactions.place_another_prediction'),
  );
  fireEvent.press(cta);
  const params = await screen.findByTestId(
    getRouteParamsProbeTestId(Routes.PREDICT.ROOT),
  );
  expect(JSON.parse(String(params.props.children))).toEqual({
    screen: Routes.PREDICT.MARKET_LIST,
  });
};

describeForPlatforms('ActivityScreen — PredictNext (Kalshi) Activity', () => {
  let defaultMessengerCall: ReturnType<
    typeof messengerCall.getMockImplementation
  >;

  beforeAll(() => {
    defaultMessengerCall = messengerCall.getMockImplementation();
  });

  beforeEach(() => {
    setupAccountsTransactionsApiMock([]);
    messengerCall.mockClear();
    legacyGetActivity()
      .mockReset()
      .mockResolvedValue({
        activities: [buildPredictBuyActivity()],
        nextCursor: undefined,
      });
    serveKalshiActivity();
  });

  afterEach(() => {
    messengerCall.mockImplementation(defaultMessengerCall);
    legacyGetActivity()
      .mockReset()
      .mockResolvedValue({ activities: [], nextCursor: undefined });
  });

  it('lists Kalshi Trades and Settlements as USD venue rows and hides Polymarket funding', async () => {
    const screen = renderPredictions(KALSHI_CONFIG);

    const buyAmount = await screen.findByTestId(rowPrimaryAmount(BUY_ID));
    expect(buyAmount).toHaveTextContent('-$28.28');
    expect(screen.getByTestId(rowTitle(BUY_ID))).toHaveTextContent(
      strings('transactions.activity_prediction_placed'),
    );
    expect(screen.getByTestId(rowSubtitle(BUY_ID))).toHaveTextContent(
      'Lakers vs Celtics',
    );
    expect(screen.queryByTestId(rowSecondaryAmount(BUY_ID))).toBeNull();
    expect(screen.getByTestId(rowPrimaryAmount(SELL_ID))).toHaveTextContent(
      '+$5.93',
    );
    expect(
      screen.getByTestId(rowPrimaryAmount(SETTLEMENT_ID)),
    ).toHaveTextContent('+$10.00');
    expect(screen.getByTestId(rowTitle(SETTLEMENT_ID))).toHaveTextContent(
      strings('predict.transactions.settled_title'),
    );

    expect(
      screen.queryByTestId(rowTitle(ACTIVITY_CV_PREDICT_DEPOSIT_HASH)),
    ).toBeNull();
    expect(screen.queryByText(/USDC/)).toBeNull();
    expect(canonicalActivityReads()[0]).toEqual([
      'PredictPortfolioService:getActivity',
      'kalshi',
      { limit: 20 },
      undefined,
    ]);
    expect(legacyGetActivity()).not.toHaveBeenCalled();
  });

  it("opens a Kalshi Trade's details in the Polymarket layout and enters Predict", async () => {
    const screen = renderPredictions(KALSHI_CONFIG);

    fireEvent.press(await screen.findByTestId(rowTitle(BUY_ID)));

    const details = await screen.findByTestId(DETAILS_SCREEN);
    await within(details).findByText('Will the Lakers win?');
    expect(screen.getByTestId(DETAILS_HEADER)).toHaveTextContent(
      strings('transactions.activity_prediction_placed'),
      { exact: false },
    );
    expect(
      within(details).getByText(strings('predict.transactions.you_predicted')),
    ).toBeOnTheScreen();
    expect(within(details).getByText('Lakers')).toBeOnTheScreen();
    expect(screen.getByTestId(DETAILS_STATUS_ROW)).toBeOnTheScreen();
    expect(
      within(details).getByText(
        strings('predict.transactions.predicted_amount'),
      ),
    ).toBeOnTheScreen();
    expect(within(details).getByText('$28.28')).toBeOnTheScreen();
    expect(
      within(details).getByText(strings('predict.transactions.shares_bought')),
    ).toBeOnTheScreen();
    expect(within(details).getByText('50')).toBeOnTheScreen();
    expect(within(details).getByText('$0.5500')).toBeOnTheScreen();
    expect(
      within(details).queryByText(strings('predict.transactions.net_pnl')),
    ).toBeNull();
    expect(
      within(details).queryByText(
        strings('predict.transactions.view_on_polymarket'),
      ),
    ).toBeNull();
    expect(screen.queryByTestId(DETAILS_BLOCK_EXPLORER)).toBeNull();
    expect(screen.queryByTestId(DETAILS_NETWORK_ROW)).toBeNull();
    expect(within(details).queryByText(/kalshi:mainnet/)).toBeNull();

    await expectPlaceAnotherPrediction(screen);
  });

  it("shows a Kalshi Cash Out's shares sold and net P&L", async () => {
    const screen = renderPredictions(KALSHI_CONFIG);

    fireEvent.press(await screen.findByTestId(rowTitle(SELL_ID)));

    const details = await screen.findByTestId(DETAILS_SCREEN);
    await within(details).findByText(
      strings('predict.transactions.shares_sold'),
    );
    expect(within(details).getByText('10')).toBeOnTheScreen();
    expect(within(details).getByText('$0.6100')).toBeOnTheScreen();
    expect(
      within(details).queryByText(
        strings('predict.transactions.predicted_amount'),
      ),
    ).toBeNull();
    expect(
      within(details).getByText(strings('predict.transactions.net_pnl')),
    ).toBeOnTheScreen();
    expect(within(details).getByText('+$0.27')).toBeOnTheScreen();
  });

  it("opens a Settlement's details through the Settlement template and enters Predict", async () => {
    const screen = renderPredictions(KALSHI_CONFIG);

    fireEvent.press(await screen.findByTestId(rowTitle(SETTLEMENT_ID)));

    const details = await screen.findByTestId(DETAILS_SCREEN);
    await within(details).findByText(
      strings('predict.transactions.settlement_result'),
    );
    expect(within(details).getByText('+$10.00')).toBeOnTheScreen();
    expect(within(details).getByText('Lakers')).toBeOnTheScreen();
    expect(
      within(details).getByText(
        strings('predict.transactions.settlement_result_won'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(details).getByText(strings('predict.transactions.shares_settled')),
    ).toBeOnTheScreen();
    expect(within(details).getByText('+$4.80')).toBeOnTheScreen();
    expect(screen.queryByTestId(DETAILS_BLOCK_EXPLORER)).toBeNull();
    expect(screen.queryByTestId(DETAILS_NOT_FOUND)).toBeNull();

    await expectPlaceAnotherPrediction(screen);
  });

  it('pages without repeating a row, and renders entries with absent fields with neutral copy', async () => {
    const screen = renderPredictions(KALSHI_CONFIG);
    await screen.findByTestId(rowTitle(SETTLEMENT_ID));

    await screen.findByTestId(rowTitle(BARE_SETTLEMENT_ID));
    expect(canonicalActivityReads().at(-1)?.[3]).toBe('page-2');
    expect(screen.getAllByTestId(rowTitle(SETTLEMENT_ID))).toHaveLength(1);
    expect(screen.queryByTestId(rowSubtitle(BARE_TRADE_ID))).toBeNull();
    expect(
      screen.getByTestId(rowPrimaryAmount(BARE_SETTLEMENT_ID)),
    ).toHaveTextContent('+$0.00');

    fireEvent.press(screen.getByTestId(rowTitle(BARE_SETTLEMENT_ID)));

    const details = await screen.findByTestId(DETAILS_SCREEN);
    await within(details).findByText(
      strings('predict_next.portfolio.unknown_market'),
    );
    expect(
      within(details).getByText(strings('predict.market_details.no')),
    ).toBeOnTheScreen();
    expect(
      within(details).getByText(
        strings('predict.transactions.settlement_result_lost'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(details).queryByText(strings('predict.transactions.net_pnl')),
    ).toBeNull();
  });

  it('keeps Polymarket on the legacy branch, then swaps every row on a Venue change', async () => {
    const screen = renderPredictions(POLYMARKET_CONFIG);

    expect(
      await screen.findByTestId(rowTitle('activity-cv-predict-buy')),
    ).toHaveTextContent(strings('transactions.activity_prediction_placed'));
    expect(
      await screen.findByTestId(rowTitle(ACTIVITY_CV_PREDICT_DEPOSIT_HASH)),
    ).toBeOnTheScreen();
    expect(canonicalActivityReads()).toHaveLength(0);

    switchPredictConfig(screen.store, KALSHI_CONFIG);

    await screen.findByTestId(rowTitle(BUY_ID));
    expect(
      screen.queryByTestId(rowTitle('activity-cv-predict-buy')),
    ).toBeNull();
    expect(
      screen.queryByTestId(rowTitle(ACTIVITY_CV_PREDICT_DEPOSIT_HASH)),
    ).toBeNull();

    switchPredictConfig(screen.store, POLYMARKET_CONFIG);

    await screen.findByTestId(rowTitle('activity-cv-predict-buy'));
    expect(screen.queryByTestId(rowTitle(BUY_ID))).toBeNull();
    expect(
      screen.getByTestId(rowTitle(ACTIVITY_CV_PREDICT_DEPOSIT_HASH)),
    ).toBeOnTheScreen();
  });
});

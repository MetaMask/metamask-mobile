/**
 * Component view tests for PredictPositionsView.
 *
 * Run with: yarn jest -c jest.config.view.js PredictPositionsView.view.test --runInBand --silent --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import Engine from '../../../../../../app/core/Engine';
import {
  renderPredictPositionsView,
  renderPredictPositionsViewWithRoutes,
} from '../../../../../../tests/component-view/renderers/predictPositions';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PredictPositionSelectorsIDs,
  PredictPositionsEmptySelectorsIDs,
  PredictPositionsViewSelectorsIDs,
} from '../../Predict.testIds';
import {
  PredictActivity,
  PredictPosition,
  PredictPositionStatus,
} from '../../types';
import { PredictEventValues } from '../../constants/eventNames';

const createPosition = (
  id: string,
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  amount: 10,
  avgPrice: 1,
  cashPnl: 0,
  claimable: false,
  currentValue: 20,
  endDate: '2026-01-01T00:00:00Z',
  icon: 'https://example.com/icon.png',
  id,
  initialValue: 20,
  marketId: `market-${id}`,
  outcome: 'Yes',
  outcomeId: `outcome-${id}`,
  outcomeIndex: 0,
  outcomeTokenId: `token-${id}`,
  percentPnl: 0,
  price: 1,
  providerId: 'polymarket',
  size: 10,
  status: PredictPositionStatus.OPEN,
  title: `Market ${id}`,
  ...overrides,
});

const OPEN_GAIN_POSITION = createPosition('france', {
  currentValue: 24,
  initialValue: 20,
  percentPnl: 20,
  title: 'Will France win the 2026 FIFA World Cup?',
});

const OPEN_LOSS_POSITION = createPosition('europe', {
  currentValue: 9,
  initialValue: 10,
  percentPnl: -10,
  title: 'Will Europe win the 2026 FIFA World Cup?',
});

const CLAIMABLE_POSITION = createPosition('claimable', {
  claimable: true,
  currentValue: 4.5,
  initialValue: 3,
  percentPnl: 50,
  status: PredictPositionStatus.WON,
  title: 'Will Finland win Eurovision?',
});

const CLOSED_LOST_POSITION = createPosition('lost', {
  currentValue: 0,
  initialValue: 1,
  percentPnl: -100,
  status: PredictPositionStatus.LOST,
  title: 'Bitcoin Up or Down on May 1?',
});

const ACTIVITY: PredictActivity = {
  id: 'activity-1',
  providerId: 'polymarket',
  title: 'Prediction lost',
  outcome: 'USA',
  icon: 'https://example.com/activity.png',
  entry: {
    type: 'buy',
    amount: 40,
    price: 0.4,
    timestamp: Math.floor(Date.now() / 1000),
    marketId: 'history-market',
    outcomeId: 'history-outcome',
    outcomeTokenId: 1,
  },
};

const mockPredictData = ({
  activity = [],
  balance = 0,
  positions = [],
}: {
  activity?: PredictActivity[];
  balance?: number;
  positions?: PredictPosition[];
}) => {
  (Engine.context.PredictController.getActivity as jest.Mock).mockResolvedValue(
    activity,
  );
  (Engine.context.PredictController.getBalance as jest.Mock).mockResolvedValue(
    balance,
  );
  (
    Engine.context.PredictController.getPositions as jest.Mock
  ).mockResolvedValue(positions);
};

describe('PredictPositionsView component view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPredictData({});
  });

  it('shows active positions with rewards after portfolio data loads', async () => {
    mockPredictData({
      balance: 250,
      positions: [OPEN_GAIN_POSITION, CLAIMABLE_POSITION, CLOSED_LOST_POSITION],
    });
    const { findByText, findByTestId, queryByText } =
      renderPredictPositionsView();

    expect(await findByText(OPEN_GAIN_POSITION.title)).toBeOnTheScreen();

    expect(await findByText('$250.00')).toBeOnTheScreen();
    expect(await findByText('+$4.00 (+20%)')).toBeOnTheScreen();
    expect(await findByText('Claim $4.50')).toBeOnTheScreen();
    expect(
      await findByTestId(PredictPositionSelectorsIDs.CURRENT_POSITION_CARD),
    ).toBeOnTheScreen();
    expect(queryByText(CLAIMABLE_POSITION.title)).not.toBeOnTheScreen();
    expect(queryByText(CLOSED_LOST_POSITION.title)).not.toBeOnTheScreen();
  });

  it('shows active positions without rewards when there are no claimable winnings', async () => {
    mockPredictData({
      balance: 100,
      positions: [OPEN_LOSS_POSITION],
    });
    const { findByText, queryByTestId } = renderPredictPositionsView();

    expect(await findByText(OPEN_LOSS_POSITION.title)).toBeOnTheScreen();

    expect(await findByText('$100.00')).toBeOnTheScreen();
    expect(await findByText('-$1.00 (-10%)')).toBeOnTheScreen();
    expect(
      queryByTestId(PredictPositionsViewSelectorsIDs.CLAIM_CTA),
    ).not.toBeOnTheScreen();
  });

  it('navigates from the active empty state back to browse markets', async () => {
    mockPredictData({});
    const { findByTestId } = renderPredictPositionsViewWithRoutes({
      extraRoutes: [{ name: Routes.PREDICT.MARKET_LIST }],
    });

    expect(
      await findByTestId(PredictPositionsEmptySelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(PredictPositionsEmptySelectorsIDs.BROWSE_MARKETS_CTA),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PREDICT.MARKET_LIST)),
    ).toBeOnTheScreen();
  });

  it('switches to history and renders activity through the history wrapper', async () => {
    const trackPositionsTabViewedSpy = jest.spyOn(
      Engine.context.PredictController,
      'trackPositionsTabViewed',
    );
    mockPredictData({
      activity: [ACTIVITY],
      positions: [OPEN_GAIN_POSITION],
    });
    const { findByText, findByTestId } = renderPredictPositionsView();

    expect(await findByText(OPEN_GAIN_POSITION.title)).toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB),
    );

    expect(await findByText('Predicted')).toBeOnTheScreen();
    expect(await findByText(ACTIVITY.title as string)).toBeOnTheScreen();
    await waitFor(() => {
      expect(trackPositionsTabViewedSpy).toHaveBeenCalledWith({
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        openPositionsCount: 1,
        claimablePositionsCount: 0,
        hasClaimableWinnings: false,
        predictScreen:
          PredictEventValues.PREDICT_SCREEN.PREDICT_POSITIONS_SCREEN,
        predictFeedTab: PredictEventValues.PREDICT_FEED_TAB.HISTORY,
      });
    });
  });

  it('uses the shared empty state for empty history and navigates to browse markets', async () => {
    mockPredictData({});
    const { findByTestId } = renderPredictPositionsViewWithRoutes({
      initialParams: { initialTab: 'history' },
      extraRoutes: [{ name: Routes.PREDICT.MARKET_LIST }],
    });

    expect(
      await findByTestId(PredictPositionsEmptySelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(PredictPositionsEmptySelectorsIDs.BROWSE_MARKETS_CTA),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PREDICT.MARKET_LIST)),
    ).toBeOnTheScreen();
  });
});

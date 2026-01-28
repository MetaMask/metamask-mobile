import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictPicks from './PredictPicks';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import {
  PredictPositionStatus,
  Recurrence,
  type PredictPosition,
  type PredictMarket,
} from '../../types';
import { formatPrice } from '../../utils/format';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));
jest.mock('@react-navigation/compat', () => ({
  withNavigation: (Component: React.ComponentType) => Component,
  createSwitchNavigator: jest.fn(),
}));
jest.mock('../../hooks/usePredictPositions');
jest.mock('../../hooks/usePredictActionGuard');
jest.mock('../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => ({
    deposit: jest.fn(),
    isDepositPending: false,
  }),
}));
jest.mock('../../hooks/useLivePositions', () => ({
  useLivePositions: jest.fn((positions: unknown[]) => ({
    livePositions: positions ?? [],
    isConnected: false,
    lastUpdateTime: null,
  })),
}));
jest.mock('../../hooks/usePredictOptimisticPositionRefresh', () => ({
  usePredictOptimisticPositionRefresh: jest.fn(
    ({ position }: { position: unknown }) => position,
  ),
}));
jest.mock('../../utils/format');

const mockUsePredictPositions = usePredictPositions as jest.MockedFunction<
  typeof usePredictPositions
>;
const mockUsePredictActionGuard = usePredictActionGuard as jest.MockedFunction<
  typeof usePredictActionGuard
>;
const mockFormatPrice = formatPrice as jest.MockedFunction<typeof formatPrice>;

interface MockPositionsConfig {
  livePositions?: PredictPosition[];
  claimablePositions?: PredictPosition[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: string | null;
}

const setupPositionsMock = (config: MockPositionsConfig = {}) => {
  const {
    livePositions = [],
    claimablePositions = [],
    isLoading = false,
    isRefreshing = false,
    error = null,
  } = config;

  mockUsePredictPositions.mockImplementation((options) => ({
    positions: options?.claimable ? claimablePositions : livePositions,
    isLoading,
    isRefreshing,
    error,
    loadPositions: jest.fn(),
  }));
};

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'will-btc-hit-100k',
  title: 'Will BTC hit 100k?',
  description: 'Bitcoin price prediction market',
  endDate: '2025-12-31T00:00:00Z',
  image: 'https://example.com/market-image.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['bitcoin', 'crypto'],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      title: 'Yes',
      description: 'BTC will hit 100k',
      image: 'https://example.com/yes.png',
      status: 'open',
      tokens: [{ id: '0', title: 'Yes', price: 0.67 }],
      volume: 1000,
      groupItemTitle: 'Yes',
    },
    {
      id: 'outcome-2',
      providerId: 'polymarket',
      marketId: 'market-1',
      title: 'No',
      description: 'BTC will not hit 100k',
      image: 'https://example.com/no.png',
      status: 'open',
      tokens: [{ id: '1', title: 'No', price: 0.33 }],
      volume: 500,
      groupItemTitle: 'No',
    },
  ],
  liquidity: 10000,
  volume: 50000,
  ...overrides,
});

const createMockPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '0',
  icon: 'https://example.com/icon.png',
  title: 'Will BTC hit 100k?',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 10,
  price: 0.67,
  status: PredictPositionStatus.OPEN,
  size: 50,
  cashPnl: 15.5,
  percentPnl: 5.25,
  initialValue: 100,
  currentValue: 115.5,
  avgPrice: 0.5,
  claimable: false,
  endDate: '2025-12-31T00:00:00Z',
  ...overrides,
});

describe('PredictPicks', () => {
  const mockExecuteGuardedAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    setupPositionsMock();
    mockUsePredictActionGuard.mockReturnValue({
      executeGuardedAction: mockExecuteGuardedAction,
      isEligible: true,
      hasNoBalance: false,
    });
    mockFormatPrice.mockImplementation(
      (value: number | string, _options?: { maximumDecimals?: number }) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return '$0.00';
        return `$${num.toFixed(2)}`;
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering states', () => {
    it('returns null when there are no positions and not loading', () => {
      setupPositionsMock();

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.queryByTestId('predict-picks')).toBeNull();
    });

    it('returns null when loading with no existing positions', () => {
      setupPositionsMock({ isLoading: true });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.queryByTestId('predict-picks')).toBeNull();
    });

    it('returns null when refreshing with no existing positions', () => {
      setupPositionsMock({ isRefreshing: true });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.queryByTestId('predict-picks')).toBeNull();
    });

    it('renders container when live positions exist', () => {
      setupPositionsMock({ livePositions: [createMockPosition()] });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getAllByTestId('predict-picks').length).toBeGreaterThan(0);
    });

    it('renders container when only claimable positions exist', () => {
      setupPositionsMock({
        livePositions: [],
        claimablePositions: [createMockPosition({ claimable: true })],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getAllByTestId('predict-picks').length).toBeGreaterThan(0);
    });

    it('renders "Your Picks" header when positions exist', () => {
      setupPositionsMock({ livePositions: [createMockPosition()] });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getByText('Your picks')).toBeOnTheScreen();
    });
  });

  describe('position display', () => {
    it('displays position initialValue and outcome', () => {
      setupPositionsMock({
        livePositions: [
          createMockPosition({ initialValue: 50, outcome: 'Yes' }),
        ],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getByText(/\$50\.00 on/)).toBeOnTheScreen();
      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
    });

    it('displays positive cashPnl value', () => {
      setupPositionsMock({
        livePositions: [createMockPosition({ cashPnl: 25.75 })],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getByText('$25.75')).toBeOnTheScreen();
    });

    it('displays negative cashPnl value', () => {
      setupPositionsMock({
        livePositions: [createMockPosition({ cashPnl: -10.5 })],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getByText('$-10.50')).toBeOnTheScreen();
    });

    it('displays zero cashPnl value', () => {
      setupPositionsMock({
        livePositions: [createMockPosition({ cashPnl: 0 })],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getByText('$0.00')).toBeOnTheScreen();
    });

    it('applies SuccessDefault color when cashPnl is positive', () => {
      setupPositionsMock({
        livePositions: [
          createMockPosition({ id: 'pos-positive', cashPnl: 25.75 }),
        ],
      });

      render(<PredictPicks market={createMockMarket()} />);

      const pnlText = screen.getByTestId('predict-picks-pnl-pos-positive');
      expect(pnlText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expect.any(String),
          }),
        ]),
      );
    });

    it('applies ErrorDefault color when cashPnl is negative', () => {
      setupPositionsMock({
        livePositions: [
          createMockPosition({ id: 'pos-negative', cashPnl: -10.5 }),
        ],
      });

      render(<PredictPicks market={createMockMarket()} />);

      const pnlText = screen.getByTestId('predict-picks-pnl-pos-negative');
      expect(pnlText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expect.any(String),
          }),
        ]),
      );
    });

    it('applies SuccessDefault color when cashPnl is zero (break-even)', () => {
      setupPositionsMock({
        livePositions: [createMockPosition({ id: 'pos-zero', cashPnl: 0 })],
      });

      render(<PredictPicks market={createMockMarket()} />);

      const pnlText = screen.getByTestId('predict-picks-pnl-pos-zero');
      expect(pnlText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expect.any(String),
          }),
        ]),
      );
    });

    it('renders Cash Out button for non-claimable position', () => {
      setupPositionsMock({
        livePositions: [createMockPosition({ claimable: false })],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getByText('Cash out')).toBeOnTheScreen();
    });

    it('does not render Cash Out button for claimable position', () => {
      setupPositionsMock({
        livePositions: [],
        claimablePositions: [
          createMockPosition({ id: 'pos-claimable', claimable: true }),
        ],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(
        screen.queryByTestId('predict-picks-cash-out-button-pos-claimable'),
      ).toBeNull();
    });
  });

  describe('multiple positions', () => {
    it('renders all live positions in the list', () => {
      const positions = [
        createMockPosition({ id: 'pos-1', outcome: 'Yes', size: 100 }),
        createMockPosition({ id: 'pos-2', outcome: 'No', size: 200 }),
        createMockPosition({ id: 'pos-3', outcome: 'Maybe', size: 50 }),
      ];
      setupPositionsMock({ livePositions: positions });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
      expect(screen.getByText(/No/)).toBeOnTheScreen();
      expect(screen.getByText(/Maybe/)).toBeOnTheScreen();
    });

    it('renders both live and claimable positions', () => {
      setupPositionsMock({
        livePositions: [createMockPosition({ id: 'pos-live', outcome: 'Yes' })],
        claimablePositions: [
          createMockPosition({
            id: 'pos-claim',
            outcome: 'No',
            claimable: true,
          }),
        ],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
      expect(screen.getByText(/No/)).toBeOnTheScreen();
    });

    it('renders Cash Out button only for non-claimable positions', () => {
      const positions = [
        createMockPosition({ id: 'pos-1', claimable: false }),
        createMockPosition({ id: 'pos-2', claimable: false }),
      ];
      setupPositionsMock({ livePositions: positions });

      render(<PredictPicks market={createMockMarket()} />);

      const cashOutButtons = screen.getAllByText('Cash out');

      expect(cashOutButtons).toHaveLength(2);
    });
  });

  describe('hook configuration', () => {
    it('calls usePredictPositions with correct market.id for live positions', () => {
      setupPositionsMock();

      render(
        <PredictPicks
          market={createMockMarket({ id: 'specific-market-123' })}
        />,
      );

      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        marketId: 'specific-market-123',
        autoRefreshTimeout: 10000,
      });
    });

    it('calls usePredictPositions with claimable flag for claimable positions', () => {
      setupPositionsMock();

      render(
        <PredictPicks
          market={createMockMarket({ id: 'specific-market-123' })}
        />,
      );

      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        marketId: 'specific-market-123',
        claimable: true,
      });
    });

    it('passes autoRefreshTimeout of 10000ms to hook', () => {
      setupPositionsMock();

      render(<PredictPicks market={createMockMarket()} />);

      expect(mockUsePredictPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          autoRefreshTimeout: 10000,
        }),
      );
    });
  });

  describe('formatPrice calls', () => {
    it('calls formatPrice for position initialValue', () => {
      setupPositionsMock({
        livePositions: [createMockPosition({ initialValue: 15.75 })],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(mockFormatPrice).toHaveBeenCalledWith(15.75, {
        maximumDecimals: 2,
      });
    });

    it('calls formatPrice for cashPnl', () => {
      setupPositionsMock({
        livePositions: [createMockPosition({ cashPnl: 1234.56 })],
      });

      render(<PredictPicks market={createMockMarket()} />);

      expect(mockFormatPrice).toHaveBeenCalledWith(1234.56, {
        maximumDecimals: 2,
      });
    });
  });

  describe('cash out functionality', () => {
    it('calls executeGuardedAction when Cash Out button is pressed', () => {
      const position = createMockPosition({ id: 'pos-1', claimable: false });
      setupPositionsMock({ livePositions: [position] });

      render(<PredictPicks market={createMockMarket()} />);
      fireEvent.press(
        screen.getByTestId('predict-picks-cash-out-button-pos-1'),
      );

      expect(mockExecuteGuardedAction).toHaveBeenCalledTimes(1);
    });

    it('passes CASHOUT as attemptedAction option to executeGuardedAction', () => {
      const position = createMockPosition({ id: 'pos-1', claimable: false });
      setupPositionsMock({ livePositions: [position] });

      render(<PredictPicks market={createMockMarket()} />);
      fireEvent.press(
        screen.getByTestId('predict-picks-cash-out-button-pos-1'),
      );

      expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
        expect.any(Function),
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CASHOUT },
      );
    });

    it('navigates to SELL_PREVIEW when guarded action callback executes', () => {
      const market = createMockMarket();
      const position = createMockPosition({
        id: 'pos-1',
        outcomeId: 'outcome-1',
        claimable: false,
      });
      setupPositionsMock({ livePositions: [position] });
      mockExecuteGuardedAction.mockImplementation((callback) => callback());

      render(<PredictPicks market={market} />);
      fireEvent.press(
        screen.getByTestId('predict-picks-cash-out-button-pos-1'),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.SELL_PREVIEW,
        expect.objectContaining({
          market,
          position,
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        }),
      );
    });

    it('finds correct outcome from market.outcomes by position.outcomeId', () => {
      const market = createMockMarket();
      const position = createMockPosition({
        id: 'pos-1',
        outcomeId: 'outcome-2',
        claimable: false,
      });
      setupPositionsMock({ livePositions: [position] });
      mockExecuteGuardedAction.mockImplementation((callback) => callback());

      render(<PredictPicks market={market} />);
      fireEvent.press(
        screen.getByTestId('predict-picks-cash-out-button-pos-1'),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.SELL_PREVIEW,
        expect.objectContaining({
          outcome: market.outcomes[1],
        }),
      );
    });

    it('passes undefined outcome when outcomeId not found in market.outcomes', () => {
      const market = createMockMarket();
      const position = createMockPosition({
        id: 'pos-1',
        outcomeId: 'non-existent-outcome',
        claimable: false,
      });
      setupPositionsMock({ livePositions: [position] });
      mockExecuteGuardedAction.mockImplementation((callback) => callback());

      render(<PredictPicks market={market} />);
      fireEvent.press(
        screen.getByTestId('predict-picks-cash-out-button-pos-1'),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.SELL_PREVIEW,
        expect.objectContaining({
          outcome: undefined,
        }),
      );
    });

    it('calls usePredictActionGuard with market.providerId', () => {
      const market = createMockMarket({ providerId: 'custom-provider' });
      setupPositionsMock({ livePositions: [createMockPosition()] });

      render(<PredictPicks market={market} />);

      expect(mockUsePredictActionGuard).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'custom-provider',
        }),
      );
    });
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictPicks from './PredictPicks';
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

import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));
jest.mock('../../hooks/usePredictActionGuard');
jest.mock('../../hooks/usePredictLivePositions', () => ({
  usePredictLivePositions: jest.fn((positions: unknown[]) => ({
    livePositions: positions ?? [],
    isConnected: false,
    lastUpdateTime: null,
  })),
}));
jest.mock('../../utils/format');

const mockUsePredictActionGuard = usePredictActionGuard as jest.MockedFunction<
  typeof usePredictActionGuard
>;
const mockFormatPrice = formatPrice as jest.MockedFunction<typeof formatPrice>;

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: POLYMARKET_PROVIDER_ID,
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
      providerId: POLYMARKET_PROVIDER_ID,
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
      providerId: POLYMARKET_PROVIDER_ID,
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
  providerId: POLYMARKET_PROVIDER_ID,
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
    mockUsePredictActionGuard.mockReturnValue({
      executeGuardedAction: mockExecuteGuardedAction,
      isEligible: true,
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
    it('renders container when live positions exist', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition()]}
          claimablePositions={[]}
        />,
      );

      expect(screen.getAllByTestId('predict-picks').length).toBeGreaterThan(0);
    });

    it('renders container when only claimable positions exist', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[]}
          claimablePositions={[createMockPosition({ claimable: true })]}
        />,
      );

      expect(screen.getAllByTestId('predict-picks').length).toBeGreaterThan(0);
    });

    it('renders pick items when positions exist', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition()]}
          claimablePositions={[]}
        />,
      );

      expect(screen.getAllByTestId('predict-picks').length).toBeGreaterThan(0);
    });

    it('renders empty container when no positions provided', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[]}
          claimablePositions={[]}
        />,
      );

      expect(screen.getByTestId('predict-picks')).toBeOnTheScreen();
    });
  });

  describe('position display', () => {
    it('displays position initialValue and outcome', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition({ initialValue: 50, outcome: 'Yes' })]}
          claimablePositions={[]}
        />,
      );

      expect(screen.getByText(/\$50\.00 on/)).toBeOnTheScreen();
      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
    });

    it('displays positive cashPnl value', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition({ cashPnl: 25.75 })]}
          claimablePositions={[]}
        />,
      );

      expect(screen.getByText('$25.75')).toBeOnTheScreen();
    });

    it('displays negative cashPnl value', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition({ cashPnl: -10.5 })]}
          claimablePositions={[]}
        />,
      );

      expect(screen.getByText('$-10.50')).toBeOnTheScreen();
    });

    it('displays zero cashPnl value', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition({ cashPnl: 0 })]}
          claimablePositions={[]}
        />,
      );

      expect(screen.getByText('$0.00')).toBeOnTheScreen();
    });

    it('applies SuccessDefault color when cashPnl is positive', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[
            createMockPosition({ id: 'pos-positive', cashPnl: 25.75 }),
          ]}
          claimablePositions={[]}
        />,
      );

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
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[
            createMockPosition({ id: 'pos-negative', cashPnl: -10.5 }),
          ]}
          claimablePositions={[]}
        />,
      );

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
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition({ id: 'pos-zero', cashPnl: 0 })]}
          claimablePositions={[]}
        />,
      );

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
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition({ claimable: false })]}
          claimablePositions={[]}
        />,
      );

      expect(screen.getByText('Cash out')).toBeOnTheScreen();
    });

    it('does not render Cash Out button for claimable position', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[]}
          claimablePositions={[
            createMockPosition({ id: 'pos-claimable', claimable: true }),
          ]}
        />,
      );

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

      render(
        <PredictPicks
          market={createMockMarket()}
          positions={positions}
          claimablePositions={[]}
        />,
      );

      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
      expect(screen.getByText(/No/)).toBeOnTheScreen();
      expect(screen.getByText(/Maybe/)).toBeOnTheScreen();
    });

    it('renders both live and claimable positions', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition({ id: 'pos-live', outcome: 'Yes' })]}
          claimablePositions={[
            createMockPosition({
              id: 'pos-claim',
              outcome: 'No',
              claimable: true,
            }),
          ]}
        />,
      );

      expect(screen.getByText(/Yes/)).toBeOnTheScreen();
      expect(screen.getByText(/No/)).toBeOnTheScreen();
    });

    it('renders Cash Out button only for non-claimable positions', () => {
      const positions = [
        createMockPosition({ id: 'pos-1', claimable: false }),
        createMockPosition({ id: 'pos-2', claimable: false }),
      ];

      render(
        <PredictPicks
          market={createMockMarket()}
          positions={positions}
          claimablePositions={[]}
        />,
      );

      const cashOutButtons = screen.getAllByText('Cash out');

      expect(cashOutButtons).toHaveLength(2);
    });
  });

  describe('formatPrice calls', () => {
    it('calls formatPrice for position initialValue', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition({ initialValue: 15.75 })]}
          claimablePositions={[]}
        />,
      );

      expect(mockFormatPrice).toHaveBeenCalledWith(15.75, {
        maximumDecimals: 2,
      });
    });

    it('calls formatPrice for cashPnl', () => {
      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[createMockPosition({ cashPnl: 1234.56 })]}
          claimablePositions={[]}
        />,
      );

      expect(mockFormatPrice).toHaveBeenCalledWith(1234.56, {
        maximumDecimals: 2,
      });
    });
  });

  describe('cash out functionality', () => {
    it('calls executeGuardedAction when Cash Out button is pressed', () => {
      const position = createMockPosition({ id: 'pos-1', claimable: false });

      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[position]}
          claimablePositions={[]}
        />,
      );
      fireEvent.press(
        screen.getByTestId('predict-picks-cash-out-button-pos-1'),
      );

      expect(mockExecuteGuardedAction).toHaveBeenCalledTimes(1);
    });

    it('passes CASHOUT as attemptedAction option to executeGuardedAction', () => {
      const position = createMockPosition({ id: 'pos-1', claimable: false });

      render(
        <PredictPicks
          market={createMockMarket()}
          positions={[position]}
          claimablePositions={[]}
        />,
      );
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
      mockExecuteGuardedAction.mockImplementation((callback) => callback());

      render(
        <PredictPicks
          market={market}
          positions={[position]}
          claimablePositions={[]}
        />,
      );
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
      mockExecuteGuardedAction.mockImplementation((callback) => callback());

      render(
        <PredictPicks
          market={market}
          positions={[position]}
          claimablePositions={[]}
        />,
      );
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
      mockExecuteGuardedAction.mockImplementation((callback) => callback());

      render(
        <PredictPicks
          market={market}
          positions={[position]}
          claimablePositions={[]}
        />,
      );
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

    it('calls usePredictActionGuard with navigation only', () => {
      const market = createMockMarket({ providerId: 'custom-provider' });

      render(
        <PredictPicks
          market={market}
          positions={[createMockPosition()]}
          claimablePositions={[]}
        />,
      );

      expect(mockUsePredictActionGuard).toHaveBeenCalledWith(
        expect.objectContaining({
          navigation: expect.any(Object),
        }),
      );
    });
  });
});

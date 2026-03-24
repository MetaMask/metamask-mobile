import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PredictPositionDetail from './PredictPositionDetail';
import {
  type PredictPosition as PredictPositionType,
  type PredictMarket,
  PredictMarketStatus,
  PredictPositionStatus,
  Recurrence,
  Side,
} from '../../types';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { PredictMarketDetailsSelectorsIDs } from '../../Predict.testIds';
import Routes from '../../../../../constants/navigation/Routes';

import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';
declare global {
  // eslint-disable-next-line no-var
  var __mockNavigate: jest.Mock;
}

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, vars?: Record<string, string | number>) => {
    switch (key) {
      case 'predict.market_details.won':
        return 'Won';
      case 'predict.market_details.lost':
        return 'Lost';
      case 'predict.cash_out':
        return 'Cash out';
      case 'predict.position_info':
        return `${vars?.initialValue} on ${vars?.outcome} to win ${vars?.shares}`;
      default:
        return key;
    }
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const mockNavigate = jest.fn() as jest.Mock;
  // expose for tests without out-of-scope reference
  global.__mockNavigate = mockNavigate;
  return {
    ...actualNav,
    useNavigation: () => ({ navigate: mockNavigate }),
    useIsFocused: () => true, // Mock as focused by default
  };
});

const mockExecuteGuardedAction = jest.fn(async (action) => await action());
jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: mockExecuteGuardedAction,
    isEligible: true,
  }),
}));

jest.mock('../../hooks/usePredictPositions', () => ({
  usePredictPositions: jest.fn(() => ({
    data: [],
    refetch: jest.fn(),
    isLoading: false,
    isRefetching: false,
    error: null,
  })),
}));

jest.mock('../../hooks/usePredictOrderPreview', () => ({
  usePredictOrderPreview: jest.fn(),
}));

const basePosition: PredictPositionType = {
  id: 'pos-1',
  providerId: POLYMARKET_PROVIDER_ID,
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '0',
  icon: 'https://example.com/icon.png',
  title: 'Will ETF be approved?',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 10,
  price: 0.67,
  status: PredictPositionStatus.OPEN,
  size: 10,
  cashPnl: 6.48,
  percentPnl: 5.25,
  initialValue: 123.45,
  currentValue: 129.93, // currentValue = initialValue * (1 + percentPnl/100) = 123.45 * 1.0525
  avgPrice: 0.34,
  claimable: false,
  endDate: '2025-12-31T00:00:00Z',
};

const baseMarket: PredictMarket = {
  id: 'market-1',
  providerId: POLYMARKET_PROVIDER_ID,
  slug: 'will-etf-be-approved',
  title: 'Will ETF be approved?',
  description: 'Test market',
  endDate: '2025-12-31T00:00:00Z',
  image: 'https://example.com/market.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: POLYMARKET_PROVIDER_ID,
      marketId: 'market-1',
      title: 'Yes',
      description: 'Yes outcome',
      image: 'https://example.com/yes.png',
      status: 'open',
      tokens: [{ id: '0', title: 'Yes', price: 0.34 }],
      volume: 1000,
      groupItemTitle: 'Group',
    },
    {
      id: 'outcome-2',
      providerId: POLYMARKET_PROVIDER_ID,
      marketId: 'market-1',
      title: 'No',
      description: 'No outcome',
      image: 'https://example.com/no.png',
      status: 'open',
      tokens: [{ id: '1', title: 'No', price: 0.66 }],
      volume: 1000,
      groupItemTitle: 'Group',
    },
  ],
  liquidity: 100000,
  volume: 200000,
};

const createState = (privacyMode = false) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        privacyMode,
      },
    },
  },
});

const renderComponent = (
  overrides?: Partial<PredictPositionType>,
  marketOverrides?: Partial<PredictMarket>,
  marketStatus: PredictMarketStatus = PredictMarketStatus.OPEN,
  previewOverrides?: { minAmountReceived?: number; error?: string | null },
  privacyMode = false,
) => {
  const position: PredictPositionType = {
    ...basePosition,
    ...overrides,
  } as PredictPositionType;
  const market: PredictMarket = {
    ...baseMarket,
    ...marketOverrides,
  } as PredictMarket;

  // Update preview mock if custom values provided
  if (previewOverrides) {
    const mockUsePredictOrderPreviewFn =
      usePredictOrderPreview as jest.MockedFunction<
        typeof usePredictOrderPreview
      >;
    const hasPreview =
      !previewOverrides.error && previewOverrides.minAmountReceived !== null;
    mockUsePredictOrderPreviewFn.mockReturnValue({
      preview: hasPreview
        ? {
            marketId: position.marketId,
            outcomeId: position.outcomeId,
            outcomeTokenId: position.outcomeTokenId,
            timestamp: Date.now(),
            side: Side.SELL,
            sharePrice: 0,
            maxAmountSpent: 0,
            minAmountReceived:
              previewOverrides.minAmountReceived ?? position.currentValue,
            slippage: 0,
            tickSize: 0,
            minOrderSize: 0,
            negRisk: false,
          }
        : null,
      error: previewOverrides.error ?? null,
      isCalculating: false,
      isLoading: false,
    });
  }

  return renderWithProvider(
    <PredictPositionDetail
      position={position}
      market={market}
      marketStatus={marketStatus}
    />,
    { state: createState(privacyMode) },
  );
};

describe('PredictPositionDetail', () => {
  const mockUsePredictOrderPreviewFn =
    usePredictOrderPreview as jest.MockedFunction<
      typeof usePredictOrderPreview
    >;

  beforeEach(() => {
    jest.useFakeTimers();
    global.__mockNavigate.mockClear();
    mockExecuteGuardedAction.mockClear();
    mockExecuteGuardedAction.mockImplementation(
      async (action) => await action(),
    );
    // Mock usePredictOrderPreview to return preview data matching position.currentValue
    mockUsePredictOrderPreviewFn.mockReturnValue({
      preview: {
        marketId: basePosition.marketId,
        outcomeId: basePosition.outcomeId,
        outcomeTokenId: basePosition.outcomeTokenId,
        timestamp: Date.now(),
        side: Side.SELL,
        sharePrice: 0,
        maxAmountSpent: 0,
        minAmountReceived: basePosition.currentValue,
        slippage: 0,
        tickSize: 0,
        minOrderSize: 0,
        negRisk: false,
      },
      error: null,
      isCalculating: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders open position with current value, percent change and cash out', () => {
    renderComponent();

    expect(screen.getByText('Group')).toBeOnTheScreen();
    expect(
      screen.getByText('$123.45 on Yes to win $10', { exact: false }),
    ).toBeOnTheScreen();

    expect(screen.getByText('$129.93')).toBeOnTheScreen();
    expect(screen.getByText('5.25%')).toBeOnTheScreen();
    expect(screen.getByText('Cash out')).toBeOnTheScreen();
  });

  it('hides open position monetary values when privacy mode is enabled', () => {
    renderComponent(undefined, undefined, undefined, undefined, true);

    expect(screen.queryByText('$123.45 on Yes to win $10')).toBeNull();
    expect(screen.queryByText('$129.93')).toBeNull();
    expect(screen.queryByText('5.25%')).toBeNull();
    expect(screen.getByText('••••••••••••')).toBeOnTheScreen();
    expect(screen.getAllByText('••••••').length).toBeGreaterThanOrEqual(2);
  });

  it.each([
    { value: -3.5, expected: '-3.5%' },
    { value: 0, expected: '0%' },
    { value: 7.5, expected: '7.5%' },
  ])('formats percentPnl %p as %p for open market', ({ value, expected }) => {
    const initialValue = basePosition.initialValue;
    const currentValue = initialValue * (1 + value / 100);

    renderComponent({ percentPnl: value, currentValue }, undefined, undefined, {
      minAmountReceived: currentValue,
    });

    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it('renders initial value line and avgPrice cents', () => {
    renderComponent({
      initialValue: 50,
      outcome: 'No',
      avgPrice: 0.7,
      outcomeId: 'outcome-2',
      outcomeTokenId: '1',
    });

    expect(screen.getByText('Group')).toBeOnTheScreen();
    expect(
      screen.getByText('$50 on No to win $10', { exact: false }),
    ).toBeOnTheScreen();
  });

  it('renders won result with current value when market is closed and percent positive', () => {
    renderComponent(
      { percentPnl: 12.34, currentValue: 500 },
      { status: 'closed' },
      PredictMarketStatus.CLOSED,
      { minAmountReceived: 500 },
    );

    expect(screen.getByText('Won $500')).toBeOnTheScreen();
    expect(screen.queryByText('+12.34%')).toBeNull();
    expect(screen.queryByText('Cash out')).toBeNull();
  });

  it('hides won or lost text amount when privacy mode is enabled', () => {
    renderComponent(
      { percentPnl: 12.34, currentValue: 500 },
      { status: 'closed' },
      PredictMarketStatus.CLOSED,
      { minAmountReceived: 500 },
      true,
    );

    expect(screen.queryByText('Won $500')).toBeNull();
    expect(screen.getByText('•••••••••')).toBeOnTheScreen();
  });

  it('renders lost result with initial value when market is closed and percent not positive', () => {
    renderComponent(
      { percentPnl: 0, initialValue: 321.09, currentValue: 0 },
      { status: 'closed' },
      PredictMarketStatus.CLOSED,
      { minAmountReceived: 0 },
    );

    expect(screen.getByText('Lost $321.09')).toBeOnTheScreen();
    expect(screen.queryByText('Cash out')).toBeNull();
  });

  it('navigates to sell preview with position and outcome on cash out', () => {
    renderComponent();

    fireEvent.press(screen.getByText('Cash out'));

    expect(global.__mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.MODALS.SELL_PREVIEW,
      expect.objectContaining({
        position: expect.objectContaining({ id: 'pos-1' }),
        outcome: expect.objectContaining({ id: 'outcome-1' }),
      }),
    );
  });

  describe('preview loading and error states', () => {
    it('shows skeleton for current value when preview is null', () => {
      mockUsePredictOrderPreviewFn.mockReturnValue({
        preview: null,
        error: null,
        isCalculating: true,
        isLoading: true,
      });

      renderComponent();

      // Should show skeletons instead of actual values
      expect(screen.queryByText('$129.93')).toBeNull();
      expect(screen.queryByText('5.25%')).toBeNull();
    });

    it('shows skeleton for percent PnL when preview is null', () => {
      mockUsePredictOrderPreviewFn.mockReturnValue({
        preview: null,
        error: null,
        isCalculating: true,
        isLoading: true,
      });

      renderComponent();

      // Should show skeletons instead of actual values
      expect(screen.queryByText('5.25%')).toBeNull();
    });

    it('falls back to position currentValue when preview has error', () => {
      mockUsePredictOrderPreviewFn.mockReturnValue({
        preview: null,
        error: 'Failed to fetch preview',
        isCalculating: false,
        isLoading: false,
      });

      renderComponent({ currentValue: 150, initialValue: 100 });

      // Should display position's currentValue when preview errors
      expect(screen.getByText('$150')).toBeOnTheScreen();
      // PnL should be calculated from position values: (150-100)/100 = 50%
      expect(screen.getByText('50%')).toBeOnTheScreen();
    });

    it('calculates PnL from position data when preview has error', () => {
      mockUsePredictOrderPreviewFn.mockReturnValue({
        preview: null,
        error: 'Network error',
        isCalculating: false,
        isLoading: false,
      });

      renderComponent({
        currentValue: 95,
        initialValue: 100,
        percentPnl: -5,
      });

      // Should show negative PnL calculated from position data
      expect(screen.getByText('$95')).toBeOnTheScreen();
      expect(screen.getByText('-5%')).toBeOnTheScreen();
    });
  });

  describe('optimistic updates UI', () => {
    it('hides current value when position is optimistic and market is open', () => {
      renderComponent({ optimistic: true, currentValue: 500 });

      expect(screen.queryByText('$500.00')).toBeNull();
    });

    it('hides percent PnL when position is optimistic and market is open', () => {
      renderComponent({ optimistic: true, percentPnl: 12.34 });

      expect(screen.queryByText('+12.34%')).toBeNull();
    });

    it('shows initial value and outcome when position is optimistic', () => {
      renderComponent({ optimistic: true, initialValue: 123.45 });

      expect(
        screen.getByText('$123.45 on Yes to win $10', { exact: false }),
      ).toBeOnTheScreen();
    });
  });

  it('disables cash out button when position is optimistic', () => {
    renderComponent({ optimistic: true });

    const cashOutButton = screen.getByTestId(
      PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON,
    );

    expect(cashOutButton).toHaveProp('disabled', true);
  });
});

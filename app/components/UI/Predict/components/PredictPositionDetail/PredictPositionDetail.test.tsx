import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictPositionDetail from './PredictPositionDetail';
import {
  type PredictPosition as PredictPositionType,
  type PredictMarket,
  PredictMarketStatus,
  PredictPositionStatus,
  Recurrence,
} from '../../types';

declare global {
  // eslint-disable-next-line no-var
  var __mockNavigate: jest.Mock;
}

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, vars?: Record<string, string | number>) => {
    switch (key) {
      case 'predict.market_details.amount_on_outcome':
        return `$${vars?.amount} on ${vars?.outcome}`;
      case 'predict.market_details.outcome_at_price':
        return `${vars?.outcome} at ${vars?.price}¢`;
      case 'predict.market_details.won':
        return 'Won';
      case 'predict.market_details.lost':
        return 'Lost';
      case 'predict.cash_out':
        return 'Cash out';
      default:
        return key;
    }
  },
}));

jest.mock('@react-navigation/native', () => {
  const mockNavigate = jest.fn() as jest.Mock;
  // expose for tests without out-of-scope reference
  global.__mockNavigate = mockNavigate;
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('../../../../../constants/navigation/Routes', () => ({
  __esModule: true,
  default: {
    PREDICT: {
      MODALS: {
        ROOT: 'PREDICT_MODALS_ROOT',
        SELL_PREVIEW: 'PREDICT_SELL_PREVIEW',
      },
    },
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const mockTw = Object.assign(
    jest.fn(() => ({})),
    {
      style: jest.fn(() => ({})),
    },
  );
  return {
    useTailwind: () => mockTw,
  };
});

const basePosition: PredictPositionType = {
  id: 'pos-1',
  providerId: 'polymarket',
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
  cashPnl: 100,
  percentPnl: 5.25,
  initialValue: 123.45,
  currentValue: 2345.67,
  avgPrice: 0.34,
  claimable: false,
  endDate: '2025-12-31T00:00:00Z',
};

const baseMarket: PredictMarket = {
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'will-etf-be-approved',
  title: 'Will ETF be approved?',
  description: 'Test market',
  endDate: '2025-12-31T00:00:00Z',
  image: 'https://example.com/market.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  categories: ['crypto'],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: 'polymarket',
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
      providerId: 'polymarket',
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

const renderComponent = (
  overrides?: Partial<PredictPositionType>,
  marketOverrides?: Partial<PredictMarket>,
  marketStatus: PredictMarketStatus = PredictMarketStatus.OPEN,
) => {
  const position: PredictPositionType = {
    ...basePosition,
    ...overrides,
  } as PredictPositionType;
  const market: PredictMarket = {
    ...baseMarket,
    ...marketOverrides,
  } as PredictMarket;
  return render(
    <PredictPositionDetail
      position={position}
      market={market}
      marketStatus={marketStatus}
    />,
  );
};

describe('PredictPositionDetail', () => {
  beforeEach(() => {
    global.__mockNavigate.mockClear();
  });

  it('renders open position with current value, percent change and cash out', () => {
    renderComponent();

    expect(screen.getByText('$123.45 on Yes')).toBeOnTheScreen();
    expect(screen.getByText('Yes at 34¢')).toBeOnTheScreen();

    expect(screen.getByText('$2,345.67')).toBeOnTheScreen();
    expect(screen.getByText('+5.25%')).toBeOnTheScreen();
    expect(screen.getByText('Cash out')).toBeOnTheScreen();
  });

  it.each([
    { value: -3.5, expected: '-3.50%' },
    { value: 0, expected: '0%' },
    { value: 7.5, expected: '+7.50%' },
  ])('formats percentPnl %p as %p for open market', ({ value, expected }) => {
    renderComponent({ percentPnl: value });

    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it('renders initial value line and avgPrice cents', () => {
    renderComponent({ initialValue: 50, outcome: 'No', avgPrice: 0.7 });

    expect(screen.getByText('$50.00 on No')).toBeOnTheScreen();
    expect(screen.getByText('No at 70¢')).toBeOnTheScreen();
  });

  it('renders won result with current value when market is closed and percent positive', () => {
    renderComponent(
      { percentPnl: 12.34, currentValue: 500 },
      { status: 'closed' },
      PredictMarketStatus.CLOSED,
    );

    expect(screen.getByText('Won $500.00')).toBeOnTheScreen();
    expect(screen.queryByText('+12.34%')).toBeNull();
    expect(screen.queryByText('Cash out')).toBeNull();
  });

  it('renders lost result with initial value when market is closed and percent not positive', () => {
    renderComponent(
      { percentPnl: 0, initialValue: 321.09 },
      { status: 'closed' },
      PredictMarketStatus.CLOSED,
    );

    expect(screen.getByText('Lost $321.09')).toBeOnTheScreen();
    expect(screen.queryByText('Cash out')).toBeNull();
  });

  it('navigates to sell preview with position and outcome on cash out', () => {
    renderComponent();

    fireEvent.press(screen.getByText('Cash out'));

    expect(global.__mockNavigate).toHaveBeenCalledWith('PREDICT_MODALS_ROOT', {
      screen: 'PREDICT_SELL_PREVIEW',
      params: expect.objectContaining({
        position: expect.objectContaining({ id: 'pos-1' }),
        outcome: expect.objectContaining({ id: 'outcome-1' }),
      }),
    });
  });
});

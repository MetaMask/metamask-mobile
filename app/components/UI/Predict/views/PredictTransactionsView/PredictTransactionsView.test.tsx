import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictTransactionsView from './PredictTransactionsView';
import { PredictActivityType } from '../../types';

// Shared mocks
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (className: string) => ({ className }),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  TextVariant: { BodySm: 'BodySm' },
}));

// Mock localization with param-aware strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn(
    (key: string, params?: Record<string, string | number | undefined>) => {
      switch (key) {
        case 'predict.transactions.no_transactions':
          return 'No transactions yet';
        case 'predict.transactions.buy_detail':
          return `${params?.amountUsd} on ${params?.outcome} • ${params?.priceCents}`;
        case 'predict.transactions.sell_detail':
          return `${params?.priceCents}`;
        case 'predict.transactions.claim_detail':
          return 'Claimed';
        default:
          return key;
      }
    },
  ),
}));

// Spy to capture items passed to PredictActivity
const mockRenderItem: jest.Mock = jest.fn();

jest.mock('../../components/PredictActivity/PredictActivity', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText, View: RNView } = jest.requireActual('react-native');
  const PredictActivityType = { BUY: 'BUY', SELL: 'SELL', CLAIM: 'CLAIM' };
  const MockComponent = ({
    item,
  }: {
    item: { id: string; detail: string };
  }) => {
    mockRenderItem(item);
    return ReactActual.createElement(
      RNView,
      { testID: `predict-activity-${item.id}` },
      ReactActual.createElement(RNText, null, item.detail),
    );
  };
  return { __esModule: true, default: MockComponent, PredictActivityType };
});

// Mock hook
jest.mock('../../hooks/usePredictActivity', () => ({
  usePredictActivity: jest.fn(() => ({ activity: [], isLoading: false })),
}));

const { usePredictActivity } = jest.requireMock(
  '../../hooks/usePredictActivity',
);

describe('PredictTransactionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading indicator when isLoading is true', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce({
      activity: [],
      isLoading: true,
    });

    render(<PredictTransactionsView />);

    expect(screen.getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('shows empty state when there are no items', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce({
      activity: [],
      isLoading: false,
    });

    render(<PredictTransactionsView />);

    expect(screen.getByText('No transactions yet')).toBeOnTheScreen();
  });

  it('renders list items mapped from activity entries', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce({
      isLoading: false,
      activity: [
        {
          id: 'a1',
          title: 'Market A',
          outcome: 'Yes',
          icon: 'https://example.com/a.png',
          entry: { type: 'buy', amount: 50, price: 0.34 },
        },
        {
          id: 'b2',
          title: 'Market B',
          outcome: 'No',
          icon: 'https://example.com/b.png',
          entry: { type: 'sell', amount: 12.3, price: 0.7 },
        },
        {
          id: 'c3',
          title: 'Market C',
          outcome: 'Yes',
          icon: 'https://example.com/c.png',
          entry: { type: 'claimWinnings', amount: 99.99 },
        },
        {
          id: 'd4',
          title: 'Market D',
          outcome: 'Yes',
          icon: 'https://example.com/d.png',
          entry: { type: 'unknown', amount: 1.23 },
        },
      ],
    });

    render(<PredictTransactionsView />);

    // Assert that our mocked PredictActivity rendered for each item
    expect(screen.getByTestId('predict-activity-a1')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-activity-b2')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-activity-c3')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-activity-d4')).toBeOnTheScreen();

    // Validate mapped props passed to PredictActivity for a sample of items
    const calls = mockRenderItem.mock.calls.map(
      (c: [unknown]) =>
        c[0] as {
          id: string;
          type: string;
          marketTitle: string;
          icon?: string;
          amountUsd: number;
          detail: string;
        },
    );

    const buyItem = calls.find((i) => i.id === 'a1');
    expect(buyItem).toBeDefined();
    if (!buyItem) return; // narrow for TS
    expect(buyItem.type).toBe(PredictActivityType.BUY);
    expect(buyItem.marketTitle).toBe('Market A');
    expect(buyItem.icon).toBe('https://example.com/a.png');
    expect(buyItem.amountUsd).toBe(50);
    expect(buyItem.detail).toBe('50 on Yes • 34¢');

    const sellItem = calls.find((i) => i.id === 'b2');
    expect(sellItem).toBeDefined();
    if (!sellItem) return;
    expect(sellItem.type).toBe(PredictActivityType.SELL);
    expect(sellItem.marketTitle).toBe('Market B');
    expect(sellItem.amountUsd).toBe(12.3);
    expect(sellItem.detail).toBe('70¢');

    const claimItem = calls.find((i) => i.id === 'c3');
    expect(claimItem).toBeDefined();
    if (!claimItem) return;
    expect(claimItem.type).toBe(PredictActivityType.CLAIM);
    expect(claimItem.marketTitle).toBe('Market C');
    expect(claimItem.amountUsd).toBe(99.99);
    expect(claimItem.detail).toBe('Claimed');

    const defaultItem = calls.find((i) => i.id === 'd4');
    expect(defaultItem).toBeDefined();
    if (!defaultItem) return;
    expect(defaultItem.type).toBe(PredictActivityType.CLAIM);
    expect(defaultItem.marketTitle).toBe('Market D');
    expect(defaultItem.amountUsd).toBe(0);
    expect(defaultItem.detail).toBe('Claimed');
  });
});

import React from 'react';
import { View, Text as RNText } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import HIP4MarketCard from './HIP4MarketCard';
import { HIP4MarketStatus, type HIP4Market } from '../../types/hip4-types';

// Mock design system components
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: string[]) => ({}),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({ children, testID, ...props }: Record<string, unknown>) => (
    <View testID={testID as string} {...props}>
      {children as React.ReactNode}
    </View>
  ),
  Text: ({ children, ...props }: Record<string, unknown>) => (
    <RNText {...props}>{children as React.ReactNode}</RNText>
  ),
  BoxAlignItems: { Center: 'center' },
  BoxFlexDirection: { Row: 'row', Column: 'column' },
  BoxJustifyContent: { Between: 'space-between' },
  TextColor: {
    TextDefault: 'default',
    TextAlternative: 'alternative',
    SuccessDefault: 'success',
    ErrorDefault: 'error',
    WarningDefault: 'warning',
  },
  TextVariant: {
    BodyMd: 'body-md',
    BodySm: 'body-sm',
    BodyXs: 'body-xs',
  },
  FontWeight: { Medium: 'medium' },
}));

jest.mock('../PerpsBadge', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const { Text } = jest.requireActual('react-native');
  return ({ type }: { type: string }) => (
    <Text testID="perps-badge">{type}</Text>
  );
});

const createMockMarket = (overrides?: Partial<HIP4Market>): HIP4Market => ({
  id: 'hip4-1',
  questionId: 1,
  title: 'Will BTC hit 200K by end of 2026?',
  description: 'Binary prediction on Bitcoin price.',
  status: HIP4MarketStatus.ACTIVE,
  outcomes: [
    {
      outcomeId: 10,
      name: 'BTC Price',
      description: 'Bitcoin prediction',
      sides: [
        {
          name: 'YES',
          tokenIndex: 1568,
          price: 0.65,
          bestBid: 0.64,
          bestAsk: 0.66,
        },
        {
          name: 'NO',
          tokenIndex: 1569,
          price: 0.35,
          bestBid: 0.34,
          bestAsk: 0.36,
        },
      ],
    },
  ],
  fallbackOutcome: 10,
  resolution: null,
  volume24h: 150000,
  endDate: '2026-12-31T00:00:00Z',
  tags: ['crypto', 'bitcoin', 'hyperliquid', 'hip-4'],
  ...overrides,
});

describe('HIP4MarketCard', () => {
  it('renders market title', () => {
    const { getByText } = render(
      <HIP4MarketCard market={createMockMarket()} />,
    );

    expect(getByText('Will BTC hit 200K by end of 2026?')).toBeTruthy();
  });

  it('renders YES and NO probabilities', () => {
    const { getByText } = render(
      <HIP4MarketCard market={createMockMarket()} />,
    );

    expect(getByText('Yes 65%')).toBeTruthy();
    expect(getByText('No 35%')).toBeTruthy();
  });

  it('renders volume', () => {
    const { getByText } = render(
      <HIP4MarketCard market={createMockMarket()} />,
    );

    expect(getByText('$150.0K vol')).toBeTruthy();
  });

  it('renders end date', () => {
    const { getByText } = render(
      <HIP4MarketCard market={createMockMarket()} />,
    );

    // Date format depends on locale, but should contain the date
    expect(getByText(/Ends/)).toBeTruthy();
  });

  it('renders PREDICTION badge', () => {
    const { getByTestId } = render(
      <HIP4MarketCard market={createMockMarket()} />,
    );

    expect(getByTestId('perps-badge')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const mockOnPress = jest.fn();
    const market = createMockMarket();
    const { getByTestId } = render(
      <HIP4MarketCard market={market} onPress={mockOnPress} />,
    );

    fireEvent.press(getByTestId(`hip4-market-card-${market.id}`));
    expect(mockOnPress).toHaveBeenCalledWith(market);
  });

  it('renders auction status badge when market is in auction', () => {
    const { getByText } = render(
      <HIP4MarketCard
        market={createMockMarket({ status: HIP4MarketStatus.AUCTION })}
      />,
    );

    expect(getByText('Auction')).toBeTruthy();
  });

  it('renders resolved status badge when market is resolved', () => {
    const { getByText } = render(
      <HIP4MarketCard
        market={createMockMarket({ status: HIP4MarketStatus.RESOLVED })}
      />,
    );

    expect(getByText('Resolved')).toBeTruthy();
  });

  it('does not render status badge for active markets', () => {
    const { queryByText } = render(
      <HIP4MarketCard market={createMockMarket()} />,
    );

    expect(queryByText('Auction')).toBeNull();
    expect(queryByText('Resolved')).toBeNull();
    expect(queryByText('Upcoming')).toBeNull();
  });

  it('does not render end date when not provided', () => {
    const { queryByText } = render(
      <HIP4MarketCard market={createMockMarket({ endDate: null })} />,
    );

    expect(queryByText(/Ends/)).toBeNull();
  });

  it('handles zero volume', () => {
    const { getByText } = render(
      <HIP4MarketCard market={createMockMarket({ volume24h: 0 })} />,
    );

    expect(getByText('$0 vol')).toBeTruthy();
  });

  it('formats large volume correctly', () => {
    const { getByText } = render(
      <HIP4MarketCard market={createMockMarket({ volume24h: 2500000 })} />,
    );

    expect(getByText('$2.5M vol')).toBeTruthy();
  });
});

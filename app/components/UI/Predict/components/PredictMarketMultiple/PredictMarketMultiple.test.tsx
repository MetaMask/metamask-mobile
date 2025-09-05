import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PredictMarketMultiple from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PredictEvent } from '../../types';
import Button from '../../../../../component-library/components/Buttons/Button';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  };
});

const mockEvent: PredictEvent = {
  id: 'test-event-1',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  markets: [
    {
      id: 'test-market-1',
      question: 'Will Bitcoin reach $150,000 by end of year?',
      groupItemTitle: 'Bitcoin Price Prediction',
      outcomes: '["Yes", "No"]',
      outcomePrices: '["0.65", "0.35"]',
      image: 'https://example.com/bitcoin.png',
      volume: '1000000',
      providerId: 'test-provider',
      status: 'open',
    },
  ],
  series: [],
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarket', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('should render market information correctly', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketMultiple event={mockEvent} />,
      { state: initialState },
    );

    expect(
      getByText('Will Bitcoin reach $150,000 by end of year?'),
    ).toBeOnTheScreen();

    expect(getByText('1 outcomes')).toBeOnTheScreen();
    expect(getByText('65.00%')).toBeOnTheScreen();
    expect(getByText(/\$1M.*Vol\./)).toBeOnTheScreen();
  });

  it('should navigate to market details when buttons are pressed', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictMarketMultiple event={mockEvent} />,
      { state: initialState },
    );

    const buttons = UNSAFE_getAllByType(Button);

    fireEvent.press(buttons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('PredictMarketDetails');

    fireEvent.press(buttons[1]);
    expect(mockNavigate).toHaveBeenCalledWith('PredictMarketDetails');
  });

  it('should handle missing or invalid market data gracefully', () => {
    const eventWithMissingData: PredictEvent = {
      ...mockEvent,
      markets: [
        {
          ...mockEvent.markets[0],
          groupItemTitle: '',
          volume: undefined,
          outcomes: 'invalid json',
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketMultiple event={eventWithMissingData} />,
      { state: initialState },
    );

    expect(
      getByText('Will Bitcoin reach $150,000 by end of year?'),
    ).toBeOnTheScreen();
    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
    expect(getByText('1 outcomes')).toBeOnTheScreen();
  });

  it('should handle multiple markets correctly', () => {
    const eventWithMultipleMarkets: PredictEvent = {
      ...mockEvent,
      markets: [
        {
          ...mockEvent.markets[0],
          id: 'market-1',
          groupItemTitle: 'Market 1',
        },
        {
          ...mockEvent.markets[0],
          id: 'market-2',
          groupItemTitle: 'Market 2',
          outcomes: '["Option A", "Option B"]',
          outcomePrices: '["0.75", "0.25"]',
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketMultiple event={eventWithMultipleMarkets} />,
      { state: initialState },
    );

    expect(getByText('2 outcomes')).toBeOnTheScreen();
    expect(getByText('Market 1')).toBeOnTheScreen();
    expect(getByText('Market 2')).toBeOnTheScreen();
    expect(getByText('75.00%')).toBeOnTheScreen();
  });
});

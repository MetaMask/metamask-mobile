import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PredictMarketMultiple from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PredictMarket, Recurrence } from '../../types';
import Button from '../../../../../component-library/components/Buttons/Button';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  };
});

// Mock hooks
const mockPlaceBuyOrder = jest.fn();
const mockUsePredictBuy = jest.fn();

jest.mock('../../hooks/usePredictBuy', () => ({
  usePredictBuy: () => mockUsePredictBuy(),
}));

const mockMarket: PredictMarket = {
  id: 'test-market-1',
  providerId: 'test-provider',
  slug: 'bitcoin-price-prediction',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  description: 'Predict whether Bitcoin will reach $150,000 by end of year',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  categories: ['crypto'],
  outcomes: [
    {
      id: 'outcome-1',
      marketId: 'test-market-1',
      title: 'Yes',
      description: 'Bitcoin will reach $150,000',
      image: 'https://example.com/bitcoin.png',
      status: 'open',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.65 },
        { id: 'token-no', title: 'No', price: 0.35 },
      ],
      volume: 1000000,
      groupItemTitle: 'Bitcoin Price Prediction',
    },
  ],
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarket', () => {
  beforeEach(() => {
    mockUsePredictBuy.mockReturnValue({
      placeBuyOrder: mockPlaceBuyOrder,
      loading: false,
      currentOrder: null,
      result: null,
      completed: false,
      error: undefined,
      reset: jest.fn(),
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockPlaceBuyOrder.mockClear();
  });

  it('should render market information correctly', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketMultiple market={mockMarket} />,
      { state: initialState },
    );

    expect(
      getByText('Will Bitcoin reach $150,000 by end of year?'),
    ).toBeOnTheScreen();

    expect(getByText('Bitcoin Price Prediction')).toBeOnTheScreen();
    expect(getByText('65.00%')).toBeOnTheScreen();
    expect(getByText(/\$1M.*Vol\./)).toBeOnTheScreen();
  });

  it('should call placeBuyOrder when buttons are pressed', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictMarketMultiple market={mockMarket} />,
      { state: initialState },
    );

    const buttons = UNSAFE_getAllByType(Button);

    fireEvent.press(buttons[0]);
    expect(mockPlaceBuyOrder).toHaveBeenCalledWith({
      size: 1,
      outcomeId: mockMarket.outcomes[0].id,
      outcomeTokenId: mockMarket.outcomes[0].tokens[0].id,
      market: mockMarket,
    });

    fireEvent.press(buttons[1]);
    expect(mockPlaceBuyOrder).toHaveBeenCalledWith({
      size: 1,
      outcomeId: mockMarket.outcomes[0].id,
      outcomeTokenId: mockMarket.outcomes[0].tokens[1].id,
      market: mockMarket,
    });
  });

  it('should handle missing or invalid market data gracefully', () => {
    const marketWithMissingData: PredictMarket = {
      ...mockMarket,
      outcomes: [
        {
          ...mockMarket.outcomes[0],
          groupItemTitle: '',
          volume: 0,
          tokens: [
            { id: 'token-empty-yes', title: '', price: 0 },
            { id: 'token-empty-no', title: '', price: 0 },
          ],
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketMultiple market={marketWithMissingData} />,
      { state: initialState },
    );

    expect(
      getByText('Will Bitcoin reach $150,000 by end of year?'),
    ).toBeOnTheScreen();
    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
  });

  it('should handle multiple outcomes correctly', () => {
    const marketWithMultipleOutcomes: PredictMarket = {
      ...mockMarket,
      outcomes: [
        {
          ...mockMarket.outcomes[0],
          id: 'outcome-1',
          groupItemTitle: 'Market 1',
        },
        {
          ...mockMarket.outcomes[0],
          id: 'outcome-2',
          groupItemTitle: 'Market 2',
          tokens: [
            { id: 'token-a', title: 'Option A', price: 0.75 },
            { id: 'token-b', title: 'Option B', price: 0.25 },
          ],
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketMultiple market={marketWithMultipleOutcomes} />,
      { state: initialState },
    );

    expect(getByText('Market 1')).toBeOnTheScreen();
    expect(getByText('Market 2')).toBeOnTheScreen();
    expect(getByText('75.00%')).toBeOnTheScreen();
  });
});

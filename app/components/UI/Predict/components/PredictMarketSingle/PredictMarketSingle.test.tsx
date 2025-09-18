import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictOutcome,
  Recurrence,
  PredictMarket as PredictMarketType,
} from '../../types';
import PredictMarketSingle from './';

// Mock Alert
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

// Mock hooks
const mockPlaceBuyOrder = jest.fn();
const mockUsePredictBuy = jest.fn();

jest.mock('../../hooks/usePredictBuy', () => ({
  usePredictBuy: () => mockUsePredictBuy(),
}));

const mockOutcome: PredictOutcome = {
  id: 'test-outcome-1',
  marketId: 'test-market-1',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  description: 'Bitcoin price prediction market',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  tokens: [
    {
      id: 'token-yes',
      title: 'Yes',
      price: 0.65,
    },
    {
      id: 'token-no',
      title: 'No',
      price: 0.35,
    },
  ],
  volume: 1000000,
  groupItemTitle: 'Crypto Markets',
  negRisk: false,
  tickSize: '0.01',
};

const mockMarket: PredictMarketType = {
  id: 'test-market-1',
  providerId: 'test-provider',
  slug: 'bitcoin-price-prediction',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  description: 'Bitcoin price prediction market',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  categories: ['crypto'],
  outcomes: [mockOutcome],
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarketSingle', () => {
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
    mockAlert.mockClear();
    mockPlaceBuyOrder.mockClear();
  });

  it('should render market information correctly', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    expect(
      getByText('Will Bitcoin reach $150,000 by end of year?'),
    ).toBeOnTheScreen();

    expect(getByText('65%')).toBeOnTheScreen();
    expect(getByText(/\$1M.*Vol\./)).toBeOnTheScreen();
  });

  it('should call placeBuyOrder when buttons are pressed', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText('Yes');
    const noButton = getByText('No');

    fireEvent.press(yesButton);
    expect(mockPlaceBuyOrder).toHaveBeenCalledWith({
      size: 1,
      outcomeId: mockOutcome.id,
      outcomeTokenId: mockOutcome.tokens[0].id,
      market: mockMarket,
    });

    fireEvent.press(noButton);
    expect(mockPlaceBuyOrder).toHaveBeenCalledWith({
      size: 1,
      outcomeId: mockOutcome.id,
      outcomeTokenId: mockOutcome.tokens[1].id,
      market: mockMarket,
    });
  });

  it('should handle missing or invalid market data gracefully', () => {
    const invalidOutcome: PredictOutcome = {
      ...mockOutcome,
      title: null as unknown as string, // This should trigger "Unknown Market"
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 }, // Empty tokens with 0 prices
        { id: 'token-no', title: 'No', price: 0 },
      ],
      volume: 0,
    };

    const invalidMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [invalidOutcome],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={invalidMarket} />,
      { state: initialState },
    );

    expect(getByText('Unknown Market')).toBeOnTheScreen();
    expect(getByText('0%')).toBeOnTheScreen();
    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
  });
});

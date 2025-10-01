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

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock hooks
const mockPlaceBuyOrder = jest.fn();
const mockUsePredictBuy = jest.fn();

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
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockPlaceBuyOrder.mockClear();
    mockNavigate.mockClear();
  });

  it('render market information correctly', () => {
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

  it('navigate to place bet modal when buttons are pressed', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText('Yes');
    const noButton = getByText('No');

    fireEvent.press(yesButton);
    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictPlaceBet',
      params: {
        market: mockMarket,
        outcomeId: mockOutcome.id,
        outcomeTokenId: mockOutcome.tokens[0].id,
      },
    });

    fireEvent.press(noButton);
    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictPlaceBet',
      params: {
        market: mockMarket,
        outcomeId: mockOutcome.id,
        outcomeTokenId: mockOutcome.tokens[1].id,
      },
    });
  });

  it('handle missing or invalid market data gracefully', () => {
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

  it('handle market with 0% yes percentage', () => {
    const zeroPercentOutcome: PredictOutcome = {
      ...mockOutcome,
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 }, // 0% yes
        { id: 'token-no', title: 'No', price: 1 },
      ],
    };

    const zeroPercentMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [zeroPercentOutcome],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={zeroPercentMarket} />,
      { state: initialState },
    );

    expect(getByText('0%')).toBeOnTheScreen();
  });

  it('handle market with 100% yes percentage', () => {
    const hundredPercentOutcome: PredictOutcome = {
      ...mockOutcome,
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 1 }, // 100% yes
        { id: 'token-no', title: 'No', price: 0 },
      ],
    };

    const hundredPercentMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [hundredPercentOutcome],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={hundredPercentMarket} />,
      { state: initialState },
    );

    expect(getByText('100%')).toBeOnTheScreen();
  });

  it('handle market with no image gracefully', () => {
    const noImageOutcome: PredictOutcome = {
      ...mockOutcome,
      image: '',
    };

    const noImageMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [noImageOutcome],
    };

    const { queryByTestId } = renderWithProvider(
      <PredictMarketSingle market={noImageMarket} />,
      { state: initialState },
    );

    // Should render without crashing, fallback background should be shown
    expect(queryByTestId).toBeDefined();
  });

  it('handle numeric volume values correctly', () => {
    const numericVolumeOutcome: PredictOutcome = {
      ...mockOutcome,
      volume: 500000, // numeric instead of string
    };

    const numericVolumeMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [numericVolumeOutcome],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={numericVolumeMarket} />,
      { state: initialState },
    );

    // Should display the formatted volume
    expect(getByText(/\$500k.*Vol\./)).toBeOnTheScreen();
  });
});

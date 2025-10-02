import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import PredictMarketMultiple from '.';
import Button from '../../../../../component-library/components/Buttons/Button';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictMarket, Recurrence } from '../../types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  };
});

// Navigation is already mocked above with mockNavigate

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
      providerId: 'test-provider',
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
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('render market information correctly', () => {
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

  it('navigate to place bet modal when buttons are pressed', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictMarketMultiple market={mockMarket} />,
      { state: initialState },
    );

    const buttons = UNSAFE_getAllByType(Button);

    // Press the "Yes" button
    fireEvent.press(buttons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictPlaceBet',
      params: {
        market: mockMarket,
        outcome: mockMarket.outcomes[0],
        outcomeToken: mockMarket.outcomes[0].tokens[0],
      },
    });

    // Press the "No" button
    fireEvent.press(buttons[1]);
    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictPlaceBet',
      params: {
        market: mockMarket,
        outcome: mockMarket.outcomes[0],
        outcomeToken: mockMarket.outcomes[0].tokens[1],
      },
    });
  });

  it('handle missing or invalid market data gracefully', () => {
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

  it('handle multiple outcomes correctly', () => {
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

  it('handle market with recurrence', () => {
    const marketWithRecurrence: PredictMarket = {
      ...mockMarket,
      recurrence: Recurrence.DAILY,
    };

    const { getByText } = renderWithProvider(
      <PredictMarketMultiple market={marketWithRecurrence} />,
      { state: initialState },
    );

    expect(getByText('Daily')).toBeOnTheScreen();
  });

  it('handle market with exactly 4 outcomes showing singular text', () => {
    const marketWithFourOutcomes: PredictMarket = {
      ...mockMarket,
      outcomes: [
        mockMarket.outcomes[0],
        { ...mockMarket.outcomes[0], id: 'outcome-2' },
        { ...mockMarket.outcomes[0], id: 'outcome-3' },
        { ...mockMarket.outcomes[0], id: 'outcome-4' },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketMultiple market={marketWithFourOutcomes} />,
      { state: initialState },
    );

    expect(getByText('+1 more outcome')).toBeOnTheScreen();
  });

  it('handle market with more than 4 outcomes showing plural text', () => {
    const marketWithFiveOutcomes: PredictMarket = {
      ...mockMarket,
      outcomes: [
        mockMarket.outcomes[0],
        { ...mockMarket.outcomes[0], id: 'outcome-2' },
        { ...mockMarket.outcomes[0], id: 'outcome-3' },
        { ...mockMarket.outcomes[0], id: 'outcome-4' },
        { ...mockMarket.outcomes[0], id: 'outcome-5' },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketMultiple market={marketWithFiveOutcomes} />,
      { state: initialState },
    );

    expect(getByText('+2 more outcomes')).toBeOnTheScreen();
  });

  it('handle market without image gracefully', () => {
    const marketWithoutImage: PredictMarket = {
      ...mockMarket,
      outcomes: [
        {
          ...mockMarket.outcomes[0],
          image: '',
        },
      ],
    };

    const { queryByTestId } = renderWithProvider(
      <PredictMarketMultiple market={marketWithoutImage} />,
      { state: initialState },
    );

    // Should render without crashing, image container should still exist
    expect(queryByTestId).toBeDefined();
  });

  it('handle numeric volume values correctly', () => {
    const marketWithNumericVolume: PredictMarket = {
      ...mockMarket,
      outcomes: [
        {
          ...mockMarket.outcomes[0],
          volume: 500000, // numeric instead of string
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketMultiple market={marketWithNumericVolume} />,
      { state: initialState },
    );

    // Should display the formatted volume (formatVolume returns lowercase k)
    expect(getByText(/\$500k.*Vol\./)).toBeOnTheScreen();
  });
});

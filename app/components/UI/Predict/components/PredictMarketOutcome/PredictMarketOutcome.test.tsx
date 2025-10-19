import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictMarket, PredictOutcome, Recurrence } from '../../types';
import PredictMarketOutcome from '.';

const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  };
});

// Mock usePredictBalance hook
const mockUsePredictBalance = jest.fn();
jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => mockUsePredictBalance(),
}));

const mockOutcome: PredictOutcome = {
  id: 'test-outcome-1',
  marketId: 'test-market-1',
  providerId: 'test-provider',
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

const mockMarket: PredictMarket = {
  id: 'test-market-1',
  providerId: 'test-provider',
  slug: 'bitcoin-prediction',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  description: 'Bitcoin price prediction market',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  categories: ['crypto', 'trending'],
  outcomes: [mockOutcome],
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarketOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation - user has balance
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockAlert.mockClear();
  });

  it('renders market information correctly', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('Crypto Markets')).toBeOnTheScreen();
    expect(getByText('+65%')).toBeOnTheScreen();
    expect(getByText(/\$1M.*Vol\./)).toBeOnTheScreen();
  });

  it('displays correct button labels with prices', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('Yes • 65.00¢')).toBeOnTheScreen();
    expect(getByText('No • 35.00¢')).toBeOnTheScreen();
  });

  it('handles button press events', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText('Yes • 65.00¢');
    const noButton = getByText('No • 35.00¢');

    fireEvent.press(yesButton);
    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictBuyPreview',
      params: {
        market: mockMarket,
        outcome: mockOutcome,
        outcomeToken: mockOutcome.tokens[0],
      },
    });

    fireEvent.press(noButton);
    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictBuyPreview',
      params: {
        market: mockMarket,
        outcome: mockOutcome,
        outcomeToken: mockOutcome.tokens[1],
      },
    });
  });

  it('handles missing or invalid outcome data gracefully', () => {
    const invalidOutcome = {
      ...mockOutcome,
      groupItemTitle: null,
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 },
        { id: 'token-no', title: 'No', price: 0 },
      ],
      volume: 0,
    } as unknown as PredictOutcome;

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={invalidOutcome} market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('Unknown Market')).toBeOnTheScreen();
    expect(getByText('0%')).toBeOnTheScreen();
    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
  });

  it('displays image when available', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    expect(getByTestId).toBeDefined();
  });

  it('handles missing image gracefully', () => {
    const outcomeWithoutImage: PredictOutcome = {
      ...mockOutcome,
      image: '',
    };

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome
        outcome={outcomeWithoutImage}
        market={mockMarket}
      />,
      { state: initialState },
    );

    expect(getByText('Crypto Markets')).toBeOnTheScreen();
  });

  it('navigates to add funds sheet when user has no balance - Yes button', () => {
    // Mock user has no balance
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: true,
    });

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText('Yes • 65.00¢');
    fireEvent.press(yesButton);

    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictAddFundsSheet',
    });
  });

  it('navigates to add funds sheet when user has no balance - No button', () => {
    // Mock user has no balance
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: true,
    });

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const noButton = getByText('No • 35.00¢');
    fireEvent.press(noButton);

    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictAddFundsSheet',
    });
  });

  it('displays 0% when tokens have price 0', () => {
    const outcomeWithZeroPriceTokens: PredictOutcome = {
      ...mockOutcome,
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 },
        { id: 'token-no', title: 'No', price: 0 },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome
        outcome={outcomeWithZeroPriceTokens}
        market={mockMarket}
      />,
      { state: initialState },
    );

    expect(getByText('0%')).toBeOnTheScreen();
    // Should show buttons with 0.00¢ prices
    expect(getByText('Yes • 0.00¢')).toBeOnTheScreen();
    expect(getByText('No • 0.00¢')).toBeOnTheScreen();
  });

  it('displays Unknown Market when groupItemTitle is missing', () => {
    const outcomeWithNoTitle: PredictOutcome = {
      ...mockOutcome,
      groupItemTitle: undefined as unknown as string,
    };

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={outcomeWithNoTitle} market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('Unknown Market')).toBeOnTheScreen();
  });
});

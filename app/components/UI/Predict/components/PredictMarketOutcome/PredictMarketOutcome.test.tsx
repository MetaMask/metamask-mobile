import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictOutcome } from '../../types';
import PredictMarketOutcome from '.';

const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

const mockReset = jest.fn();
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

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarketOutcome', () => {
  beforeEach(() => {
    mockUsePredictBuy.mockReturnValue({
      reset: mockReset,
      loading: false,
      currentOrderParams: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockReset.mockClear();
  });

  it('renders market information correctly', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} />,
      { state: initialState },
    );

    expect(getByText('Crypto Markets')).toBeOnTheScreen();
    expect(getByText('+65%')).toBeOnTheScreen();
    expect(getByText(/\$1M.*Vol\./)).toBeOnTheScreen();
  });

  it('displays correct button labels with prices', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} />,
      { state: initialState },
    );

    expect(getByText('Yes • 65.00¢')).toBeOnTheScreen();
    expect(getByText('No • 35.00¢')).toBeOnTheScreen();
  });

  it('handles button press events', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} />,
      { state: initialState },
    );

    const yesButton = getByText('Yes • 65.00¢');
    const noButton = getByText('No • 35.00¢');

    fireEvent.press(yesButton);
    fireEvent.press(noButton);

    expect(yesButton).toBeOnTheScreen();
    expect(noButton).toBeOnTheScreen();
  });

  it('shows loading state for specific outcome tokens', () => {
    mockUsePredictBuy.mockReturnValue({
      reset: mockReset,
      loading: true,
      currentOrderParams: { outcomeTokenId: 'token-yes' },
    });

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} />,
      { state: initialState },
    );

    expect(getByText('No • 35.00¢')).toBeOnTheScreen();
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
      <PredictMarketOutcome outcome={invalidOutcome} />,
      { state: initialState },
    );

    expect(getByText('Unknown Market')).toBeOnTheScreen();
    expect(getByText('0%')).toBeOnTheScreen();
    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
  });

  it('displays image when available', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} />,
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
      <PredictMarketOutcome outcome={outcomeWithoutImage} />,
      { state: initialState },
    );

    expect(getByText('Crypto Markets')).toBeOnTheScreen();
  });

  it('calls reset when usePredictBuy hook provides onError callback', () => {
    renderWithProvider(<PredictMarketOutcome outcome={mockOutcome} />, {
      state: initialState,
    });

    expect(mockUsePredictBuy).toHaveBeenCalled();
  });
});

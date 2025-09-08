import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import Button from '../../../../../component-library/components/Buttons/Button';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictOutcome } from '../../types';
import PredictMarket from './';

// Mock Alert
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

// Mock hooks
const mockPlaceBuyOrder = jest.fn();
const mockUsePredictBuy = jest.fn();
const mockUsePredictOrder = jest.fn();

jest.mock('../../hooks/usePredictBuy', () => ({
  usePredictBuy: () => mockUsePredictBuy(),
}));

jest.mock('../../hooks/usePredictOrder', () => ({
  usePredictOrder: () => mockUsePredictOrder(),
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
};

const mockProviderId = 'test-provider';

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarket', () => {
  beforeEach(() => {
    mockUsePredictBuy.mockReturnValue({
      placeBuyOrder: mockPlaceBuyOrder,
      isPlacing: false,
      currentOrder: null,
      lastResult: null,
      reset: jest.fn(),
    });

    mockUsePredictOrder.mockReturnValue({
      status: 'idle',
      currentTxHash: null,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockPlaceBuyOrder.mockClear();
  });

  it('should render market information correctly', () => {
    const { getByText } = renderWithProvider(
      <PredictMarket outcome={mockOutcome} providerId={mockProviderId} />,
      { state: initialState },
    );

    expect(
      getByText('Will Bitcoin reach $150,000 by end of year?'),
    ).toBeOnTheScreen();

    expect(getByText('65%')).toBeOnTheScreen();
    expect(getByText(/\$1M.*Vol\./)).toBeOnTheScreen();
  });

  it('should call placeBuyOrder when buttons are pressed', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictMarket outcome={mockOutcome} providerId={mockProviderId} />,
      { state: initialState },
    );

    const buttons = UNSAFE_getAllByType(Button);

    fireEvent.press(buttons[0]); // Yes button
    expect(mockPlaceBuyOrder).toHaveBeenCalledWith({
      amount: 1,
      marketId: mockOutcome.marketId,
      outcomeId: mockOutcome.id,
      outcomeTokenId: mockOutcome.tokens[0].id,
      providerId: mockProviderId,
    });

    fireEvent.press(buttons[1]); // No button
    expect(mockPlaceBuyOrder).toHaveBeenCalledWith({
      amount: 1,
      marketId: mockOutcome.marketId,
      outcomeId: mockOutcome.id,
      outcomeTokenId: mockOutcome.tokens[1].id,
      providerId: mockProviderId,
    });
  });

  it('should handle missing or invalid market data gracefully', () => {
    const outcomeWithMissingData: PredictOutcome = {
      ...mockOutcome,
      title: undefined as unknown as string,
      volume: 0,
      tokens: [
        {
          id: 'token-empty-yes',
          title: 'Yes',
          price: 0,
        },
        {
          id: 'token-empty-no',
          title: 'No',
          price: 0,
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarket
        outcome={outcomeWithMissingData}
        providerId={mockProviderId}
      />,
      { state: initialState },
    );

    expect(getByText('Unknown Market')).toBeOnTheScreen();
    expect(getByText('0%')).toBeOnTheScreen();
    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
  });
});

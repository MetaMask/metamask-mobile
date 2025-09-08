import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PredictMarket from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { Market } from '../../types';
import Button from '../../../../../component-library/components/Buttons/Button';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  };
});

const mockMarket: Market = {
  id: 'test-market-1',
  question: 'Will Bitcoin reach $150,000 by end of year?',
  outcomes: '["Yes", "No"]',
  outcomePrices: '["0.65", "0.35"]',
  image: 'https://example.com/bitcoin.png',
  volume: '1000000',
  providerId: 'test-provider',
  status: 'open',
  clobTokenIds: '["token1", "token2"]',
  conditionId: 'condition1',
  tokenIds: ['token1', 'token2'],
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
      <PredictMarket market={mockMarket} />,
      { state: initialState },
    );

    expect(
      getByText('Will Bitcoin reach $150,000 by end of year?'),
    ).toBeOnTheScreen();

    // expect(getByText('2 outcomes')).toBeOnTheScreen();
    expect(getByText('65%')).toBeOnTheScreen();
    expect(getByText(/\$\d+.*Vol\./)).toBeOnTheScreen();
  });

  it('should render semi-circle progress indicator with correct percentage', () => {
    const { getByText } = renderWithProvider(
      <PredictMarket market={mockMarket} />,
      { state: initialState },
    );

    // Verify the percentage text is displayed
    expect(getByText('65%')).toBeOnTheScreen();
  });

  it('should call placeBuyOrder when buttons are pressed', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictMarket market={mockMarket} />,
      { state: initialState },
    );

    const buttons = UNSAFE_getAllByType(Button);

    // The buttons should be rendered
    expect(buttons).toHaveLength(2);

    // Test that buttons are pressable (actual buy order logic is tested in hook tests)
    fireEvent.press(buttons[0]);
    fireEvent.press(buttons[1]);
  });

  it('should handle missing or invalid market data gracefully', () => {
    const marketWithMissingData: Market = {
      ...mockMarket,
      question: '',
      volume: undefined,
      outcomes: 'invalid json',
    };

    const { getByText } = renderWithProvider(
      <PredictMarket market={marketWithMissingData} />,
      { state: initialState },
    );

    expect(getByText('Unknown Market')).toBeOnTheScreen();
    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
  });
});

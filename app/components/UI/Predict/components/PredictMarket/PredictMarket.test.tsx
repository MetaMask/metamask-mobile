import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PredictMarket from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { Market } from '../../types';
import Button from '../../../../../component-library/components/Buttons/Button';

// Mock the navigation hook
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

  it('should render correctly', () => {
    const { getByText } = renderWithProvider(
      <PredictMarket market={mockMarket} />,
      { state: initialState },
    );

    expect(
      getByText('Will Bitcoin reach $150,000 by end of year?'),
    ).toBeTruthy();
    expect(getByText('65%')).toBeTruthy();
    expect(getByText('2 Outcomes')).toBeTruthy();
    expect(getByText('1,000,000 Vol.')).toBeTruthy();
  });

  it('should handle buy yes button press', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictMarket market={mockMarket} />,
      { state: initialState },
    );

    const buttons = UNSAFE_getAllByType(Button);
    fireEvent.press(buttons[0]);

    expect(buttons[0]).toBeTruthy();
    expect(mockNavigate).toHaveBeenCalledWith('PredictMarketDetails');
  });

  it('should handle buy no button press', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictMarket market={mockMarket} />,
      { state: initialState },
    );

    const buttons = UNSAFE_getAllByType(Button);
    fireEvent.press(buttons[1]);

    expect(buttons[1]).toBeTruthy();
    expect(mockNavigate).toHaveBeenCalledWith('PredictMarketDetails');
  });
});

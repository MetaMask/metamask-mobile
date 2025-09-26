import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsEmptyState } from './PerpsEmptyState';

describe('PerpsEmptyState', () => {
  const mockOnStartTrading = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = renderWithProvider(
      <PerpsEmptyState onStartTrading={mockOnStartTrading} />,
    );

    expect(
      getByText('Bet on price movements with up to 40x leverage.'),
    ).toBeDefined();
    expect(getByText('Start trading')).toBeTruthy();
  });

  it('should call onStartTrading when button is pressed', () => {
    const { getByText } = renderWithProvider(
      <PerpsEmptyState onStartTrading={mockOnStartTrading} />,
    );

    const startTradingButton = getByText('Start trading');
    fireEvent.press(startTradingButton);

    expect(mockOnStartTrading).toHaveBeenCalledTimes(1);
  });
});

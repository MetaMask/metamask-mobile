import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsEmptyState } from './PerpsEmptyState';

describe('PerpsEmptyState', () => {
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = renderWithProvider(
      <PerpsEmptyState onAction={mockOnAction} />,
    );

    expect(
      getByText('Bet on price movements with up to 40x leverage.'),
    ).toBeDefined();
    expect(getByText('Start trading')).toBeTruthy();
  });

  it('should call onAction when button is pressed', () => {
    const { getByText } = renderWithProvider(
      <PerpsEmptyState onAction={mockOnAction} />,
    );

    const startTradingButton = getByText('Start trading');
    fireEvent.press(startTradingButton);

    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });
});

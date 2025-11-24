import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import BalanceEmptyState from './BalanceEmptyState';
import { BalanceEmptyStateProps } from './BalanceEmptyState.types';

// Mock useRampNavigation hook
const mockGoToBuy = jest.fn();
jest.mock('../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(() => ({ goToBuy: mockGoToBuy })),
}));

describe('BalanceEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: Partial<BalanceEmptyStateProps> = {}) =>
    renderWithProvider(
      <BalanceEmptyState testID="balance-empty-state" {...props} />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId('balance-empty-state')).toBeDefined();
  });

  it('passes a twClassName to the Box component', () => {
    const { getByTestId } = renderComponent({ twClassName: 'mt-4' });
    expect(getByTestId('balance-empty-state')).toHaveStyle({
      marginTop: 16, // mt-4
    });
  });

  it('navigates to buy flow when action button is pressed', () => {
    const { getByTestId } = renderComponent();
    const actionButton = getByTestId('balance-empty-state-action-button');

    expect(actionButton).toBeDefined();

    fireEvent.press(actionButton);

    expect(mockGoToBuy).toHaveBeenCalled();
  });
});

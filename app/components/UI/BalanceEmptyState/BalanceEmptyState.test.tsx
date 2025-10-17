import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import BalanceEmptyState from './BalanceEmptyState';

// Mock navigation (component requires it)
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

describe('BalanceEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    renderWithProvider(<BalanceEmptyState testID="balance-empty-state" />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId('balance-empty-state')).toBeDefined();
  });

  it('has action button that can be pressed', () => {
    const { getByTestId } = renderComponent();
    const actionButton = getByTestId('balance-empty-state-action-button');

    expect(actionButton).toBeDefined();
    // Test that button press doesn't throw an error
    expect(() => fireEvent.press(actionButton)).not.toThrow();
  });

  it('calls custom onAction when provided', () => {
    const mockOnAction = jest.fn();
    const { getByTestId } = renderWithProvider(
      <BalanceEmptyState
        onAction={mockOnAction}
        testID="balance-empty-state"
      />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

    const actionButton = getByTestId('balance-empty-state-action-button');
    fireEvent.press(actionButton);

    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });
});

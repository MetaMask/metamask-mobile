import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import BalanceEmptyState from './BalanceEmptyState';
import { BalanceEmptyStateProps } from './BalanceEmptyState.types';

// Mock navigation (component requires it)
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
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

  it('has action button that can be pressed', () => {
    const { getByTestId } = renderComponent();
    const actionButton = getByTestId('balance-empty-state-action-button');

    expect(actionButton).toBeDefined();

    // Press the button
    fireEvent.press(actionButton);

    // Verify that navigation was triggered
    expect(mockNavigate).toHaveBeenCalled();
  });
});

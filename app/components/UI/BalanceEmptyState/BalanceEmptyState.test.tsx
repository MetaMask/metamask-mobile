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

// Mock buy navigation details
const mockBuyNavigationDetails = ['RampBuy', { screen: 'GetStarted' }];
jest.mock('../Ramp/Aggregator/routes/utils', () => ({
  createBuyNavigationDetails: jest.fn(() => mockBuyNavigationDetails),
}));

// Get the mock function to verify calls
const { createBuyNavigationDetails } = jest.requireMock(
  '../Ramp/Aggregator/routes/utils',
);

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

    // Press the button
    fireEvent.press(actionButton);

    // Verify that buy navigation details are created
    expect(createBuyNavigationDetails).toHaveBeenCalled();

    // Verify that navigation was triggered with buy flow parameters
    expect(mockNavigate).toHaveBeenCalledWith('RampBuy', {
      screen: 'GetStarted',
    });
  });
});

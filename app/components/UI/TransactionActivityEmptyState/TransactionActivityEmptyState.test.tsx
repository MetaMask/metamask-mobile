import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { TransactionActivityEmptyState } from './TransactionActivityEmptyState';

// Mock the navigation and swap bridge navigation
const mockGoToSwaps = jest.fn();
jest.mock('../Bridge/hooks/useSwapBridgeNavigation', () => ({
  SwapBridgeNavigationLocation: {
    TokenDetails: 'TokenDetails',
  },
}));

const { useSwapBridgeNavigation } = jest.requireMock(
  '../Bridge/hooks/useSwapBridgeNavigation',
);
useSwapBridgeNavigation.mockReturnValue({ goToSwaps: mockGoToSwaps });

describe('TransactionActivityEmptyState', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<TransactionActivityEmptyState />);
    expect(
      getByText('Nothing to see yet. Swap your first token today.'),
    ).toBeDefined();
    expect(getByText('Swap tokens')).toBeDefined();
  });

  it('should navigate to swap functionality when button is pressed', () => {
    const { getByText } = renderWithProvider(<TransactionActivityEmptyState />);

    const button = getByText('Swap tokens');
    fireEvent.press(button);

    expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
  });
});

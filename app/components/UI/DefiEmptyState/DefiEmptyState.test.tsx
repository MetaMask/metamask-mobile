import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { DefiEmptyState } from './DefiEmptyState';

// Mock the navigation hook
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
}));

describe('DefiEmptyState', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<DefiEmptyState />);
    expect(
      getByText('Lend, borrow, and trade, right in your wallet.'),
    ).toBeDefined();
    expect(getByText('Explore DeFi')).toBeDefined();
  });

  it('should navigate to explore tokens page in in-app browser', () => {
    const { getByText } = renderWithProvider(<DefiEmptyState />);

    const button = getByText('Explore DeFi');
    fireEvent.press(button);

    expect(mockNavigate).toHaveBeenCalledWith('BrowserTabHome', {
      screen: 'BrowserView',
      params: {
        newTabUrl:
          'https://portfolio.metamask.io/explore/tokens?MetaMaskEntry=mobile',
        timestamp: expect.any(Number),
      },
    });
  });
});

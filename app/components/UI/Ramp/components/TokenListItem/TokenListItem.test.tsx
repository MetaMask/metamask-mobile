import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TokenListItem from './TokenListItem';
import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';
import initialRootState from '../../../../../util/test/initial-root-state';

const mockGetTokenNetworkInfo = jest.fn();
jest.mock('../../hooks/useTokenNetworkInfo', () => ({
  ...jest.requireActual('../../hooks/useTokenNetworkInfo'),
  useTokenNetworkInfo: jest.fn(),
}));

const createMockToken = (
  overrides: Partial<DepositCryptoCurrency> = {},
): DepositCryptoCurrency => ({
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
  iconUrl: 'https://example.com/eth.png',
  ...overrides,
});

function render(component: React.ReactElement) {
  return renderWithProvider(component, {
    state: initialRootState,
  });
}

describe('TokenListItem', () => {
  const mockOnPress = jest.fn();
  const mockOnInfoPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTokenNetworkInfo.mockReturnValue({
      networkName: 'Ethereum Mainnet',
      depositNetworkName: undefined,
      networkImageSource: { uri: 'https://example.com/network.png' },
    });
    (useTokenNetworkInfo as jest.Mock).mockReturnValue(mockGetTokenNetworkInfo);
  });

  describe('basic rendering', () => {
    it('renders correctly and matches snapshot', () => {
      const token = createMockToken();

      const { toJSON } = render(
        <TokenListItem token={token} onPress={mockOnPress} />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('displays token name and symbol', () => {
      const token = createMockToken({ name: 'USD Coin', symbol: 'USDC' });

      const { getByText } = render(
        <TokenListItem token={token} onPress={mockOnPress} />,
      );

      expect(getByText('USD Coin')).toBeTruthy();
      expect(getByText('USDC')).toBeTruthy();
    });

    it('renders disabled token with info button and matches snapshot', () => {
      const token = createMockToken();

      const { toJSON } = render(
        <TokenListItem
          token={token}
          onPress={mockOnPress}
          isDisabled
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('info button visibility', () => {
    it('displays info button when isDisabled is true and onInfoPress is provided', () => {
      const token = createMockToken();

      const { getByTestId } = render(
        <TokenListItem
          token={token}
          onPress={mockOnPress}
          isDisabled
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByTestId('token-unsupported-info-button')).toBeTruthy();
    });

    it('hides info button when isDisabled is false', () => {
      const token = createMockToken();

      const { queryByTestId } = render(
        <TokenListItem
          token={token}
          onPress={mockOnPress}
          isDisabled={false}
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(queryByTestId('token-unsupported-info-button')).toBeNull();
    });

    it('hides info button when onInfoPress is not provided', () => {
      const token = createMockToken();

      const { queryByTestId } = render(
        <TokenListItem token={token} onPress={mockOnPress} isDisabled />,
      );

      expect(queryByTestId('token-unsupported-info-button')).toBeNull();
    });
  });

  describe('interaction', () => {
    it('calls onPress when list item is pressed', () => {
      const token = createMockToken();

      const { getByText } = render(
        <TokenListItem token={token} onPress={mockOnPress} />,
      );

      const tokenNameText = getByText(token.name);
      fireEvent.press(tokenNameText);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onInfoPress when info button is pressed', () => {
      const token = createMockToken();

      const { getByTestId } = render(
        <TokenListItem
          token={token}
          onPress={mockOnPress}
          isDisabled
          onInfoPress={mockOnInfoPress}
        />,
      );

      const infoButton = getByTestId('token-unsupported-info-button');
      fireEvent.press(infoButton);

      expect(mockOnInfoPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('network information', () => {
    it('calls useTokenNetworkInfo hook with token chainId', () => {
      const token = createMockToken({ chainId: 'eip155:137' });

      render(<TokenListItem token={token} onPress={mockOnPress} />);

      expect(mockGetTokenNetworkInfo).toHaveBeenCalledWith('eip155:137');
    });

    it('displays token with network information', () => {
      mockGetTokenNetworkInfo.mockReturnValue({
        networkName: 'Ethereum',
        depositNetworkName: 'Ethereum Mainnet',
        networkImageSource: { uri: 'https://example.com/network.png' },
      });
      const token = createMockToken({ name: 'USD Coin', symbol: 'USDC' });

      const { getByText } = render(
        <TokenListItem token={token} onPress={mockOnPress} />,
      );

      expect(getByText('USD Coin')).toBeTruthy();
      expect(getByText('USDC')).toBeTruthy();
    });
  });
});

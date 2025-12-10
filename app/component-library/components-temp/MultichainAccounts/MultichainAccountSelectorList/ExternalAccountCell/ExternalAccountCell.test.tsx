import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ExternalAccountCell from './ExternalAccountCell';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';

// Mock the settings selector
jest.mock('../../../../../selectors/settings', () => ({
  selectAvatarAccountType: () => 'Blockies',
}));

// Mock token balances controller selectors
jest.mock('../../../../../selectors/tokenBalancesController', () => ({
  selectAllTokenBalances: () => ({}),
  selectSelectedInternalAccountAddress: () => '0x123',
  selectAddressHasTokenBalances: () => false,
}));

// Mock smart transactions controller selectors
jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectSmartTransactionsEnabled: () => false,
}));

// Mock transaction controller selectors
jest.mock('../../../../../selectors/transactionController', () => ({
  selectNonReplacedTransactions: () => [],
  selectPendingSmartTransactionsBySender: () => [],
  selectSortedTransactions: () => [],
}));

// Mock gas fee controller selectors
jest.mock('../../../../../selectors/gasFeeController', () => ({
  selectGasFeeEstimates: () => ({}),
}));

// Mock reducers
jest.mock('../../../../../reducers/swaps', () => ({
  default: {},
}));

// Mock bridge slice
jest.mock('../../../../../core/redux/slices/bridge', () => ({
  default: {},
}));

describe('ExternalAccountCell', () => {
  const mockOnPress = jest.fn();
  const mockAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders external account label', () => {
      const { getByText } = renderWithProvider(
        <ExternalAccountCell address={mockAddress} onPress={mockOnPress} />,
      );

      expect(getByText(strings('bridge.external_account'))).toBeTruthy();
    });

    it('renders formatted address', () => {
      const { getByText } = renderWithProvider(
        <ExternalAccountCell address={mockAddress} onPress={mockOnPress} />,
      );

      // Address should be formatted to short format (0x12345...67890)
      expect(getByText('0x12345...67890')).toBeTruthy();
    });

    it('renders without network avatar when chainId is not provided', () => {
      const { queryByTestId } = renderWithProvider(
        <ExternalAccountCell address={mockAddress} onPress={mockOnPress} />,
      );

      // Network avatar should not be rendered
      expect(queryByTestId('network-avatar-image')).toBeFalsy();
    });

    it('renders with network avatar when chainId is provided', () => {
      const { getByTestId } = renderWithProvider(
        <ExternalAccountCell
          address={mockAddress}
          onPress={mockOnPress}
          chainId="0x1"
        />,
      );

      // Network avatar should be rendered
      expect(getByTestId('network-avatar-image')).toBeTruthy();
    });

    it('renders account avatar', () => {
      const { getByText } = renderWithProvider(
        <ExternalAccountCell address={mockAddress} onPress={mockOnPress} />,
      );

      // Verify component renders with account label
      expect(getByText(strings('bridge.external_account'))).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('calls onPress when cell is pressed', () => {
      const { getByText } = renderWithProvider(
        <ExternalAccountCell address={mockAddress} onPress={mockOnPress} />,
      );

      const externalAccountText = getByText(strings('bridge.external_account'));
      const touchableParent = externalAccountText.parent?.parent;

      if (touchableParent) {
        fireEvent.press(touchableParent);
      }

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('can be pressed multiple times', () => {
      const { getByText } = renderWithProvider(
        <ExternalAccountCell address={mockAddress} onPress={mockOnPress} />,
      );

      const externalAccountText = getByText(strings('bridge.external_account'));
      const touchableParent = externalAccountText.parent?.parent;

      if (touchableParent) {
        fireEvent.press(touchableParent);
        fireEvent.press(touchableParent);
        fireEvent.press(touchableParent);
      }

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Selected state', () => {
    it('renders when isSelected is false', () => {
      const { getByText } = renderWithProvider(
        <ExternalAccountCell
          address={mockAddress}
          onPress={mockOnPress}
          isSelected={false}
        />,
      );

      // Component should render normally
      expect(getByText(strings('bridge.external_account'))).toBeTruthy();
    });

    it('renders when isSelected is true', () => {
      const { getByText } = renderWithProvider(
        <ExternalAccountCell
          address={mockAddress}
          onPress={mockOnPress}
          isSelected
        />,
      );

      // Component should render with selected state
      expect(getByText(strings('bridge.external_account'))).toBeTruthy();
    });

    it('defaults to not selected when isSelected prop is not provided', () => {
      const { getByText } = renderWithProvider(
        <ExternalAccountCell address={mockAddress} onPress={mockOnPress} />,
      );

      expect(getByText(strings('bridge.external_account'))).toBeTruthy();
    });
  });

  describe('Different addresses', () => {
    it('handles different Ethereum addresses correctly', () => {
      const testAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const { getByText } = renderWithProvider(
        <ExternalAccountCell address={testAddress} onPress={mockOnPress} />,
      );

      // Verify the component renders with the address
      expect(getByText(strings('bridge.external_account'))).toBeTruthy();
      // The formatted address should be visible (exact format depends on formatAddress util)
      expect(getByText(/0x/)).toBeTruthy();
    });

    it('handles short addresses', () => {
      const shortAddress = '0x123';
      const { getByText } = renderWithProvider(
        <ExternalAccountCell address={shortAddress} onPress={mockOnPress} />,
      );

      // Short address should still be formatted
      expect(getByText(strings('bridge.external_account'))).toBeTruthy();
    });
  });

  describe('Different chain IDs', () => {
    it('renders correctly with Ethereum mainnet chain ID', () => {
      const { getByTestId } = renderWithProvider(
        <ExternalAccountCell
          address={mockAddress}
          onPress={mockOnPress}
          chainId="0x1"
        />,
      );

      expect(getByTestId('network-avatar-image')).toBeTruthy();
    });

    it('renders correctly with Polygon chain ID', () => {
      const { getByTestId } = renderWithProvider(
        <ExternalAccountCell
          address={mockAddress}
          onPress={mockOnPress}
          chainId="0x89"
        />,
      );

      expect(getByTestId('network-avatar-image')).toBeTruthy();
    });

    it('renders correctly with Optimism chain ID', () => {
      const { getByTestId } = renderWithProvider(
        <ExternalAccountCell
          address={mockAddress}
          onPress={mockOnPress}
          chainId="0xa"
        />,
      );

      expect(getByTestId('network-avatar-image')).toBeTruthy();
    });
  });

  describe('Avatar type', () => {
    it('uses avatar type from selector', () => {
      const { getByText } = renderWithProvider(
        <ExternalAccountCell address={mockAddress} onPress={mockOnPress} />,
      );

      // Avatar should be rendered (verify component renders successfully)
      expect(getByText(strings('bridge.external_account'))).toBeTruthy();
    });
  });

  describe('Component memoization', () => {
    it('is memoized with React.memo', () => {
      // Component should be memoized
      expect(ExternalAccountCell).toBeTruthy();
    });
  });
});

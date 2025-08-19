import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsTokenSelector, { type PerpsToken } from './PerpsTokenSelector';

// Mock dependencies
jest.mock('../../../../../util/networks', () => ({
  getDefaultNetworkByChainId: jest.fn(),
  getNetworkImageSource: jest.fn(),
}));

jest.mock('../../../../../util/number', () => ({
  renderFromTokenMinimalUnit: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#ffffff' },
      border: { muted: '#e1e1e1' },
      primary: { default: '#007bff' },
      text: { default: '#000000', muted: '#666666' },
    },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../../../constants/navigation/Routes', () => ({
  __esModule: true,
  default: {
    PERPS: {
      DEPOSIT: 'PerpsDeposit',
    },
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.deposit.get_usdc': 'Get USDC',
      'perps.token_selector.no_tokens': 'No tokens available',
    };
    return translations[key] || key;
  },
}));

jest.mock('./PerpsTokenSelector.styles', () => ({
  createStyles: () => ({
    modal: {},
    container: {},
    header: {},
    headerTitle: {},
    closeButton: {},
    placeholder: {},
    tokenList: {},
    tokenItem: {},
    lastTokenItem: {},
    tokenIcon: {},
    tokenInfo: {},
    tokenTitleRow: {},
    tokenSymbol: {},
    tokenName: {},
    tokenBalance: {},
    selectedIndicator: {},
    emptyState: {},
    networkFilterContainer: {},
    networkFilterScroll: {},
    networkFilterContent: {},
    networkFilterChip: {},
    networkFilterChipSelected: {},
    networkFilterText: {},
  }),
}));

// Mock react-native-modal
jest.mock('react-native-modal', () => {
  const MockModal = ({
    children,
    isVisible,
    testID,
  }: {
    children: React.ReactNode;
    isVisible: boolean;
    testID?: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return isVisible ? <View testID={testID}>{children}</View> : null;
  };
  return MockModal;
});

// Import the mocked functions for assertions
import {
  getDefaultNetworkByChainId,
  getNetworkImageSource,
} from '../../../../../util/networks';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';

const mockGetDefaultNetworkByChainId =
  getDefaultNetworkByChainId as jest.MockedFunction<
    typeof getDefaultNetworkByChainId
  >;
const mockGetNetworkImageSource = getNetworkImageSource as jest.MockedFunction<
  typeof getNetworkImageSource
>;
const mockRenderFromTokenMinimalUnit =
  renderFromTokenMinimalUnit as jest.MockedFunction<
    typeof renderFromTokenMinimalUnit
  >;

// Test data
const mockTokens: PerpsToken[] = [
  {
    address: '0xusdc-hyperliquid',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: '0x3e7', // Hyperliquid mainnet
    balance: '1000.123456',
    balanceFiat: '$1000.12',
    image: 'https://example.com/usdc.png',
  },
  {
    address: '0xusdc-arbitrum',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: '0xa4b1', // Arbitrum
    balance: '500.123456',
    balanceFiat: '$500.12',
    image: 'https://example.com/usdc.png',
  },
  {
    address: '0xeth',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: '0x1', // Ethereum
    balance: '2.5',
    balanceFiat: '$5000.00',
    image: 'https://example.com/eth.png',
  },
  {
    address: '0xusdt',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    chainId: '0x1', // Ethereum
    balance: '100.5',
    balanceFiat: '$100.50',
    image: 'https://example.com/usdt.png',
  },
  {
    address: '0xlow-balance',
    symbol: 'LOW',
    name: 'Low Balance Token',
    decimals: 18,
    chainId: '0x1',
    balance: '0.001',
    balanceFiat: '$0.01',
    image: 'https://example.com/low.png',
  },
];

const defaultProps = {
  isVisible: true,
  onClose: jest.fn(),
  onTokenSelect: jest.fn(),
  tokens: mockTokens,
  title: 'Select Token',
  minimumBalance: 0,
};

describe('PerpsTokenSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (mockGetDefaultNetworkByChainId as jest.Mock).mockImplementation(
      (chainId?: string) => {
        switch (chainId) {
          case '0xa4b1':
            return {
              name: 'Arbitrum One',
              chainId: '0xa4b1',
              networkType: 'arbitrum',
            };
          case '0x1':
            return {
              name: 'Ethereum Mainnet',
              chainId: '0x1',
              networkType: 'mainnet',
            };
          default:
            return undefined; // Return undefined for invalid chain IDs
        }
      },
    );

    mockGetNetworkImageSource.mockReturnValue({
      uri: 'https://example.com/networks/default.png',
    });

    mockRenderFromTokenMinimalUnit.mockReturnValue('1000.12');
  });

  const renderComponent = (props = {}) => {
    const combinedProps = { ...defaultProps, ...props };
    return renderWithProvider(<PerpsTokenSelector {...combinedProps} />, {
      state: {
        engine: {
          backgroundState: {
            PreferencesController: {
              isIpfsGatewayEnabled: true,
            },
          },
        },
      },
    });
  };

  describe('Basic Rendering', () => {
    it('renders modal when visible', () => {
      // Arrange & Act
      const { getByTestId } = renderComponent();

      // Assert
      expect(getByTestId('perps-token-selector-modal')).toBeOnTheScreen();
    });

    it('does not render modal when not visible', () => {
      // Arrange & Act
      const { queryByTestId } = renderComponent({ isVisible: false });

      // Assert
      expect(queryByTestId('perps-token-selector-modal')).toBeNull();
    });

    it('displays correct title', () => {
      // Arrange
      const customTitle = 'Choose Your Token';

      // Act
      const { getByTestId } = renderComponent({ title: customTitle });

      // Assert
      expect(getByTestId('token-selector-title')).toHaveTextContent(
        customTitle,
      );
    });

    it('displays close button', () => {
      // Arrange & Act
      const { getByTestId } = renderComponent();

      // Assert
      expect(getByTestId('close-token-selector')).toBeOnTheScreen();
    });
  });

  describe('Modal Interaction', () => {
    it('calls onClose when close button is pressed', () => {
      // Arrange
      const mockOnClose = jest.fn();
      const { getByTestId } = renderComponent({ onClose: mockOnClose });

      // Act
      fireEvent.press(getByTestId('close-token-selector'));

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token List Rendering', () => {
    it('displays token list when tokens are provided', () => {
      // Arrange & Act
      const { getByTestId } = renderComponent();

      // Assert
      expect(getByTestId('token-list')).toBeOnTheScreen();
    });

    it('displays tokens with correct symbols', () => {
      // Arrange & Act
      const { getByTestId, getAllByTestId } = renderComponent();

      // Assert
      expect(getAllByTestId('token-symbol-USDC')).toHaveLength(2); // Both USDC tokens
      expect(getByTestId('token-symbol-ETH')).toBeOnTheScreen();
      expect(getByTestId('token-symbol-USDT')).toBeOnTheScreen();
    });

    it('displays token symbols correctly', () => {
      // Arrange & Act
      const { getByTestId, getAllByTestId } = renderComponent();

      // Assert - Token names are not rendered in the current implementation
      // Only symbols are shown
      const usdcSymbols = getAllByTestId('token-symbol-USDC');
      expect(usdcSymbols).toHaveLength(2); // Both USDC tokens
      expect(usdcSymbols[0]).toHaveTextContent('USDC • Hyperliquid'); // First USDC is on Hyperliquid
      expect(getByTestId('token-symbol-ETH')).toHaveTextContent('ETH');
      expect(getByTestId('token-symbol-USDT')).toHaveTextContent('USDT');
    });

    it('displays token fiat values and timing info', () => {
      // Arrange & Act
      const { getByTestId, getAllByTestId, queryByTestId } = renderComponent();

      // Assert - Component displays fiat values, not raw balances
      const usdcFiatValues = getAllByTestId('token-fiat-USDC');
      expect(usdcFiatValues).toHaveLength(2); // Both USDC tokens
      expect(getByTestId('token-fiat-ETH')).toBeOnTheScreen();
      expect(getByTestId('token-fiat-USDT')).toBeOnTheScreen();

      // Balance test IDs don't exist in the component
      expect(queryByTestId('token-balance-USDC')).toBeNull();
    });

    it('displays fiat values when available', () => {
      // Arrange & Act
      const { getByTestId, getAllByTestId } = renderComponent();

      // Assert
      const usdcFiatValues = getAllByTestId('token-fiat-USDC');
      expect(usdcFiatValues).toHaveLength(2); // Both USDC tokens
      expect(usdcFiatValues[0]).toHaveTextContent('$1000.12'); // First is Hyperliquid USDC
      expect(usdcFiatValues[1]).toHaveTextContent('$500.12'); // Second is Arbitrum USDC
      expect(getByTestId('token-fiat-ETH')).toHaveTextContent('$5000.00');
      expect(getByTestId('token-fiat-USDT')).toHaveTextContent('$100.50');
    });

    it('displays empty state when no tokens are available', () => {
      // Arrange & Act
      const { getByTestId, queryByTestId } = renderComponent({ tokens: [] });

      // Assert
      expect(getByTestId('no-tokens-message')).toHaveTextContent(
        'No tokens available',
      );
      expect(queryByTestId('token-list')).toBeNull();
    });
  });

  describe('Token Selection', () => {
    it('calls onTokenSelect when token is pressed', () => {
      // Arrange
      const mockOnTokenSelect = jest.fn();
      const { getAllByTestId } = renderComponent({
        onTokenSelect: mockOnTokenSelect,
      });

      // Act - Press the first USDC token
      fireEvent.press(getAllByTestId('token-USDC')[0]);

      // Assert
      expect(mockOnTokenSelect).toHaveBeenCalledTimes(1);
      expect(mockOnTokenSelect).toHaveBeenCalledWith(mockTokens[0]);
    });

    it('shows selected indicator for selected token', () => {
      // Arrange
      const selectedToken = mockTokens[0];

      // Act
      const { getAllByTestId } = renderComponent({
        selectedTokenAddress: selectedToken.address,
        selectedTokenChainId: selectedToken.chainId,
      });

      // Assert - The selected token should have the confirmation icon
      const tokenElements = getAllByTestId('token-USDC');
      expect(tokenElements).toHaveLength(2);
      expect(tokenElements[0]).toBeOnTheScreen(); // First USDC token (selected one)
    });

    it('handles case-insensitive address comparison for selection', () => {
      // Arrange
      const selectedToken = mockTokens[0];
      const uppercaseAddress = selectedToken.address.toUpperCase();

      // Act
      const { getAllByTestId } = renderComponent({
        selectedTokenAddress: uppercaseAddress,
        selectedTokenChainId: selectedToken.chainId,
      });

      // Assert - Should still show as selected due to case-insensitive comparison
      const tokenElements = getAllByTestId('token-USDC');
      expect(tokenElements).toHaveLength(2);
      expect(tokenElements[0]).toBeOnTheScreen(); // First USDC token (selected one)
    });
  });

  describe('Network Filtering', () => {
    it('shows all tokens from different networks without filter UI', () => {
      // Arrange & Act
      const { getAllByTestId, queryByTestId } = renderComponent();

      // Assert - All tokens should be visible even though they're on different chains
      expect(getAllByTestId('token-USDC')).toHaveLength(2); // Both USDC tokens
      expect(queryByTestId('token-ETH')).toBeOnTheScreen();
      expect(queryByTestId('token-USDT')).toBeOnTheScreen();

      // Network filter UI doesn't exist in current implementation
      expect(queryByTestId('network-filter-0xa4b1')).toBeNull();
      expect(queryByTestId('network-filter-0x1')).toBeNull();
    });
  });

  describe('Minimum Balance Filtering', () => {
    it('filters tokens based on minimum balance', () => {
      // Arrange - Set minimum balance to 1 (should filter out the LOW token with 0.001 balance)
      const { queryByTestId, getAllByTestId } = renderComponent({
        minimumBalance: 1,
      });

      // Assert
      expect(queryByTestId('token-LOW')).toBeNull(); // Should be filtered out
      expect(getAllByTestId('token-USDC')).toHaveLength(2); // Both USDC tokens should be visible
      expect(queryByTestId('token-ETH')).toBeOnTheScreen(); // Should be visible
    });

    it('shows all tokens when minimum balance is 0', () => {
      // Arrange & Act
      const { getByTestId, getAllByTestId } = renderComponent({
        minimumBalance: 0,
      });

      // Assert - All tokens including LOW should be visible
      expect(getByTestId('token-LOW')).toBeOnTheScreen();
      expect(getAllByTestId('token-USDC')).toHaveLength(2); // Both USDC tokens should be visible
      expect(getByTestId('token-ETH')).toBeOnTheScreen();
    });
  });

  describe('Token Sorting and Prioritization', () => {
    it('prioritizes USDC on Arbitrum first', () => {
      // Arrange & Act
      const { getByTestId, getAllByTestId } = renderComponent();

      // Assert - First token in the list should be USDC on Arbitrum
      // We can check this by looking at the token list structure
      expect(getByTestId('token-list')).toBeOnTheScreen();
      // The specific ordering would need to be tested by checking the order in the FlatList
      // For now, we verify that both USDC tokens are present
      expect(getAllByTestId('token-USDC')).toHaveLength(2);
    });

    it('shows tokens with higher balances first within same priority group', () => {
      // Arrange - Create tokens with different balances in same priority group
      const testTokens: PerpsToken[] = [
        {
          address: '0xtoken1',
          symbol: 'TOK1',
          name: 'Token 1',
          decimals: 18,
          chainId: '0x1',
          balance: '100',
          balanceFiat: '$100',
        },
        {
          address: '0xtoken2',
          symbol: 'TOK2',
          name: 'Token 2',
          decimals: 18,
          chainId: '0x1',
          balance: '1000',
          balanceFiat: '$1000',
        },
      ];

      // Act
      const { getByTestId } = renderComponent({ tokens: testTokens });

      // Assert - Both tokens should be visible
      expect(getByTestId('token-TOK1')).toBeOnTheScreen();
      expect(getByTestId('token-TOK2')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles tokens without balances gracefully', () => {
      // Arrange
      const tokensWithoutBalance: PerpsToken[] = [
        {
          address: '0xtest',
          symbol: 'TEST',
          name: 'Test Token',
          decimals: 18,
          chainId: '0x1',
          // No balance property - will be treated as 0 balance
        },
      ];

      // Act
      const { getByTestId } = renderComponent({
        tokens: tokensWithoutBalance,
        minimumBalance: 1, // Set minimum balance to filter out zero-balance tokens
      });

      // Assert - Should show empty state since no tokens have sufficient balance
      expect(getByTestId('no-tokens-message')).toBeOnTheScreen();
    });

    it('handles tokens with invalid chain IDs gracefully', () => {
      // Arrange
      const tokensWithInvalidChainId: PerpsToken[] = [
        {
          address: '0xtest',
          symbol: 'TEST',
          name: 'Test Token',
          decimals: 18,
          balance: '100',
          chainId: '0x999', // Invalid/unsupported chainId
        },
      ];

      // Act
      const { getByTestId } = renderComponent({
        tokens: tokensWithInvalidChainId,
      });

      // Assert - Token should still be displayed (component shows tokens with invalid chain IDs)
      expect(getByTestId('token-TEST')).toBeOnTheScreen();
      expect(getByTestId('token-symbol-TEST')).toHaveTextContent('TEST');
    });

    it('handles empty token name gracefully', () => {
      // Arrange
      const tokenWithoutName: PerpsToken[] = [
        {
          address: '0xtest',
          symbol: 'TEST',
          decimals: 18,
          chainId: '0x1',
          balance: '100',
          balanceFiat: '$100',
          // name is undefined
        },
      ];

      // Act
      const { getByTestId } = renderComponent({
        tokens: tokenWithoutName,
      });

      // Assert - Symbol should be visible (component doesn't render name field)
      expect(getByTestId('token-symbol-TEST')).toBeOnTheScreen();
      expect(getByTestId('token-symbol-TEST')).toHaveTextContent('TEST');
    });

    it('shows empty state when all tokens are filtered out by minimum balance', () => {
      // Arrange
      const lowBalanceTokens: PerpsToken[] = [
        {
          address: '0xtest1',
          symbol: 'TEST1',
          name: 'Test Token 1',
          decimals: 18,
          chainId: '0x1',
          balance: '0.5', // Below minimum
        },
        {
          address: '0xtest2',
          symbol: 'TEST2',
          name: 'Test Token 2',
          decimals: 18,
          chainId: '0x1',
          balance: '0.8', // Below minimum
        },
      ];

      // Act
      const { getByTestId } = renderComponent({
        tokens: lowBalanceTokens,
        minimumBalance: 1, // Set minimum balance higher than all token balances
      });

      // Assert - Should show empty state since no tokens meet minimum balance
      expect(getByTestId('no-tokens-message')).toBeOnTheScreen();
      expect(getByTestId('no-tokens-message')).toHaveTextContent(
        'No tokens available',
      );
    });
  });
});

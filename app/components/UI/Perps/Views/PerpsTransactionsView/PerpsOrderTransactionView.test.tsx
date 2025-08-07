import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsOrderTransactionView from './PerpsOrderTransactionView';
import {
  usePerpsBlockExplorerUrl,
  usePerpsNetwork,
  usePerpsOrderFees,
} from '../../hooks';
import { PerpsTransactionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const mockTransaction = {
  id: 'order-123',
  type: 'order' as const,
  category: 'limit_order' as const,
  title: 'Long ETH limit',
  subtitle: '1.5 ETH',
  timestamp: 1640995200000,
  asset: 'ETH',
  order: {
    text: 'Filled',
    statusType: 'filled' as const,
    type: 'limit',
    size: '3000',
    limitPrice: 2000,
    filled: '100%',
  },
};

// Mock dependencies
const mockUseNavigation = jest.fn();
const mockUseRoute = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockUseNavigation(),
  useRoute: () => mockUseRoute(),
}));

jest.mock('react-redux', () => ({
  useSelector: () => mockUseSelector(),
}));

jest.mock('../../hooks', () => ({
  usePerpsNetwork: jest.fn(),
  usePerpsOrderFees: jest.fn(),
  usePerpsBlockExplorerUrl: jest.fn(),
}));

// Add the missing navbar mock
jest.mock('../../../Navbar', () => ({
  getPerpsTransactionsDetailsNavbar: jest.fn().mockReturnValue({}),
}));

describe('PerpsOrderTransactionView', () => {
  const mockUsePerpsNetwork = usePerpsNetwork as jest.MockedFunction<
    typeof usePerpsNetwork
  >;
  const mockUsePerpsOrderFees = usePerpsOrderFees as jest.MockedFunction<
    typeof usePerpsOrderFees
  >;
  const mockUsePerpsBlockExplorerUrl =
    usePerpsBlockExplorerUrl as jest.MockedFunction<
      typeof usePerpsBlockExplorerUrl
    >;

  // Mock selectedInternalAccount
  const mockSelectedInternalAccount = {
    id: 'test-account-id',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    type: 'eip155:eoa' as const,
    metadata: {
      name: 'Test Account',
      importTime: 1684232000456,
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: [
      'personal_sign',
      'eth_signTransaction',
      'eth_signTypedData_v1',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
    ],
    scopes: ['eip155:1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockUsePerpsBlockExplorerUrl.mockReturnValue({
      getExplorerUrl: jest.fn().mockImplementation((address) => {
        const network = mockUsePerpsNetwork();
        const baseUrl =
          network === 'testnet'
            ? 'https://app.hyperliquid-testnet.xyz'
            : 'https://app.hyperliquid.xyz';
        return `${baseUrl}/explorer/address/${
          address || '0x1234567890abcdef1234567890abcdef12345678'
        }`;
      }),
      baseExplorerUrl: 'https://app.hyperliquid.xyz/explorer',
    });
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 10.5,
      protocolFee: 7.5,
      metamaskFee: 3.0,
      protocolFeeRate: 0.1,
      metamaskFeeRate: 0.05,
      isLoadingMetamaskFee: false,
      error: null,
    });

    // Mock the route params
    mockUseRoute.mockReturnValue({
      params: { transaction: mockTransaction },
    });

    // Mock navigation
    mockUseNavigation.mockReturnValue({
      navigate: jest.fn(),
      setOptions: jest.fn(),
    });

    // Mock selectedInternalAccount by default
    mockUseSelector.mockReturnValue(mockSelectedInternalAccount);
  });

  it('should render order transaction details correctly', () => {
    const { getByText, getByTestId } = render(<PerpsOrderTransactionView />);

    expect(
      getByTestId(PerpsTransactionSelectorsIDs.ORDER_TRANSACTION_VIEW),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.TRANSACTION_DETAIL_ASSET_HERO),
    ).toBeTruthy();

    // Check transaction details
    expect(getByText('Date')).toBeTruthy();
    expect(getByText('Size')).toBeTruthy();
    expect(getByText('Limit price')).toBeTruthy();
    expect(getByText('Filled')).toBeTruthy();
    expect(getByText('100%')).toBeTruthy();
  });

  it('should render fee breakdown correctly', () => {
    const { getByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('MetaMask fee')).toBeTruthy();
    expect(getByText('Hyperliquid fee')).toBeTruthy();
    expect(getByText('Total fee')).toBeTruthy();
    expect(getByText('$3.00')).toBeTruthy();
    expect(getByText('$7.50')).toBeTruthy();
    expect(getByText('$10.50')).toBeTruthy();
  });

  it('should show zero fees when order is not filled', () => {
    const unfilledTransaction = {
      ...mockTransaction,
      order: {
        ...mockTransaction.order,
        text: 'Canceled',
        statusType: 'canceled' as const,
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: unfilledTransaction },
    });

    const { getAllByText } = render(<PerpsOrderTransactionView />);

    const zeroFees = getAllByText('$0');
    expect(zeroFees).toHaveLength(3); // All three fees should be $0
  });

  it('should handle small fees correctly', () => {
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 0.005,
      protocolFee: 0.003,
      metamaskFee: 0.002,
      protocolFeeRate: 0.1,
      metamaskFeeRate: 0.05,
      isLoadingMetamaskFee: false,
      error: null,
    });

    const { getByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('$0.002')).toBeTruthy();
    expect(getByText('$0.003')).toBeTruthy();
    expect(getByText('$0.005')).toBeTruthy();
  });

  it('should navigate to block explorer in browser tab when button is pressed', () => {
    const mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });

    const { getByTestId } = render(<PerpsOrderTransactionView />);

    const blockExplorerButton = getByTestId(
      PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON,
    );
    fireEvent.press(blockExplorerButton);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://app.hyperliquid.xyz/explorer/address/0x1234567890abcdef1234567890abcdef12345678',
      },
    });
  });

  it('should use testnet URL when network is testnet', () => {
    const mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });

    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { getByTestId } = render(<PerpsOrderTransactionView />);

    const blockExplorerButton = getByTestId(
      PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON,
    );
    fireEvent.press(blockExplorerButton);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://app.hyperliquid-testnet.xyz/explorer/address/0x1234567890abcdef1234567890abcdef12345678',
      },
    });
  });

  it('should not navigate to block explorer when no selected account', () => {
    const mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });

    mockUseSelector.mockReturnValue(null);

    const { getByTestId } = render(<PerpsOrderTransactionView />);

    const blockExplorerButton = getByTestId(
      PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON,
    );
    fireEvent.press(blockExplorerButton);

    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.BROWSER_TAB_HOME,
      expect.anything(),
    );
  });

  it('should render error message when transaction is not found', () => {
    mockUseRoute.mockReturnValue({
      params: { transaction: null },
    });

    const { getByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('Transaction not found')).toBeTruthy();
  });

  it('should format date correctly', () => {
    const { getByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('Date')).toBeTruthy();
    // The actual date format would depend on the formatTransactionDate utility
  });

  it('should handle different order types', () => {
    const marketOrderTransaction = {
      ...mockTransaction,
      order: {
        ...mockTransaction.order,
        type: 'market',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: marketOrderTransaction },
    });

    render(<PerpsOrderTransactionView />);

    // Should still render without errors for market orders
    expect(mockUsePerpsOrderFees).toHaveBeenCalledWith({
      orderType: 'market',
      amount: '3000',
    });
  });

  it('should handle missing order data gracefully', () => {
    const transactionWithoutOrder = {
      ...mockTransaction,
      order: undefined,
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: transactionWithoutOrder },
    });

    render(<PerpsOrderTransactionView />);

    expect(mockUsePerpsOrderFees).toHaveBeenCalledWith({
      orderType: 'market',
      amount: '0',
    });
  });

  it('should call usePerpsOrderFees with correct parameters', () => {
    render(<PerpsOrderTransactionView />);

    expect(mockUsePerpsOrderFees).toHaveBeenCalledWith({
      orderType: 'limit',
      amount: '3000',
    });
  });

  it('should set correct navigation options', () => {
    const mockSetOptions = jest.fn();
    mockUseNavigation.mockReturnValue({
      setOptions: mockSetOptions,
    });

    render(<PerpsOrderTransactionView />);

    expect(mockSetOptions).toHaveBeenCalled();
  });
});

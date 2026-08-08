import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsOrderTransactionView from './PerpsOrderTransactionView';
import {
  usePerpsBlockExplorerUrl,
  usePerpsNetwork,
  usePerpsRecordedOrderFees,
} from '../../hooks';
import { PerpsTransactionSelectorsIDs } from '../../Perps.testIds';

const mockTransaction = {
  id: 'order-123',
  type: 'order' as const,
  category: 'limit_order' as const,
  title: 'Long ETH limit',
  subtitle: '1.5 ETH',
  timestamp: 1640995200000,
  asset: 'ETH',
  order: {
    orderId: 'order-123',
    text: 'Filled',
    statusType: 'filled' as const,
    type: 'limit',
    size: '3000',
    limitPrice: 2000,
    filled: '100%',
  },
};

const mockUseNavigation = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockUseNavigation(),
  useRoute: () => mockUseRoute(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => ({
    address: '0x1234567890abcdef1234567890abcdef12345678',
  })),
}));

jest.mock('../../hooks', () => ({
  usePerpsNetwork: jest.fn(),
  usePerpsRecordedOrderFees: jest.fn(),
  usePerpsBlockExplorerUrl: jest.fn(),
}));

describe('PerpsOrderTransactionView', () => {
  const mockUsePerpsNetwork = usePerpsNetwork as jest.MockedFunction<
    typeof usePerpsNetwork
  >;
  const mockUsePerpsRecordedOrderFees =
    usePerpsRecordedOrderFees as jest.MockedFunction<
      typeof usePerpsRecordedOrderFees
    >;
  const mockUsePerpsBlockExplorerUrl =
    usePerpsBlockExplorerUrl as jest.MockedFunction<
      typeof usePerpsBlockExplorerUrl
    >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useSelector to return a function that returns the account
    (useSelector as jest.Mock).mockImplementation(() => () => ({
      address: '0x1234567890abcdef1234567890abcdef12345678',
    }));

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
    mockUsePerpsRecordedOrderFees.mockReturnValue({
      totalFee: 10.5,
      isLoading: false,
      hasError: false,
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
  });

  it('renders order transaction details correctly', () => {
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

  it('renders one total fee row from recorded fills', () => {
    const { getByText, queryByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('Total fee')).toBeTruthy();
    expect(getByText('$10.5')).toBeTruthy();
    expect(queryByText('MetaMask fee')).toBeNull();
    expect(queryByText('Hyperliquid fee')).toBeNull();
  });

  it('renders zero after a completed lookup finds no fills', () => {
    mockUsePerpsRecordedOrderFees.mockReturnValue({
      totalFee: 0,
      isLoading: false,
      hasError: false,
    });

    const { getByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('$0')).toBeTruthy();
  });

  it('renders a placeholder while recorded fills are loading', () => {
    mockUsePerpsRecordedOrderFees.mockReturnValue({
      totalFee: undefined,
      isLoading: true,
      hasError: false,
    });

    const { getByText, queryByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('—')).toBeTruthy();
    expect(queryByText('$0')).toBeNull();
  });

  it('renders a placeholder when recorded fills are unavailable', () => {
    mockUsePerpsRecordedOrderFees.mockReturnValue({
      totalFee: undefined,
      isLoading: false,
      hasError: true,
    });

    const { getByText, queryByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('—')).toBeTruthy();
    expect(queryByText('$0')).toBeNull();
  });

  it('shows exact recorded fee values below 0.01', () => {
    mockUsePerpsRecordedOrderFees.mockReturnValue({
      totalFee: 0.005,
      isLoading: false,
      hasError: false,
    });

    const { getByText, queryByText } = render(<PerpsOrderTransactionView />);

    expect(queryByText('< $0.01')).toBeNull();
    expect(getByText('$0.005')).toBeTruthy();
  });

  it('navigates to block explorer in browser tab when button is pressed', () => {
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

  it('uses testnet URL when network is testnet', () => {
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

  it('does not navigate to block explorer when no selected account', () => {
    const mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });

    // Mock useSelector to return null for no account
    (useSelector as jest.Mock).mockImplementationOnce(() => () => null);

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

  it('renders error message when transaction is not found', () => {
    mockUseRoute.mockReturnValue({
      params: { transaction: null },
    });

    const { getByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('Transaction not found')).toBeTruthy();
  });

  it('formats date correctly', () => {
    const { getByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('Date')).toBeTruthy();
    // The actual date format would depend on the formatTransactionDate utility
  });

  it('handles different order types', () => {
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

    expect(mockUsePerpsRecordedOrderFees).toHaveBeenCalledWith(
      'order-123',
      'ETH',
      1640995200000,
    );
  });

  it('handles missing order data gracefully', () => {
    const transactionWithoutOrder = {
      ...mockTransaction,
      order: undefined,
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: transactionWithoutOrder },
    });

    render(<PerpsOrderTransactionView />);

    expect(mockUsePerpsRecordedOrderFees).toHaveBeenCalledWith(
      undefined,
      'ETH',
      1640995200000,
    );
  });

  it('displays exact price for low-priced assets like PUMP instead of "< $0.01"', () => {
    // Arrange: Create a transaction with a very low limit price (typical for meme coins)
    const lowPriceTransaction = {
      ...mockTransaction,
      asset: 'PUMP',
      title: 'Long PUMP limit',
      order: {
        ...mockTransaction.order,
        limitPrice: 0.00234, // Price below $0.01
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: lowPriceTransaction },
    });

    // Act
    const { getByText, queryByText } = render(<PerpsOrderTransactionView />);

    // Assert: Should show the actual formatted price, not "< $0.01"
    expect(getByText('Limit price')).toBeTruthy();
    // The price should be formatted with PRICE_RANGES_UNIVERSAL showing actual value
    expect(queryByText('< $0.01')).toBeNull();
    // Should display the actual price with appropriate decimals (e.g., "$0.00234")
    expect(getByText('$0.00234')).toBeTruthy();
  });

  it('looks up recorded fees with the order ID and asset', () => {
    render(<PerpsOrderTransactionView />);

    expect(mockUsePerpsRecordedOrderFees).toHaveBeenCalledWith(
      'order-123',
      'ETH',
      1640995200000,
    );
  });

  it('sets correct navigation options', () => {
    const mockSetOptions = jest.fn();
    mockUseNavigation.mockReturnValue({
      setOptions: mockSetOptions,
    });

    render(<PerpsOrderTransactionView />);

    expect(mockSetOptions).toHaveBeenCalled();
  });
});

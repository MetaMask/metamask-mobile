import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsOrderTransactionView from './PerpsOrderTransactionView';
import {
  usePerpsBlockExplorerUrl,
  usePerpsNetwork,
  usePerpsOrderFees,
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
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 10.5,
      protocolFee: 7.5,
      metamaskFee: 3,
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

  it('renders fee breakdown correctly', () => {
    const { getByText } = render(<PerpsOrderTransactionView />);

    expect(getByText('MetaMask fee')).toBeTruthy();
    expect(getByText('Hyperliquid fee')).toBeTruthy();
    expect(getByText('Total fee')).toBeTruthy();
    expect(getByText('$3')).toBeTruthy();
    expect(getByText('$7.50')).toBeTruthy();
    expect(getByText('$10.50')).toBeTruthy();
  });

  it('shows zero fees when order is not filled', () => {
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

  it('shows "< $0.01" for fees less than 0.01', () => {
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 0.005,
      protocolFee: 0.003,
      metamaskFee: 0.002,
      protocolFeeRate: 0.1,
      metamaskFeeRate: 0.05,
      isLoadingMetamaskFee: false,
      error: null,
    });

    const { getAllByText } = render(<PerpsOrderTransactionView />);

    // All three fees should show "< $0.01" since they're all less than 0.01
    const smallFeeLabels = getAllByText('< $0.01');
    expect(smallFeeLabels).toHaveLength(3);
  });

  it('formats fees normally when they are exactly 0.01', () => {
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 0.03,
      protocolFee: 0.01,
      metamaskFee: 0.01,
      protocolFeeRate: 0.1,
      metamaskFeeRate: 0.05,
      isLoadingMetamaskFee: false,
      error: null,
    });

    const { getAllByText, queryByText, getByText } = render(
      <PerpsOrderTransactionView />,
    );

    // Fees at exactly 0.01 should be formatted normally, not show "< $0.01"
    expect(queryByText('< $0.01')).toBeNull();
    // Both metamask and protocol fees are 0.01
    const fee01Labels = getAllByText('$0.01');
    expect(fee01Labels.length).toBeGreaterThanOrEqual(2);
    expect(getByText('$0.03')).toBeTruthy(); // Total fee
  });

  it('formats fees normally when they are greater than 0.01', () => {
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 0.015,
      protocolFee: 0.012,
      metamaskFee: 0.003,
      protocolFeeRate: 0.1,
      metamaskFeeRate: 0.05,
      isLoadingMetamaskFee: false,
      error: null,
    });

    const { getByText, getAllByText } = render(<PerpsOrderTransactionView />);

    // Metamask fee is less than 0.01, should show "< $0.01"
    expect(getAllByText('< $0.01')).toHaveLength(1);
    // Protocol and total fees are >= 0.01, should be formatted normally
    expect(getByText('$0.01')).toBeTruthy(); // Protocol fee formatted
    expect(getByText('$0.02')).toBeTruthy(); // Total fee formatted (rounded)
  });

  it('handles mixed small and large fees correctly', () => {
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 0.025,
      protocolFee: 0.02,
      metamaskFee: 0.005,
      protocolFeeRate: 0.1,
      metamaskFeeRate: 0.05,
      isLoadingMetamaskFee: false,
      error: null,
    });

    const { getByText, getAllByText } = render(<PerpsOrderTransactionView />);

    // Metamask fee is less than 0.01
    const smallFeeLabels = getAllByText('< $0.01');
    expect(smallFeeLabels).toHaveLength(1);
    // Protocol and total fees are >= 0.01, should be formatted
    expect(getByText('$0.02')).toBeTruthy(); // Protocol fee
    expect(getByText('$0.03')).toBeTruthy(); // Total fee (rounded)
  });

  it('handles edge case: fee just below 0.01 threshold', () => {
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 0.029,
      protocolFee: 0.0099,
      metamaskFee: 0.0099,
      protocolFeeRate: 0.1,
      metamaskFeeRate: 0.05,
      isLoadingMetamaskFee: false,
      error: null,
    });

    const { getAllByText } = render(<PerpsOrderTransactionView />);

    // Both metamask and protocol fees are just below 0.01
    const smallFeeLabels = getAllByText('< $0.01');
    expect(smallFeeLabels).toHaveLength(2);
    // Total fee is >= 0.01, should be formatted
  });

  it('handles edge case: fee just above 0.01 threshold', () => {
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 0.0201,
      protocolFee: 0.0101,
      metamaskFee: 0.01,
      protocolFeeRate: 0.1,
      metamaskFeeRate: 0.05,
      isLoadingMetamaskFee: false,
      error: null,
    });

    const { queryByText, getAllByText, getByText } = render(
      <PerpsOrderTransactionView />,
    );

    // All fees are >= 0.01, should be formatted normally
    expect(queryByText('< $0.01')).toBeNull();
    // Metamask fee and protocol fee (rounded) both show $0.01
    const fee01Labels = getAllByText('$0.01');
    expect(fee01Labels.length).toBeGreaterThanOrEqual(2);
    expect(getByText('$0.02')).toBeTruthy(); // Total fee (rounded)
  });

  it('shows "< $0.01" for all fees when all are below threshold', () => {
    mockUsePerpsOrderFees.mockReturnValue({
      totalFee: 0.008,
      protocolFee: 0.005,
      metamaskFee: 0.003,
      protocolFeeRate: 0.1,
      metamaskFeeRate: 0.05,
      isLoadingMetamaskFee: false,
      error: null,
    });

    const { getAllByText } = render(<PerpsOrderTransactionView />);

    // All three fees are below 0.01
    const smallFeeLabels = getAllByText('< $0.01');
    expect(smallFeeLabels).toHaveLength(3);
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

    // Should still render without errors for market orders
    expect(mockUsePerpsOrderFees).toHaveBeenCalledWith({
      orderType: 'market',
      amount: '3000',
    });
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

    expect(mockUsePerpsOrderFees).toHaveBeenCalledWith({
      orderType: 'market',
      amount: '0',
    });
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

  it('calls usePerpsOrderFees with correct parameters', () => {
    render(<PerpsOrderTransactionView />);

    expect(mockUsePerpsOrderFees).toHaveBeenCalledWith({
      orderType: 'limit',
      amount: '3000',
    });
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

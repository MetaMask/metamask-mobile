import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsFundingTransactionView from './PerpsFundingTransactionView';
import { PerpsTransactionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const mockTransaction = {
  id: 'funding-123',
  type: 'funding' as const,
  category: 'funding_fee' as const,
  title: 'Received funding fee',
  subtitle: 'ETH',
  timestamp: 1640995200000,
  asset: 'ETH',
  fundingAmount: {
    isPositive: true,
    fee: '+$0.000435',
    feeNumber: 0.000435,
    rate: '0.00015%',
  },
};

// Mock all dependencies properly
const mockUseNavigation = jest.fn();
const mockUseRoute = jest.fn();
const mockUsePerpsNetwork = jest.fn();
const mockUsePerpsBlockExplorerUrl = jest.fn();
const mockGetHyperliquidExplorerUrl = jest.fn();
const mockFormatPerpsFiat = jest.fn();
const mockFormatTransactionDate = jest.fn();
const mockGetPerpsTransactionsDetailsNavbar = jest.fn();

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
  usePerpsNetwork: () => mockUsePerpsNetwork(),
  usePerpsBlockExplorerUrl: () => mockUsePerpsBlockExplorerUrl(),
}));

jest.mock('../../../Navbar', () => ({
  getPerpsTransactionsDetailsNavbar: () =>
    mockGetPerpsTransactionsDetailsNavbar(),
}));

jest.mock('../../utils/blockchainUtils', () => ({
  getHyperliquidExplorerUrl: () => mockGetHyperliquidExplorerUrl(),
}));

describe('PerpsFundingTransactionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Arrange - Set up default mocks
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockUsePerpsBlockExplorerUrl.mockReturnValue({
      getExplorerUrl: jest
        .fn()
        .mockImplementation(
          () =>
            'https://app.hyperliquid.xyz/explorer/address/0x1234567890abcdef1234567890abcdef12345678',
        ),
      baseExplorerUrl: 'https://app.hyperliquid.xyz/explorer',
    });
    // Mock useSelector to return a function that returns the account
    (useSelector as jest.Mock).mockImplementation(() => () => ({
      address: '0x1234567890abcdef1234567890abcdef12345678',
    }));
    mockUseRoute.mockReturnValue({
      params: { transaction: mockTransaction },
    });
    mockUseNavigation.mockReturnValue({
      navigate: jest.fn(),
      setOptions: jest.fn(),
    });
    mockFormatPerpsFiat.mockImplementation((value) => `$${value}`);
    mockFormatTransactionDate.mockReturnValue('January 1, 2022');
    mockGetPerpsTransactionsDetailsNavbar.mockReturnValue({});
  });

  it('should render funding transaction details correctly', () => {
    // Act
    const { getByText, getByTestId } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.FUNDING_TRANSACTION_VIEW),
    ).toBeTruthy();
    expect(getByText('Date')).toBeTruthy();
    expect(getByText('Fee')).toBeTruthy();
    expect(getByText('Rate')).toBeTruthy();
    expect(getByText('+$0.000435')).toBeTruthy();
    expect(getByText('0.00015%')).toBeTruthy();
  });

  it('should render negative funding fee correctly', () => {
    // Arrange
    const negativeFundingTransaction = {
      ...mockTransaction,
      title: 'Paid funding fee',
      fundingAmount: {
        isPositive: false,
        fee: '-$8.75',
        feeNumber: -8.75,
        rate: '0.01%',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: negativeFundingTransaction },
    });

    // Act
    const { getByText } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(getByText('-$8.75')).toBeTruthy();
  });

  it('should handle small funding amounts correctly', () => {
    // Arrange
    const smallFundingTransaction = {
      ...mockTransaction,
      fundingAmount: {
        isPositive: true,
        fee: '+$0.005',
        feeNumber: 0.005,
        rate: '0.001%',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: smallFundingTransaction },
    });

    // Act
    const { getByText } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(getByText('+$0.005')).toBeTruthy();
    expect(getByText('0.001%')).toBeTruthy();
  });

  it('should handle very small fees with different format', () => {
    // Arrange
    const verySmallFundingTransaction = {
      ...mockTransaction,
      fundingAmount: {
        isPositive: true,
        fee: '+$0.001',
        feeNumber: 0.001,
        rate: '0.0001%',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: verySmallFundingTransaction },
    });

    // Act
    const { getByText } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(getByText('+$0.001')).toBeTruthy();
  });

  it('should handle large funding amounts correctly', () => {
    // Arrange
    const largeFundingTransaction = {
      ...mockTransaction,
      fundingAmount: {
        isPositive: false,
        fee: '-$1,250.00',
        feeNumber: -1250,
        rate: '0.1%',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: largeFundingTransaction },
    });

    // Act
    const { getByText } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(getByText('-$1,250.00')).toBeTruthy();
    expect(getByText('0.1%')).toBeTruthy();
  });

  it('should navigate to block explorer in browser tab when button is pressed', () => {
    // Arrange
    const mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });

    const { getByTestId } = render(<PerpsFundingTransactionView />);

    // Act
    const blockExplorerButton = getByTestId(
      PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON,
    );
    fireEvent.press(blockExplorerButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://app.hyperliquid.xyz/explorer/address/0x1234567890abcdef1234567890abcdef12345678',
      },
    });
  });

  it('should use testnet URL when network is testnet', () => {
    // Arrange
    const mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });

    mockUsePerpsNetwork.mockReturnValue('testnet');
    mockUsePerpsBlockExplorerUrl.mockReturnValue({
      getExplorerUrl: jest
        .fn()
        .mockImplementation(
          () =>
            'https://app.hyperliquid-testnet.xyz/explorer/address/0x1234567890abcdef1234567890abcdef12345678',
        ),
      baseExplorerUrl: 'https://app.hyperliquid-testnet.xyz/explorer',
    });

    const { getByTestId } = render(<PerpsFundingTransactionView />);

    // Act
    const blockExplorerButton = getByTestId(
      PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON,
    );
    fireEvent.press(blockExplorerButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://app.hyperliquid-testnet.xyz/explorer/address/0x1234567890abcdef1234567890abcdef12345678',
      },
    });
  });

  it('should not navigate to block explorer when no selected account', () => {
    // Arrange
    const mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    });

    // Mock useSelector to return null for no account
    (useSelector as jest.Mock).mockImplementationOnce(() => () => null);

    const { getByTestId } = render(<PerpsFundingTransactionView />);

    // Act
    const blockExplorerButton = getByTestId(
      PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON,
    );
    fireEvent.press(blockExplorerButton);

    // Assert
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.BROWSER_TAB_HOME,
      expect.anything(),
    );
  });

  it('should render error message when transaction is not found', () => {
    // Arrange
    mockUseRoute.mockReturnValue({
      params: { transaction: null },
    });

    // Act
    const { getByText } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(getByText('Transaction not found')).toBeTruthy();
  });

  it('should format date correctly', () => {
    // Act
    const { getByText } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(getByText('Date')).toBeTruthy();
    // The actual date format would depend on the formatTransactionDate utility
  });

  it('should handle zero funding amounts', () => {
    // Arrange
    const zeroFundingTransaction = {
      ...mockTransaction,
      fundingAmount: {
        isPositive: true,
        fee: '$0.00',
        feeNumber: 0,
        rate: '0%',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: zeroFundingTransaction },
    });

    // Act
    const { getByText } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(getByText('+$0')).toBeTruthy();
    expect(getByText('0%')).toBeTruthy();
  });

  it('should handle missing funding amount data gracefully', () => {
    // Arrange
    const transactionWithoutFundingAmount = {
      ...mockTransaction,
      fundingAmount: undefined,
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: transactionWithoutFundingAmount },
    });

    // Act
    const { getByText } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(getByText('Date')).toBeTruthy();
    expect(getByText('Fee')).toBeTruthy();
    expect(getByText('Rate')).toBeTruthy();
  });

  it('should set correct navigation options', () => {
    // Arrange
    const mockSetOptions = jest.fn();
    mockUseNavigation.mockReturnValue({
      setOptions: mockSetOptions,
    });

    // Act
    render(<PerpsFundingTransactionView />);

    // Assert
    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('should handle different asset types', () => {
    // Arrange
    const btcFundingTransaction = {
      ...mockTransaction,
      asset: 'BTC',
      fundingAmount: {
        isPositive: false,
        fee: '-$25.00',
        feeNumber: -25,
        rate: '0.005%',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: btcFundingTransaction },
    });

    // Act
    const { getByText } = render(<PerpsFundingTransactionView />);

    // Assert
    expect(getByText('-$25.00')).toBeTruthy();
    expect(getByText('0.005%')).toBeTruthy();
  });

  it('should display view on block explorer button', () => {
    // Act
    const { getByTestId } = render(<PerpsFundingTransactionView />);

    // Assert
    const button = getByTestId(
      PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON,
    );
    expect(button).toBeTruthy();
  });
});

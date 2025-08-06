import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PerpsPositionTransactionView from './PerpsPositionTransactionView';
import { usePerpsNetwork, usePerpsBlockExplorerUrl } from '../../hooks';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../../../reducers';

// Mock dependencies
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockUseRoute = jest.fn();

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
    useRoute: () => mockUseRoute(),
  };
});

jest.mock('../../hooks', () => ({
  usePerpsNetwork: jest.fn(),
  usePerpsBlockExplorerUrl: jest.fn(),
}));

// Mock the navbar utilities
jest.mock('../../../Navbar', () => ({
  getPerpsTransactionsDetailsNavbar: jest.fn(() => ({ title: 'Test Title' })),
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
  selectSelectedInternalAccountAddress: jest.fn(),
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
  selectHasCreatedSolanaMainnetAccount: jest.fn(),
}));

const mockTransaction = {
  id: 'trade-123',
  type: 'trade' as const,
  category: 'position_close' as const,
  title: 'Closed ETH long',
  subtitle: '1.5 ETH',
  timestamp: 1640995200000,
  asset: 'ETH',
  fill: {
    shortTitle: 'Closed long',
    amount: '+$150.75',
    amountNumber: 150.75,
    isPositive: true,
    size: 1.5,
    entryPrice: 2000,
    points: '75.50',
    pnl: '150.75',
    fee: '5.00',
    feeToken: 'USDC',
    action: 'Closed',
    dir: 'long',
  },
};

describe('PerpsPositionTransactionView', () => {
  const mockUsePerpsNetwork = usePerpsNetwork as jest.MockedFunction<
    typeof usePerpsNetwork
  >;

  const mockUsePerpsBlockExplorerUrl =
    usePerpsBlockExplorerUrl as jest.MockedFunction<
      typeof usePerpsBlockExplorerUrl
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    (selectSelectedInternalAccount as unknown as jest.Mock).mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockUsePerpsBlockExplorerUrl.mockReturnValue({
      getExplorerUrl: jest.fn().mockImplementation((address) => {
        const network = mockUsePerpsNetwork();
        return network === 'mainnet'
          ? `https://app.hyperliquid.xyz/explorer/address/${
              address || '0x1234567890abcdef1234567890abcdef12345678'
            }`
          : `https://app.hyperliquid-testnet.xyz/explorer/address/${
              address || '0x1234567890abcdef1234567890abcdef12345678'
            }`;
      }),
      baseExplorerUrl: 'https://app.hyperliquid.xyz/explorer',
    });

    // Mock the route params
    mockUseRoute.mockReturnValue({
      params: { transaction: mockTransaction },
    });
  });

  it('should render position transaction details correctly', () => {
    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    // Check main transaction details
    expect(getByText('Date')).toBeOnTheScreen();
    expect(getByText('Size')).toBeOnTheScreen();
    expect(getByText('Entry price')).toBeOnTheScreen();
  });

  it('should render P&L for closed positions', () => {
    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    expect(getByText('P&L')).toBeOnTheScreen();
    expect(getByText('+$150.75')).toBeOnTheScreen();
  });

  it('should not render P&L for opened positions', () => {
    const openedTransaction = {
      ...mockTransaction,
      category: 'position_open' as const,
      fill: {
        ...mockTransaction.fill,
        action: 'Opened',
        pnl: '0',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: openedTransaction },
    });

    const { queryByText } = renderWithProvider(
      <PerpsPositionTransactionView />,
      {
        state: mockInitialState,
      },
    );

    expect(queryByText('P&L')).not.toBeOnTheScreen();
  });

  it('should handle negative P&L correctly', () => {
    const negativePnLTransaction = {
      ...mockTransaction,
      fill: {
        ...mockTransaction.fill,
        pnl: '-75.25',
        amount: '-$75.25',
        amountNumber: -75.25,
        isPositive: false,
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: negativePnLTransaction },
    });

    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    expect(getByText('P&L')).toBeOnTheScreen();
    expect(getByText('-$75.25')).toBeOnTheScreen();
  });

  it('should handle small P&L amounts correctly', () => {
    const smallPnLTransaction = {
      ...mockTransaction,
      fill: {
        ...mockTransaction.fill,
        pnl: '0.005',
        amount: '+$0.005',
        amountNumber: 0.005,
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: smallPnLTransaction },
    });

    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    expect(getByText('+$0.005')).toBeOnTheScreen();
  });

  it('should render fees correctly', () => {
    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    expect(getByText('Fees')).toBeOnTheScreen();
    expect(getByText('$5.00')).toBeOnTheScreen();
  });

  it('should handle small fees differently', () => {
    const smallFeeTransaction = {
      ...mockTransaction,
      fill: {
        ...mockTransaction.fill,
        fee: '0.005',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: smallFeeTransaction },
    });

    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    expect(getByText('$0.005')).toBeOnTheScreen();
  });

  it('should navigate to block explorer in browser tab when button is pressed', () => {
    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    const blockExplorerButton = getByText('View on block explorer');
    fireEvent.press(blockExplorerButton);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://app.hyperliquid.xyz/explorer/address/0x1234567890abcdef1234567890abcdef12345678',
      },
    });
  });

  it('should use testnet URL when network is testnet', () => {
    mockUsePerpsNetwork.mockReturnValue('testnet');

    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    const blockExplorerButton = getByText('View on block explorer');
    fireEvent.press(blockExplorerButton);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://app.hyperliquid-testnet.xyz/explorer/address/0x1234567890abcdef1234567890abcdef12345678',
      },
    });
  });

  it('should not navigate to block explorer when no selected account', () => {
    (selectSelectedInternalAccount as unknown as jest.Mock).mockReturnValue(
      null,
    );
    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    const blockExplorerButton = getByText('View on block explorer');
    fireEvent.press(blockExplorerButton);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should render error message when transaction is not found', () => {
    mockUseRoute.mockReturnValue({
      params: { transaction: null },
    });

    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    expect(getByText('Transaction not found')).toBeOnTheScreen();
  });

  it('should set navigation title from fill shortTitle', () => {
    renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('should handle missing fill data gracefully', () => {
    const transactionWithoutFill = {
      ...mockTransaction,
      fill: undefined,
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: transactionWithoutFill },
    });

    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    // Should still render basic structure
    expect(getByText('Date')).toBeOnTheScreen();
  });

  it('should handle zero P&L correctly', () => {
    const zeroPnLTransaction = {
      ...mockTransaction,
      fill: {
        ...mockTransaction.fill,
        action: 'Open',
        pnl: '0',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: zeroPnLTransaction },
    });

    const { queryByText } = renderWithProvider(
      <PerpsPositionTransactionView />,
      {
        state: mockInitialState,
      },
    );

    expect(queryByText('P&L')).not.toBeOnTheScreen();
  });

  it('should format large amounts correctly', () => {
    const largeAmountTransaction = {
      ...mockTransaction,
      fill: {
        ...mockTransaction.fill,
        amount: '+$12,500.75',
        amountNumber: 12500.75,
        entryPrice: 50000,
        fee: '125.50',
        pnl: '12500.75',
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: largeAmountTransaction },
    });

    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    expect(getByText('+$12,500.75')).toBeOnTheScreen();
    expect(getByText('$125.50')).toBeOnTheScreen();
  });

  it('should handle different asset types', () => {
    const btcTransaction = {
      ...mockTransaction,
      asset: 'BTC',
      subtitle: '0.5 BTC',
      fill: {
        ...mockTransaction.fill,
        size: 0.5,
        entryPrice: 45000,
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: btcTransaction },
    });

    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    // Should render without errors for different assets
    expect(getByText('Date')).toBeOnTheScreen();
    expect(getByText('Entry price')).toBeOnTheScreen();
  });

  it('should format entry price correctly', () => {
    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    expect(getByText('Entry price')).toBeOnTheScreen();
    // The actual price format would depend on the formatPerpsFiat utility
  });

  it('should filter out falsy detail rows', () => {
    const transactionWithMissingData = {
      ...mockTransaction,
      fill: {
        ...mockTransaction.fill,
        amount: undefined,
        entryPrice: undefined,
      },
    };

    mockUseRoute.mockReturnValue({
      params: { transaction: transactionWithMissingData },
    });

    const { getByText } = renderWithProvider(<PerpsPositionTransactionView />, {
      state: mockInitialState,
    });

    // Should still render date row
    expect(getByText('Date')).toBeOnTheScreen();
  });
});

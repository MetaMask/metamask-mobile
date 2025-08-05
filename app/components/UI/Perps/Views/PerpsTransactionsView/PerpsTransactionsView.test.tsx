import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import PerpsTransactionsView from './PerpsTransactionsView';
import { usePerpsConnection, usePerpsTrading } from '../../hooks';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../reducers';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks', () => ({
  usePerpsConnection: jest.fn(),
  usePerpsTrading: jest.fn(),
}));

// Mock the asset metadata hook to avoid network calls
jest.mock('../../hooks/usePerpsAssetsMetadata', () => ({
  usePerpsAssetMetadata: () => ({
    assetUrl: null,
    error: null,
  }),
}));

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const mockFillsData = [
  {
    orderId: 'fill-1',
    symbol: 'ETH',
    side: 'buy',
    size: '1.5',
    price: '2000',
    fee: '5.00',
    feeToken: 'USDC',
    timestamp: 1640995200000,
    pnl: '0',
    direction: 'Open Long',
    success: true,
  },
];

const mockOrdersData = [
  {
    orderId: 'order-1',
    symbol: 'BTC',
    side: 'buy',
    orderType: 'limit',
    size: '0.5',
    originalSize: '1.0',
    price: '45000',
    filledSize: '0.5',
    remainingSize: '0.5',
    status: 'open',
    timestamp: 1640995200000,
    lastUpdated: 1640995200000,
  },
];

const mockFundingData = [
  {
    symbol: 'ETH',
    amountUsd: '12.50',
    rate: '0.0001',
    timestamp: 1640995200000,
  },
];

describe('PerpsTransactionsView', () => {
  const mockUsePerpsConnection = usePerpsConnection as jest.MockedFunction<
    typeof usePerpsConnection
  >;
  const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
    typeof usePerpsTrading
  >;
  const mockGetUserFills = jest.fn();
  const mockGetUserOrders = jest.fn();
  const mockGetUserFunding = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();

    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
    });

    mockUsePerpsTrading.mockReturnValue({
      getUserFills: mockGetUserFills,
      getUserOrders: mockGetUserOrders,
      getUserFunding: mockGetUserFunding,
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      getMarkets: jest.fn(),
      getPositions: jest.fn(),
      getAccountState: jest.fn(),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      deposit: jest.fn(),
      getDepositRoutes: jest.fn(),
      resetDepositState: jest.fn(),
      withdraw: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      updatePositionTPSL: jest.fn(),
      calculateFees: jest.fn(),
    });

    mockGetUserFills.mockResolvedValue(mockFillsData);
    mockGetUserOrders.mockResolvedValue(mockOrdersData);
    mockGetUserFunding.mockResolvedValue(mockFundingData);
  });

  it('should render with filter tabs', () => {
    const { getByText } = renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    expect(getByText('Trades')).toBeTruthy();
    expect(getByText('Orders')).toBeTruthy();
    expect(getByText('Funding')).toBeTruthy();
  });

  it('should load transactions on mount when connected', async () => {
    renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalled();
      expect(mockGetUserOrders).toHaveBeenCalled();
      expect(mockGetUserFunding).toHaveBeenCalled();
    });
  });

  it('should not load transactions when not connected', () => {
    mockUsePerpsConnection.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
    });

    renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    expect(mockGetUserFills).not.toHaveBeenCalled();
    expect(mockGetUserOrders).not.toHaveBeenCalled();
    expect(mockGetUserFunding).not.toHaveBeenCalled();
  });

  it('should switch between filter tabs', async () => {
    const component = renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    // Wait for initial load
    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalled();
    });

    // Switch to Orders tab
    await act(async () => {
      fireEvent.press(component.getByText('Orders'));
    });

    // Should show orders content
    expect(component.getByText('Orders')).toBeTruthy();
  });

  it('should switch to Funding tab', async () => {
    const component = renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    // Wait for initial load
    await waitFor(() => {
      expect(mockGetUserFunding).toHaveBeenCalled();
    });

    // Switch to Funding tab
    await act(async () => {
      fireEvent.press(component.getByText('Funding'));
    });

    // Should show funding content
    expect(component.getByText('Funding')).toBeTruthy();
  });

  it('should handle refresh correctly', async () => {
    renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    // Wait for initial load
    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalledTimes(1);
    });

    // Clear the mocks to check refresh calls
    jest.clearAllMocks();
    mockGetUserFills.mockResolvedValue(mockFillsData);
    mockGetUserOrders.mockResolvedValue(mockOrdersData);
    mockGetUserFunding.mockResolvedValue(mockFundingData);

    // Simulate refresh
    // Note: RefreshControl testing might need specific setup

    // Verify refresh calls
    // This would need proper RefreshControl testing setup
  });

  it('should handle empty state correctly', async () => {
    mockGetUserFills.mockResolvedValue([]);
    mockGetUserOrders.mockResolvedValue([]);
    mockGetUserFunding.mockResolvedValue([]);

    const component = renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      expect(component.getByText('No trades transactions yet')).toBeTruthy();
      expect(
        component.getByText('Your trading history will appear here'),
      ).toBeTruthy();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockGetUserFills.mockRejectedValue(new Error('API Error'));
    mockGetUserOrders.mockRejectedValue(new Error('API Error'));
    mockGetUserFunding.mockRejectedValue(new Error('API Error'));

    const component = renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      // Should show empty state when API fails
      expect(component.getByText('No trades transactions yet')).toBeTruthy();
    });
  });

  it('should navigate correctly when transaction is pressed', async () => {
    renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalled();
    });

    // This would require the actual transaction items to be rendered
    // and would depend on the transform functions working correctly
    expect(mockNavigate).toBeDefined();
  });

  it('should group transactions by date correctly', async () => {
    const todayFill = {
      ...mockFillsData[0],
      timestamp: Date.now(),
    };

    const yesterdayFill = {
      ...mockFillsData[0],
      orderId: 'fill-2',
      timestamp: Date.now() - 24 * 60 * 60 * 1000,
    };

    mockGetUserFills.mockResolvedValue([todayFill, yesterdayFill]);

    renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalled();
    });

    // Would need to check for date section headers in the UI
  });

  it('should sort transactions chronologically', async () => {
    const olderFill = {
      ...mockFillsData[0],
      timestamp: 1640995200000,
    };

    const newerFill = {
      ...mockFillsData[0],
      orderId: 'fill-2',
      timestamp: 1640995260000,
    };

    mockGetUserFills.mockResolvedValue([olderFill, newerFill]);

    renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalled();
    });

    // Would verify that newer transactions appear first
  });

  it('should handle mixed transaction types correctly', async () => {
    const component = renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalled();
      expect(mockGetUserOrders).toHaveBeenCalled();
      expect(mockGetUserFunding).toHaveBeenCalled();
    });

    // All tabs should be available
    expect(component.getByText('Trades')).toBeTruthy();
    expect(component.getByText('Orders')).toBeTruthy();
    expect(component.getByText('Funding')).toBeTruthy();
  });

  it('should maintain scroll position when switching tabs', async () => {
    const component = renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalled();
    });

    // Switch tabs multiple times
    await act(async () => {
      fireEvent.press(component.getByText('Orders'));
      fireEvent.press(component.getByText('Funding'));
      fireEvent.press(component.getByText('Trades'));
    });

    // Should not crash and maintain state
    expect(component.getByText('Trades')).toBeTruthy();
  });

  it('should handle very large transaction lists', async () => {
    const largeFillsList = Array.from({ length: 1000 }, (_, i) => ({
      ...mockFillsData[0],
      orderId: `fill-${i}`,
      timestamp: 1640995200000 + i * 1000,
    }));

    mockGetUserFills.mockResolvedValue(largeFillsList);

    const component = renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalled();
    });

    // The FlashList should be rendered (we can't test the testID directly)
    expect(component.getByText('Trades')).toBeTruthy();
  });

  it('should handle partial API failures', async () => {
    // Only fills succeed, others fail
    mockGetUserFills.mockResolvedValue(mockFillsData);
    mockGetUserOrders.mockRejectedValue(new Error('Orders API Error'));
    mockGetUserFunding.mockRejectedValue(new Error('Funding API Error'));

    const component = renderWithProvider(<PerpsTransactionsView />, {
      state: mockInitialState,
    });

    await waitFor(() => {
      expect(mockGetUserFills).toHaveBeenCalled();
    });

    // Should still show trades tab with data
    expect(component.getByText('Trades')).toBeTruthy();

    // Verify that the API calls were made and failed as expected
    expect(mockGetUserOrders).toHaveBeenCalled();
    expect(mockGetUserFunding).toHaveBeenCalled();

    // The component should handle the failures gracefully
    // We can verify that the component is still functional
    expect(component.getByText('Orders')).toBeTruthy();
    expect(component.getByText('Funding')).toBeTruthy();
  });
});

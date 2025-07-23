import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PerpsView from './PerpsView';
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsNetwork,
  usePerpsNetworkConfig,
  usePerpsTrading,
  usePerpsPrices,
} from '../hooks';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../hooks', () => ({
  usePerpsAccount: jest.fn(),
  usePerpsConnection: jest.fn(),
  usePerpsNetwork: jest.fn(),
  usePerpsNetworkConfig: jest.fn(),
  usePerpsTrading: jest.fn(),
  usePerpsPrices: jest.fn(),
}));

jest.mock('../../../Base/ScreenView', () => 'ScreenView');

const mockNavigate = jest.fn();

describe('PerpsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    // Default mock implementations
    (usePerpsAccount as jest.Mock).mockReturnValue({
      totalBalance: '1000',
      availableBalance: '500',
      marginUsed: '500',
      unrealizedPnl: '0',
    });

    (usePerpsConnection as jest.Mock).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
      error: null,
      connect: jest.fn(),
      resetError: jest.fn(),
    });

    (usePerpsNetwork as jest.Mock).mockReturnValue('mainnet');

    (usePerpsNetworkConfig as jest.Mock).mockReturnValue({
      toggleTestnet: jest
        .fn()
        .mockResolvedValue({ success: true, isTestnet: false }),
    });

    (usePerpsTrading as jest.Mock).mockReturnValue({
      getAccountState: jest.fn().mockResolvedValue({
        totalBalance: '1000',
        availableBalance: '500',
        marginUsed: '500',
        unrealizedPnl: '0',
      }),
    });

    (usePerpsPrices as jest.Mock).mockReturnValue({
      BTC: { price: '50000', percentChange24h: '2.5' },
      ETH: { price: '3000', percentChange24h: '-1.2' },
      SOL: { price: '100', percentChange24h: '5.0' },
      ARB: { price: '1.5', percentChange24h: '0.0' },
    });
  });

  it('should render main view when connected', () => {
    render(<PerpsView />);

    expect(screen.getByText('Perps Trading (Minimal)')).toBeDefined();
    expect(
      screen.getByText('Core Controller & Services Testing'),
    ).toBeDefined();
    expect(screen.getByText('Network: MAINNET')).toBeDefined();
    expect(screen.getByText('Balance: $1000')).toBeDefined();
  });

  it('should show connection error view when error exists', () => {
    const error = new Error('Connection failed');
    (usePerpsConnection as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      error,
      connect: jest.fn(),
      resetError: jest.fn(),
    });

    render(<PerpsView />);

    expect(screen.getByText('Connection failed')).toBeDefined();
  });

  it('should show loader when initializing', () => {
    (usePerpsConnection as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      error: null,
      connect: jest.fn(),
      resetError: jest.fn(),
    });

    render(<PerpsView />);

    expect(screen.getByTestId('perps-loader-text')).toBeDefined();
    expect(screen.getByText('Initializing Perps controller...')).toBeDefined();
  });

  it('should show loader when connecting', () => {
    (usePerpsConnection as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: true,
      isInitialized: true,
      error: null,
      connect: jest.fn(),
      resetError: jest.fn(),
    });

    render(<PerpsView />);

    expect(screen.getByTestId('perps-loader-text')).toBeDefined();
    expect(screen.getByText('Connecting to Perps trading...')).toBeDefined();
  });

  it('should handle get account balance', async () => {
    const mockGetAccountState = jest.fn().mockResolvedValue({
      totalBalance: '2000',
      availableBalance: '1500',
      marginUsed: '500',
      unrealizedPnl: '100',
    });

    (usePerpsTrading as jest.Mock).mockReturnValue({
      getAccountState: mockGetAccountState,
    });

    render(<PerpsView />);

    const balanceButton = screen.getByText('Get Account Balance');
    fireEvent.press(balanceButton);

    await waitFor(() => {
      expect(mockGetAccountState).toHaveBeenCalled();
    });
  });

  it('should handle network toggle', async () => {
    const mockToggleTestnet = jest.fn().mockResolvedValue({
      success: true,
      isTestnet: true,
    });

    (usePerpsNetworkConfig as jest.Mock).mockReturnValue({
      toggleTestnet: mockToggleTestnet,
    });

    render(<PerpsView />);

    const toggleButton = screen.getByText('Switch to Testnet');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockToggleTestnet).toHaveBeenCalled();
    });
  });

  it('should navigate to deposit', () => {
    render(<PerpsView />);

    const depositButton = screen.getByText('Deposit Funds');
    fireEvent.press(depositButton);

    expect(mockNavigate).toHaveBeenCalledWith('PerpsDeposit');
  });

  it('should navigate to markets', () => {
    render(<PerpsView />);

    const marketsButton = screen.getByText('View Markets');
    fireEvent.press(marketsButton);

    expect(mockNavigate).toHaveBeenCalledWith('PerpsMarketListView');
  });

  it('should navigate to positions', () => {
    render(<PerpsView />);

    const positionsButton = screen.getByText('Positions');
    fireEvent.press(positionsButton);

    expect(mockNavigate).toHaveBeenCalledWith('PerpsPositions');
  });

  it('should render popular markets with prices', () => {
    render(<PerpsView />);

    expect(screen.getByText('Popular Markets')).toBeDefined();
    expect(screen.getByText('BTC')).toBeDefined();
    expect(screen.getByText('$50,000')).toBeDefined();
    expect(screen.getByText('+2.50%')).toBeDefined();

    expect(screen.getByText('ETH')).toBeDefined();
    expect(screen.getByText('$3,000')).toBeDefined();
    expect(screen.getByText('-1.20%')).toBeDefined();
  });

  it('should navigate to order page when long button pressed', () => {
    render(<PerpsView />);

    const longButtons = screen.getAllByText('Long');
    fireEvent.press(longButtons[0]); // Press BTC long button

    expect(mockNavigate).toHaveBeenCalledWith('PerpsOrder', {
      direction: 'long',
      asset: 'BTC',
    });
  });

  it('should navigate to order page when short button pressed', () => {
    render(<PerpsView />);

    const shortButtons = screen.getAllByText('Short');
    fireEvent.press(shortButtons[0]); // Press BTC short button

    expect(mockNavigate).toHaveBeenCalledWith('PerpsOrder', {
      direction: 'short',
      asset: 'BTC',
    });
  });

  it('should show testnet warning when on testnet', () => {
    (usePerpsNetwork as jest.Mock).mockReturnValue('testnet');

    render(<PerpsView />);

    expect(screen.getByText('Network: TESTNET')).toBeDefined();
    expect(screen.getByText('Switch to Mainnet')).toBeDefined();
  });

  it('should show no funds warning when balance is zero', () => {
    (usePerpsAccount as jest.Mock).mockReturnValue({
      totalBalance: '0',
      availableBalance: '0',
      marginUsed: '0',
      unrealizedPnl: '0',
    });

    render(<PerpsView />);

    expect(
      screen.getByText(
        "No funds deposited. Use 'Deposit Funds' to get started.",
      ),
    ).toBeDefined();
  });

  it('should handle invalid asset navigation', () => {
    render(<PerpsView />);

    const invalidAssetButton = screen.getByText('Trade INVALID asset →');
    fireEvent.press(invalidAssetButton);

    expect(mockNavigate).toHaveBeenCalledWith('PerpsOrder', {
      direction: 'long',
      asset: 'WRONGNAME',
    });
  });

  it('should retry connection on error', async () => {
    const mockConnect = jest.fn();
    const mockResetError = jest.fn();

    (usePerpsConnection as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: true,
      error: new Error('Connection failed'),
      connect: mockConnect,
      resetError: mockResetError,
    });

    render(<PerpsView />);

    const retryButton = screen.getByText('Retry Connection');
    fireEvent.press(retryButton);

    expect(mockResetError).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();
  });
});

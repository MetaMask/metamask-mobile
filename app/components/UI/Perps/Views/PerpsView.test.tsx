import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsView from './PerpsView';

// Mock all dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

// Mock PerpsStreamManager
jest.mock('../providers/PerpsStreamManager');

// Mock stream hooks
jest.mock('../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({
    'BTC-PERP': { price: '50000', percentChange24h: '2.5' },
    'ETH-PERP': { price: '3000', percentChange24h: '-1.2' },
    'SOL-PERP': { price: '100', percentChange24h: '5.0' },
    'ARB-PERP': { price: '2', percentChange24h: '-3.0' },
  })),
}));

jest.mock('../hooks', () => ({
  usePerpsAccount: jest.fn(() => ({
    totalBalance: '1000',
    availableBalance: '500',
    marginUsed: '500',
    unrealizedPnl: '0',
  })),
  usePerpsConnection: jest.fn(() => ({
    isConnected: true,
    isConnecting: false,
    isInitialized: true,
    error: null,
    connect: jest.fn(),
    resetError: jest.fn(),
  })),
  usePerpsNetwork: jest.fn(() => 'mainnet'),
  usePerpsNetworkConfig: jest.fn(() => ({
    toggleTestnet: jest.fn(),
  })),
  usePerpsTrading: jest.fn(() => ({
    getAccountState: jest.fn(),
  })),
  usePerpsPrices: jest.fn(() => ({
    BTC: { price: '50000', percentChange24h: '2.5' },
    ETH: { price: '3000', percentChange24h: '-1.2' },
    SOL: { price: '100', percentChange24h: '5.0' },
    ARB: { price: '2', percentChange24h: '-3.0' },
  })),
}));

// Mock the hooks that deal with styles
jest.mock('../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      content: {},
      headerContainer: {},
      buttonContainer: {},
      button: {},
      tradingButtonsContainer: {},
      tradingButton: {},
      marketGridContainer: {},
      marketGrid: {},
      marketCard: {},
      marketCardContent: {},
      marketAsset: {},
      marketPrice: {},
      marketButtons: {},
      marketButton: {},
      longButton: {},
      shortButton: {},
      marketButtonText: {},
      resultContainer: {},
      resultText: {},
    },
  })),
}));

jest.mock('../../../Base/ScreenView', () => 'MockedScreenView');

// Mock locales
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Mock theme
jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { default: '#ffffff' },
      text: { default: '#000000' },
      primary: { default: '#0066cc' },
      error: { default: '#ff0000' },
      success: { default: '#00cc66' },
    },
    themeAppearance: 'light',
  })),
}));

describe('PerpsView', () => {
  it('should have proper mocks', () => {
    // Verify mocks are set up correctly
    const { usePerpsAccount } = jest.requireMock('../hooks');
    expect(usePerpsAccount).toBeDefined();
  });

  it('should render correctly in connected state', () => {
    const { toJSON } = render(<PerpsView />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with error state', () => {
    const errorHooks = jest.requireMock('../hooks');
    const originalConnection = errorHooks.usePerpsConnection;

    // Mock error state
    errorHooks.usePerpsConnection.mockReturnValueOnce({
      isConnected: false,
      isConnecting: false,
      isInitialized: true,
      error: 'Connection error',
      connect: jest.fn(),
      resetError: jest.fn(),
    });

    const { toJSON } = render(<PerpsView />);
    expect(toJSON()).toMatchSnapshot();

    // Restore original mock
    errorHooks.usePerpsConnection = originalConnection;
  });

  it('should render correctly when initializing', () => {
    const initHooks = jest.requireMock('../hooks');
    const originalConnection = initHooks.usePerpsConnection;

    // Mock initializing state
    initHooks.usePerpsConnection.mockReturnValueOnce({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      error: null,
      connect: jest.fn(),
      resetError: jest.fn(),
    });

    const { toJSON } = render(<PerpsView />);
    expect(toJSON()).toMatchSnapshot();

    // Restore original mock
    initHooks.usePerpsConnection = originalConnection;
  });
});

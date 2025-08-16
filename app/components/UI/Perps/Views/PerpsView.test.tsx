// Mock all dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
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
  })),
}));

jest.mock('../../../Base/ScreenView', () => 'MockedScreenView');

describe('PerpsView', () => {
  it('should have proper mocks', () => {
    // Verify mocks are set up correctly
    const { usePerpsAccount } = jest.requireMock('../hooks');
    expect(usePerpsAccount).toBeDefined();
  });
});

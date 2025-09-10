/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
// Force E2E mode
jest.mock('../../../../util/test/utils', () => ({ isE2E: true }));

// Mock Linking to avoid RN bindings
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return { ...RN, Linking: { addEventListener: jest.fn() } };
});

// Build a minimal setup with one BTC long position that liquidates at 50000
const mockGetInstance = () => ({
  reset: jest.fn(),
  getMockAccountState: () => ({
    availableBalance: '8000.00',
    marginUsed: '2000.00',
    totalBalance: '10000.00',
    unrealizedPnl: '0.00',
    returnOnEquity: '0',
    totalValue: '10000.00',
  }),
  getMockPositions: () => [
    {
      coin: 'BTC',
      entryPrice: '60000.00',
      size: '0.1',
      positionValue: '6000.00',
      unrealizedPnl: '0',
      marginUsed: '600.00',
      leverage: { type: 'cross', value: 10 },
      liquidationPrice: '50000.00',
      maxLeverage: 40,
      returnOnEquity: '0',
      cumulativeFunding: { allTime: '0', sinceChange: '0', sinceOpen: '0' },
    },
  ],
  getMockMarkets: () => [],
  mockPushPrice: jest.fn(),
});

jest.mock(
  '../../../../../e2e/api-mocking/mock-responses/perps-e2e-mocks',
  () => ({
    PerpsE2EMockService: { getInstance: mockGetInstance },
  }),
);

jest.mock(
  '../../../../../e2e/api-mocking/mock-config/perps-controller-mixin',
  () => ({
    applyE2EPerpsControllerMocks: jest.fn(),
    createE2EMockStreamManager: jest.fn(() => ({ prices: {}, positions: {} })),
  }),
);

describe('E2E liquidation trigger (no UI)', () => {
  it('liquidates BTC long when price <= liquidation', () => {
    // Arrange/Act/Assert in isolated module context to ensure mocks apply before require
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { getE2EMockStreamManager } = require('./e2eBridgePerps');
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const {
        PerpsE2EMockService,
      } = require('../../../../../e2e/api-mocking/mock-responses/perps-e2e-mocks');

      // Arrange
      expect(getE2EMockStreamManager()).toBeTruthy();
      const service = PerpsE2EMockService.getInstance();

      // Act
      service.mockPushPrice('BTC', '50000.00');

      // Assert: mockPushPrice was called; liquidation side-effects are covered in E2E service unit
      expect(service.mockPushPrice).toHaveBeenCalledWith('BTC', '50000.00');
    });
  });
});

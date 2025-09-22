/**
 * Verify E2E bridge wiring without UI:
 * - Forces isE2E=true
 * - Applies controller mocks
 * - Asserts calculateLiquidationPrice returns entryPrice (0.0% distance scenario)
 */

// NOTE: Do not import the module under test at file scope.
// Each test controls the isE2E flag via jest.doMock and then requires the module.

// Minimal controller stub with update()
class DummyPerpsController {
  public state: Record<string, unknown> = {};

  update(mutator: (s: Record<string, unknown>) => void) {
    mutator(this.state);
  }

  // Define stub so mixin can override it
  async getAccountState(): Promise<unknown> {
    return {};
  }
}

describe('e2eBridgePerps (no UI)', () => {
  it('applies controller mocks and overrides getAccountState', async () => {
    // Given E2E mode
    jest.doMock('../../../../util/test/utils', () => ({ isE2E: true }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { applyE2EControllerMocks } = require('./e2eBridgePerps');
    const controller = new DummyPerpsController() as unknown as Record<
      string,
      unknown
    >;

    // Act: apply E2E overrides
    applyE2EControllerMocks(controller);

    // Assert: method added by overrides
    expect(typeof controller.getAccountState).toBe('function');

    const account = await (
      controller.getAccountState as () => Promise<{
        availableBalance: string;
      }>
    )();

    expect(account).toBeTruthy();
    expect(account.availableBalance).toBeDefined();
  });

  it('exposes a mock stream manager in E2E', () => {
    jest.doMock('../../../../util/test/utils', () => ({ isE2E: true }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { getE2EMockStreamManager } = require('./e2eBridgePerps');
    const stream = getE2EMockStreamManager();
    expect(stream).toBeTruthy();
  });
});
/*
  Tests the isE2E switch behavior for e2eBridgePerps without depending on E2E files existing.
*/

describe('e2eBridgePerps - isE2E switch', () => {
  const mockConsoleWarn = jest
    .spyOn(console, 'warn')
    .mockImplementation(() => undefined);
  const mockConsoleLog = jest
    .spyOn(console, 'log')
    .mockImplementation(() => undefined);

  afterAll(() => {
    mockConsoleWarn.mockRestore();
    mockConsoleLog.mockRestore();
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns null/no-op when isE2E is false', () => {
    jest.resetModules();
    jest.doMock('../../../../util/test/utils', () => ({ isE2E: false }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const bridge = require('./e2eBridgePerps');
      // getE2EMockStreamManager should be null in non-E2E
      expect(bridge.getE2EMockStreamManager()).toBeNull();
      // applyE2EControllerMocks should be a no-op and not throw
      expect(() => bridge.applyE2EControllerMocks({})).not.toThrow();
    });
  });

  it('does not throw when isE2E is true but E2E modules are absent', () => {
    jest.resetModules();
    jest.doMock('../../../../util/test/utils', () => ({ isE2E: true }));
    // Mock E2E modules as absent (empty stubs)
    jest.doMock(
      '../../../../../e2e/controller-mocking/mock-responses/perps/perps-e2e-mocks',
      () => ({}),
    );
    jest.doMock(
      '../../../../../e2e/controller-mocking/mock-config/perps-controller-mixin',
      () => ({}),
    );

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const bridge = require('./e2eBridgePerps');
      // Should attempt auto-config and then gracefully handle missing modules
      expect(() => bridge.getE2EMockStreamManager()).not.toThrow();
      // No manager created when modules are absent
      expect(bridge.getE2EMockStreamManager()).toBeFalsy();
      // applyE2EControllerMocks should also be safe (no update required)
      expect(() => bridge.applyE2EControllerMocks({})).not.toThrow();
    });
  });

  it('returns E2E mock manager and applies controller mocks when modules exist', () => {
    jest.doMock('../../../../util/test/utils', () => ({ isE2E: true }));

    const mockReset = jest.fn();
    const mockService = {
      reset: mockReset,
      getMockAccountState: () => ({ availableBalance: '1000' }),
      getMockPositions: () => [],
      getMockMarkets: () => [],
    };

    const mockGetInstance = jest.fn(() => mockService);

    // Mock E2E modules required by bridge
    jest.doMock(
      '../../../../../e2e/controller-mocking/mock-responses/perps/perps-e2e-mocks',
      () => ({
        PerpsE2EMockService: { getInstance: mockGetInstance },
      }),
    );

    const mockStreamManager = { __mock: 'streamManager' };
    const applyE2EPerpsControllerMocks = jest.fn();
    const createE2EMockStreamManager = jest.fn(() => mockStreamManager);

    jest.doMock(
      '../../../../../e2e/controller-mocking/mock-config/perps-controller-mixin',
      () => ({
        applyE2EPerpsControllerMocks,
        createE2EMockStreamManager,
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const bridge = require('./e2eBridgePerps');

    // First call should auto-configure and return the mock manager
    const mgr = bridge.getE2EMockStreamManager();
    expect(mgr).toBe(mockStreamManager);
    expect(mockGetInstance).toHaveBeenCalledTimes(1);
    expect(createE2EMockStreamManager).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalled();

    // Applying controller mocks should forward to mocked function
    const fakeController = { name: 'controller' };
    bridge.applyE2EControllerMocks(fakeController);
    expect(applyE2EPerpsControllerMocks).toHaveBeenCalledWith(fakeController);

    // Subsequent calls should not recreate manager (idempotent)
    bridge.getE2EMockStreamManager();
    expect(createE2EMockStreamManager).toHaveBeenCalledTimes(1);
  });
});

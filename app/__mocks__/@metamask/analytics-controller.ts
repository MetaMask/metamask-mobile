import { BaseController } from '@metamask/base-controller';

// Re-export types and utilities needed by tests when this mock is active
const actualAnalyticsController = jest.requireActual(
  '@metamask/analytics-controller',
);

export const { getDefaultAnalyticsControllerState, controllerName } =
  actualAnalyticsController;

export type {
  AnalyticsControllerMessenger,
  AnalyticsControllerState,
} from '@metamask/analytics-controller';

/**
 * Creates a mock messenger with all methods required by BaseController.
 */
const createMockMessenger = () => ({
  registerActionHandler: jest.fn(),
  registerEventHandler: jest.fn(),
  unregisterActionHandler: jest.fn(),
  call: jest.fn(),
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  clearEventSubscriptions: jest.fn(),
  registerInitialEventPayload: jest.fn(),
});

/**
 * Temporary mock class that extends BaseController for proper inheritance validation.
 * This class is used to create instances that pass ComposableController's BaseController checks.
 */
class MockAnalyticsController extends BaseController<
  'AnalyticsController',
  { enabled: boolean; optedIn: boolean; analyticsId: string },
  never
> {
  public trackEvent = jest.fn();
  public identify = jest.fn();
  public trackPage = jest.fn();
  public enable = jest.fn();
  public disable = jest.fn();
  public optIn = jest.fn();
  public optOut = jest.fn();

  constructor() {
    super({
      name: 'AnalyticsController',
      state: {
        enabled: true,
        optedIn: false,
        analyticsId: 'f2673eb8-db32-40bb-88a5-97cf5107d31d',
      },
      messenger: createMockMessenger() as never,
      metadata: {
        enabled: {
          persist: true,
          includeInDebugSnapshot: true,
          includeInStateLogs: true,
          usedInUi: true,
        },
        optedIn: {
          persist: true,
          includeInDebugSnapshot: true,
          includeInStateLogs: true,
          usedInUi: true,
        },
        analyticsId: {
          persist: true,
          includeInDebugSnapshot: true,
          includeInStateLogs: true,
          usedInUi: true,
        },
      },
    });
  }
}

/**
 * Mock AnalyticsController class for testing.
 * Jest will automatically use this mock when `jest.mock('@metamask/analytics-controller')` is called.
 * By default, returns a mock controller with all methods as jest.fn().
 * And a static valid UUIDv4 analytics id f2673eb8-db32-40bb-88a5-97cf5107d31d
 */
export const AnalyticsController = jest
  .fn()
  .mockImplementation(() => new MockAnalyticsController());

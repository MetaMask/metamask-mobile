import { BaseController } from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';

// Define types directly instead of re-exporting to avoid circular dependency
export interface AnalyticsControllerState {
  optedInForRegularAccount: boolean;
  optedInForSocialAccount: boolean;
  analyticsId: string;
}

export type AnalyticsControllerMessenger = Messenger<
  'AnalyticsController',
  never,
  never
>;

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
  {
    optedInForRegularAccount: boolean;
    optedInForSocialAccount: boolean;
    analyticsId: string;
  },
  never
> {
  public trackEvent = jest.fn();
  public identify = jest.fn();
  public trackView = jest.fn();
  public optInForRegularAccount = jest.fn();
  public optOutForRegularAccount = jest.fn();
  public optInForSocialAccount = jest.fn();
  public optOutForSocialAccount = jest.fn();

  constructor() {
    super({
      name: 'AnalyticsController',
      state: {
        optedInForRegularAccount: false,
        optedInForSocialAccount: false,
        analyticsId: 'f2673eb8-db32-40bb-88a5-97cf5107d31d',
      },
      messenger: createMockMessenger() as never,
      metadata: {
        optedInForRegularAccount: {
          persist: true,
          includeInDebugSnapshot: true,
          includeInStateLogs: true,
          usedInUi: true,
        },
        optedInForSocialAccount: {
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

/**
 * Mock selectors for testing
 */
export const analyticsControllerSelectors = {
  selectAnalyticsId: jest.fn(
    (state: AnalyticsControllerState) => state?.analyticsId,
  ),
  selectEnabled: jest.fn(
    (state: AnalyticsControllerState) =>
      state?.optedInForRegularAccount || state?.optedInForSocialAccount,
  ),
  selectOptedInForRegularAccount: jest.fn(
    (state: AnalyticsControllerState) => state?.optedInForRegularAccount,
  ),
  selectOptedInForSocialAccount: jest.fn(
    (state: AnalyticsControllerState) => state?.optedInForSocialAccount,
  ),
};

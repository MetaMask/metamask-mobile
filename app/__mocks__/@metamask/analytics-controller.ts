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
 * Mock AnalyticsController class for testing.
 * Jest will automatically use this mock when `jest.mock('@metamask/analytics-controller')` is called.
 * By default, returns a mock controller with all methods as jest.fn().
 */
export const AnalyticsController = jest.fn().mockImplementation(() => ({
  state: {
    enabled: true,
    optedIn: false,
    analyticsId: 'f2673eb8-db32-40bb-88a5-97cf5107d31d',
  },
  trackEvent: jest.fn(),
  identify: jest.fn(),
  trackPage: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  optIn: jest.fn(),
  optOut: jest.fn(),
}));

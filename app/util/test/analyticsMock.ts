/**
 * Reusable analytics mock for unit tests
 * Provides a standard mock implementation of the analytics module
 * that can be used across test files for consistency
 */

export interface MockAnalytics {
  isEnabled: jest.Mock<boolean, []>;
  trackEvent: jest.Mock<void, [event: unknown]>;
  optIn: jest.Mock<Promise<void>, []>;
  optOut: jest.Mock<Promise<void>, []>;
  getAnalyticsId: jest.Mock<Promise<string>, []>;
  identify: jest.Mock<void, [traits?: unknown]>;
  trackView: jest.Mock<void, [name: string, properties?: unknown]>;
  isOptedIn: jest.Mock<Promise<boolean>, []>;
}

/**
 * Create a mock analytics object with default implementations
 * All methods are jest mocks that can be configured per test
 *
 * @param overrides - Optional overrides for specific methods
 * @returns Mock analytics object
 */
export function createMockAnalytics(
  overrides?: Partial<MockAnalytics>,
): MockAnalytics {
  const defaultMock: MockAnalytics = {
    isEnabled: jest.fn<boolean, []>().mockReturnValue(false),
    trackEvent: jest.fn(),
    optIn: jest.fn().mockResolvedValue(undefined),
    optOut: jest.fn().mockResolvedValue(undefined),
    getAnalyticsId: jest.fn().mockResolvedValue('test-analytics-id'),
    identify: jest.fn(),
    trackView: jest.fn(),
    isOptedIn: jest.fn().mockResolvedValue(false),
  };

  return { ...defaultMock, ...overrides };
}

/**
 * Jest mock factory for the analytics module
 * Use this in jest.mock() calls
 *
 * @param overrides - Optional overrides for specific methods
 * @returns Jest mock module
 */
export function createAnalyticsMockModule(overrides?: Partial<MockAnalytics>) {
  const mockAnalytics = createMockAnalytics(overrides);
  return {
    analytics: mockAnalytics,
  };
}

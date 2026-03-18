/**
 * Reusable analytics mock for unit tests
 * Provides a standard mock implementation of the analytics module
 * that can be used across test files for consistency
 */

import type { UseAnalyticsHook } from '../../components/hooks/useAnalytics/useAnalytics.types';

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

/**
 * Creates a fresh `UseAnalyticsHook` mock on every call.
 *
 * Always use this factory rather than a shared constant, since
 * `jest.resetAllMocks()` / `jest.clearAllMocks()` wipe mock implementations
 * on any shared jest.fn() reference.
 *
 * @example
 * jest.mocked(useAnalytics).mockReturnValue(
 *   createMockUseAnalyticsHook({ trackEvent: mockTrackEvent }),
 * );
 *
 * @example with beforeEach reset
 * beforeEach(() => {
 *   jest.resetAllMocks();
 *   jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
 * });
 */
export const createMockUseAnalyticsHook = (
  overrides?: Partial<UseAnalyticsHook>,
): UseAnalyticsHook => ({
  trackEvent: jest.fn(),
  createEventBuilder: jest.fn(() => ({
    addProperties: jest.fn().mockReturnThis(),
    addSensitiveProperties: jest.fn().mockReturnThis(),
    removeProperties: jest.fn().mockReturnThis(),
    removeSensitiveProperties: jest.fn().mockReturnThis(),
    setSaveDataRecording: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      name: 'mock-event',
      properties: {},
      sensitiveProperties: {},
      saveDataRecording: false,
    }),
  })),
  isEnabled: jest.fn().mockReturnValue(true),
  identify: jest.fn().mockResolvedValue(undefined),
  enable: jest.fn().mockResolvedValue(undefined),
  addTraitsToUser: jest.fn().mockResolvedValue(undefined),
  createDataDeletionTask: jest.fn().mockResolvedValue({ status: 'ok' }),
  checkDataDeleteStatus: jest.fn().mockResolvedValue({
    deletionRequestDate: undefined,
    hasCollectedDataSinceDeletionRequest: false,
    dataDeletionRequestStatus: 'UNKNOWN',
  }),
  getDeleteRegulationCreationDate: jest.fn().mockReturnValue('20/04/2024'),
  getDeleteRegulationId: jest.fn().mockReturnValue('mock-regulation-id'),
  isDataRecorded: jest.fn().mockReturnValue(true),
  getAnalyticsId: jest.fn().mockResolvedValue('mock-analytics-id'),
  ...overrides,
});

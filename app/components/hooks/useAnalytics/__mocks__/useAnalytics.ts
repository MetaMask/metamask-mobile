/**
 * Manual Jest mock for useAnalytics.
 * Use jest.mock('path/to/useAnalytics/useAnalytics') in tests to get this implementation
 * without defining a factory in each test file.
 */
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';

export const useAnalytics = jest.fn(() => createMockUseAnalyticsHook());

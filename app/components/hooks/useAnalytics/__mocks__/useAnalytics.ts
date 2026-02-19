/**
 * Manual Jest mock for useAnalytics.
 * Use jest.mock('path/to/useAnalytics/useAnalytics') in tests to get this implementation
 * without defining a factory in each test file.
 */
export const useAnalytics = jest.fn(() => ({
  trackEvent: jest.fn(),
  createEventBuilder: jest.fn(() => ({
    addProperties: jest.fn().mockReturnThis(),
    addSensitiveProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  })),
  enable: jest.fn().mockResolvedValue(undefined),
  addTraitsToUser: jest.fn().mockResolvedValue(undefined),
  createDataDeletionTask: jest.fn().mockResolvedValue({}),
  checkDataDeleteStatus: jest.fn().mockResolvedValue({}),
  getDeleteRegulationCreationDate: jest.fn().mockReturnValue(undefined),
  getDeleteRegulationId: jest.fn().mockReturnValue(undefined),
  isDataRecorded: jest.fn().mockReturnValue(false),
  getAnalyticsId: jest.fn().mockResolvedValue(undefined),
  isEnabled: jest.fn().mockReturnValue(true),
}));

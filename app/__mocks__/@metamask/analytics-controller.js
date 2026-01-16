/* eslint-disable import/no-commonjs */
// Manual mock for @metamask/analytics-controller
// This is needed when the module is not installed in CI environments

export const analyticsControllerSelectors = {
  selectAnalyticsEnabled: jest.fn((state) =>
    // selectEnabled checks if analytics is enabled based on optedIn
     state?.optedIn === true
  ),
  selectEnabled: jest.fn((state) =>
    // selectEnabled checks if analytics is enabled based on optedIn
     state?.optedIn === true
  ),
  selectAnalyticsOptedIn: jest.fn((state) => state?.optedIn === true),
  selectAnalyticsId: jest.fn((state) => state?.analyticsId || 'test-analytics-id'),
};

export const AnalyticsController = jest.fn();

export const getDefaultAnalyticsControllerState = jest.fn(() => ({
  optedIn: false,
  analyticsId: 'test-analytics-id',
}));

/* eslint-disable import/no-commonjs */
// Manual mock for @metamask/analytics-controller
// This is needed when the module is not installed in CI environments

export const analyticsControllerSelectors = {
  selectAnalyticsEnabled: jest.fn(() => true),
  selectAnalyticsOptedIn: jest.fn(() => true),
  selectAnalyticsId: jest.fn(() => 'test-analytics-id'),
};

export const AnalyticsController = jest.fn();

export const getDefaultAnalyticsControllerState = jest.fn(() => ({
  optedIn: false,
  analyticsId: 'test-analytics-id',
}));

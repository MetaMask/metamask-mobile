import { LaunchArguments } from 'react-native-launch-arguments';
import { E2E_METAMETRICS_TRACK_URL } from '../../util/test/utils';
import { ITrackingEvent } from './MetaMetrics.types';

jest.unmock('./MetaMetricsTestUtils');

import { MetaMetricsTestUtils } from './MetaMetricsTestUtils';

jest.mock('react-native-launch-arguments', () => ({
  LaunchArguments: {
    value: jest.fn(),
  },
}));

jest.mock('../../util/test/utils', () => ({
  E2E_METAMETRICS_TRACK_URL: 'https://test-server.com/metametrics',
}));


const testEvent: ITrackingEvent = {
  name: 'test_event', properties: {isTest: true},
  sensitiveProperties: {},
  saveDataRecording: false,
  isAnonymous: false,
  hasProperties: false
};

describe('MetaMetricsTestUtils', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    MetaMetricsTestUtils.resetInstance();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Singleton pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
     const instance1 = MetaMetricsTestUtils.getInstance();
      const instance2 = MetaMetricsTestUtils.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after resetInstance is called', () => {
      const instance1 = MetaMetricsTestUtils.getInstance();
      MetaMetricsTestUtils.resetInstance();
      const instance2 = MetaMetricsTestUtils.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Constructor', () => {
    it('should initialize with sendMetaMetricsinE2E as false by default', () => {
      (LaunchArguments.value as jest.Mock).mockReturnValue({});

      const instance = MetaMetricsTestUtils.getInstance();

      instance.trackEvent(testEvent);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should initialize with sendMetaMetricsinE2E from launch arguments when provided', () => {
      (LaunchArguments.value as jest.Mock).mockReturnValue({
        sendMetaMetricsinE2E: true,
      });

      const instance = new MetaMetricsTestUtils();

      expect(instance).toBeInstanceOf(MetaMetricsTestUtils);

      instance.trackEvent(testEvent);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('should not send event when sendMetaMetricsinE2E is false', async () => {
      (LaunchArguments.value as jest.Mock).mockReturnValue({
        sendMetaMetricsinE2E: false,
      });

      const instance = MetaMetricsTestUtils.getInstance();
      await instance.trackEvent(testEvent);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should send event to test server when sendMetaMetricsinE2E is true', async () => {
      (LaunchArguments.value as jest.Mock).mockReturnValue({
        sendMetaMetricsinE2E: true,
      });

      const instance = MetaMetricsTestUtils.getInstance();

      await instance.trackEvent(testEvent);

      expect(global.fetch).toHaveBeenCalledWith(E2E_METAMETRICS_TRACK_URL, {
        method: 'POST',
        body: JSON.stringify({
          event: testEvent.name,
          properties: {
            ...testEvent.properties,
            ...testEvent.sensitiveProperties,
          },
        }),
      });
    });

    it('should handle fetch network errors gracefully', async () => {
      (LaunchArguments.value as jest.Mock).mockReturnValue({
        sendMetaMetricsinE2E: true,
      });

      const originalConsoleError = console.error;
      console.error = jest.fn();

      const networkError = new TypeError('Network request failed');
      global.fetch = jest.fn().mockRejectedValue(networkError);

      const instance = MetaMetricsTestUtils.getInstance();
      await instance.trackEvent(testEvent);

      expect(console.error).not.toHaveBeenCalled();
      console.error = originalConsoleError;
    });

    it('should log non-network errors', async () => {
      (LaunchArguments.value as jest.Mock).mockReturnValue({
        sendMetaMetricsinE2E: true,
      });

      const originalConsoleError = console.error;
      console.error = jest.fn();

      const otherError = new Error('Some other error');
      global.fetch = jest.fn().mockRejectedValue(otherError);

      const instance = MetaMetricsTestUtils.getInstance();
      await instance.trackEvent(testEvent);

      expect(console.error).toHaveBeenCalledWith(
        'Error sending event to test server:',
        otherError
      );
      console.error = originalConsoleError;
    });
  });
});

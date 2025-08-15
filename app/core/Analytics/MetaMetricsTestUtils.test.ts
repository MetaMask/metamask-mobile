import { E2E_METAMETRICS_TRACK_URL } from '../../util/test/utils';
import { ITrackingEvent } from './MetaMetrics.types';

jest.unmock('./MetaMetricsTestUtils');

import MetaMetricsTestUtils from './MetaMetricsTestUtils';

jest.mock('../../util/test/utils', () => ({
  E2E_METAMETRICS_TRACK_URL: 'https://test-server.com/metametrics',
}));

const testEvent: ITrackingEvent = {
  name: 'test_event',
  properties: { isTest: true },
  sensitiveProperties: {},
  saveDataRecording: false,
  isAnonymous: false,
  hasProperties: false,
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

  describe('trackEvent', () => {
    it('should send event to test server', async () => {
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
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const otherError = new Error('Some other error');
      global.fetch = jest.fn().mockRejectedValue(otherError);

      const instance = MetaMetricsTestUtils.getInstance();
      await instance.trackEvent(testEvent);

      expect(console.error).toHaveBeenCalledWith(
        'Error sending event to test server:',
        otherError,
      );
      console.error = originalConsoleError;
    });
  });
});

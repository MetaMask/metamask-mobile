import MetaMetrics from './MetaMetrics';
import StorageWrapper from '../../store/storage-wrapper';
import { MetricsEventBuilder } from './MetricsEventBuilder';
import { analytics } from '../../util/analytics/analytics';

jest.mock('../../store/storage-wrapper');
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockClear = jest.fn();

// Mock analytics utility
jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
    identify: jest.fn(),
    optIn: jest.fn(),
    optOut: jest.fn(),
    getAnalyticsId: jest.fn(),
    isEnabled: jest.fn(),
    trackView: jest.fn(),
    isOptedIn: jest.fn(),
  },
}));

// Mock MetaMetricsTestUtils
const mockTrackE2EEvent = jest.fn();
const mockInstance = {
  trackEvent: mockTrackE2EEvent,
};

jest.mock('./MetaMetricsTestUtils', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockImplementation(() => mockInstance),
  },
}));

// Mock analytics ID utility
jest.mock('../../util/analytics/analyticsId', () => ({
  getAnalyticsId: jest.fn(),
}));

/**
 * Extend MetaMetrics to allow reset of the singleton instance
 */
class TestMetaMetrics extends MetaMetrics {
  public static resetInstance(): void {
    TestMetaMetrics.instance = null;
  }
}

// Get typed mocks
const mockAnalytics = analytics as jest.Mocked<typeof analytics>;

describe('MetaMetrics', () => {
  beforeEach(async () => {
    StorageWrapper.getItem = mockGet;
    StorageWrapper.setItem = mockSet;
    StorageWrapper.clearAll = mockClear;
    TestMetaMetrics.resetInstance();
    jest.clearAllMocks();
    mockGet.mockReset();
    mockSet.mockReset();
    jest.clearAllMocks();
    (mockAnalytics.trackEvent as jest.Mock).mockClear();
    (mockAnalytics.identify as jest.Mock).mockClear();
    (mockAnalytics.optIn as jest.Mock).mockClear();
    (mockAnalytics.optOut as jest.Mock).mockClear();
    (mockAnalytics.getAnalyticsId as jest.Mock).mockClear();
    (mockAnalytics.isEnabled as jest.Mock).mockClear();
    (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
    (mockAnalytics.getAnalyticsId as jest.Mock).mockResolvedValue(
      'test-analytics-id',
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockSet.mockReset();
  });

  describe('Singleton', () => {
    it('does not create a new instance if one already exists', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      const metaMetrics2 = TestMetaMetrics.getInstance();
      expect(metaMetrics).not.toBeNull();
      expect(metaMetrics2).not.toBeNull();
      expect(metaMetrics).toBeInstanceOf(MetaMetrics);
      expect(metaMetrics2).toBeInstanceOf(MetaMetrics);
      expect(metaMetrics2).toBe(metaMetrics);
    });
  });

  describe('Disabling', () => {
    it('defaults to disabled metrics', async () => {
      mockGet.mockResolvedValue(undefined);
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
      const metaMetrics = TestMetaMetrics.getInstance();

      expect(metaMetrics.isEnabled()).toBeFalsy();
    });

    it('uses preference enabled value when set', async () => {
      mockGet.mockResolvedValue(undefined);
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();

      expect(metaMetrics.isEnabled()).toBeTruthy();
    });

    it('enables metrics', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
      await metaMetrics.enable();

      expect(mockAnalytics.optIn).toHaveBeenCalled();
      expect(metaMetrics.isEnabled()).toBeTruthy();
    });

    it('disables metrics', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();

      // Enable first
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
      await metaMetrics.enable();
      expect(mockAnalytics.optIn).toHaveBeenCalled();

      // Disable
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
      await metaMetrics.enable(false);
      expect(mockAnalytics.optOut).toHaveBeenCalled();
      expect(metaMetrics.isEnabled()).toBeFalsy();
    });

    it('does not track event when disabled', async () => {
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
      const metaMetrics = TestMetaMetrics.getInstance();
      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

      metaMetrics.trackEvent(event);

      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    });

    it('tracks event when enabled', async () => {
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.enable();
      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

      metaMetrics.trackEvent(event);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tracking', () => {
    describe('tracks event', () => {
      it('without properties (test A)', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.enable();
        const event = MetricsEventBuilder.createEventBuilder({
          category: 'test event',
        }).build();

        metaMetrics.trackEvent(event);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: event.name,
          }),
        );
      });

      it('with only non-anonymous properties (test B)', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.enable();
        const nonAnonProp = { non_anon_prop: 'test value' };
        const event = MetricsEventBuilder.createEventBuilder({
          category: 'test event',
        })
          .addProperties(nonAnonProp)
          .build();

        metaMetrics.trackEvent(event);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: event.name,
          }),
        );
      });

      it('with only anonymous properties group (test C)', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.enable();
        const groupAnonProperties = { group_anon_property: 'group anon value' };
        const event = MetricsEventBuilder.createEventBuilder({
          category: 'test event',
        })
          .addSensitiveProperties(groupAnonProperties)
          .build();

        metaMetrics.trackEvent(event);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: event.name,
          }),
        );
      });

      it('with anonymous and non-anonymous properties (test D)', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.enable();
        const nonAnonProperties = { non_anon_prop: 'non anon value' };
        const anonProperties = { group_anon_property: 'group anon value' };
        const event = MetricsEventBuilder.createEventBuilder({
          category: 'test event',
        })
          .addProperties(nonAnonProperties)
          .addSensitiveProperties(anonProperties)
          .build();

        metaMetrics.trackEvent(event);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: event.name,
          }),
        );
      });
    });
  });

  describe('Grouping', () => {
    it('groups user (deprecated - no-op)', async () => {
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.enable();
      const groupId = 'group1';
      const groupTraits = { trait1: 'value1' };
      await metaMetrics.group(groupId, groupTraits);

      // Deprecated method - should be no-op
      expect(mockAnalytics.identify).not.toHaveBeenCalled();
    });

    it('does not groups user if disabled (deprecated - no-op)', async () => {
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
      const metaMetrics = TestMetaMetrics.getInstance();
      const groupId = 'group1';
      const groupTraits = { trait1: 'value1' };
      await metaMetrics.group(groupId, groupTraits);

      // Deprecated method - should be no-op
      expect(mockAnalytics.identify).not.toHaveBeenCalled();
    });
  });

  describe('User Traits', () => {
    it('adds traits to user', async () => {
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.enable();
      const userTraits = { trait1: 'value1' };
      await metaMetrics.addTraitsToUser(userTraits);

      expect(mockAnalytics.identify).toHaveBeenCalledWith(userTraits);
    });

    it('does not add traits to user when disabled', async () => {
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
      const metaMetrics = TestMetaMetrics.getInstance();
      const userTraits = { trait1: 'value1' };
      await metaMetrics.addTraitsToUser(userTraits);

      expect(mockAnalytics.identify).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('resets (deprecated - no-op)', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.reset();

      // Deprecated method - should be no-op
      expect(mockAnalytics.optOut).not.toHaveBeenCalled();
    });

    it('flushes (deprecated - no-op)', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.flush();

      // Deprecated method - should be no-op
      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('Ids', () => {
    it('is returned from analytics utility', async () => {
      const UUID = '12345678-1234-4234-b234-123456789012';
      (mockAnalytics.getAnalyticsId as jest.Mock).mockResolvedValue(UUID);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.getMetaMetricsId()).toEqual(UUID);
      expect(mockAnalytics.getAnalyticsId).toHaveBeenCalled();
    });

    it('maintains same user id', async () => {
      const testID = '12345678-1234-4234-b234-123456789012';
      (mockAnalytics.getAnalyticsId as jest.Mock).mockResolvedValue(testID);
      const metaMetrics = TestMetaMetrics.getInstance();

      const metricsId = await metaMetrics.getMetaMetricsId();
      expect(metricsId).toEqual(testID);
    });

    it('uses analytics ID from utility', async () => {
      const UUID = '12345678-1234-4234-b234-123456789012';
      (mockAnalytics.getAnalyticsId as jest.Mock).mockResolvedValue(UUID);
      const metaMetrics = TestMetaMetrics.getInstance();

      expect(await metaMetrics.getMetaMetricsId()).toEqual(UUID);
    });
  });

  describe('E2E Mode', () => {
    beforeEach(() => {
      mockTrackE2EEvent.mockClear();
    });

    const testE2EMode = async (isE2E: boolean) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const utils = require('../../util/test/utils');
      utils.isE2E = isE2E;

      // Ensure analytics is enabled for the test
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);

      const metaMetrics = MetaMetrics.getInstance();
      await metaMetrics.enable();

      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

      metaMetrics.trackEvent(event);

      if (isE2E) {
        expect(mockTrackE2EEvent).toHaveBeenCalledWith(event);
      } else {
        expect(mockTrackE2EEvent).not.toHaveBeenCalled();
      }
    };

    it('calls MetaMetricsTestUtils.trackEvent when isE2E is true', async () => {
      await testE2EMode(true);
    });

    it('does not call MetaMetricsTestUtils.trackEvent when isE2E is false', async () => {
      await testE2EMode(false);
    });
  });
});

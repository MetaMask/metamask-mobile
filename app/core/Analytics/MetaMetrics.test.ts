import MetaMetrics from './MetaMetrics';
import StorageWrapper from '../../store/storage-wrapper';
import {
  ANALYTICS_DATA_DELETION_DATE,
  METAMETRICS_DELETION_REGULATION_ID,
} from '../../constants/storage';
import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
} from './MetaMetrics.types';
import { MetricsEventBuilder } from './MetricsEventBuilder';
import { analytics } from '../../util/analytics/analytics';

jest.mock('../../store/storage-wrapper');
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockClear = jest.fn();

jest.mock('axios');

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

  describe('Configuration', () => {
    it('succeeds', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
    });
    it('fails silently', async () => {
      StorageWrapper.getItem = jest.fn().mockRejectedValue(new Error('error'));
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeFalsy();
    });
  });

  describe('Disabling', () => {
    it('defaults to disabled metrics', async () => {
      mockGet.mockResolvedValue(undefined);
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(metaMetrics.isEnabled()).toBeFalsy();
    });

    it('uses preference enabled value when set', async () => {
      mockGet.mockResolvedValue(undefined);
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(metaMetrics.isEnabled()).toBeTruthy();
    });

    it('enables metrics', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
      await metaMetrics.enable();

      expect(mockAnalytics.optIn).toHaveBeenCalled();
      expect(metaMetrics.isEnabled()).toBeTruthy();
    });

    it('disables metrics', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

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
      expect(await metaMetrics.configure()).toBeTruthy();
      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

      metaMetrics.trackEvent(event);

      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    });

    it('tracks event when enabled', async () => {
      (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
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
        await metaMetrics.configure();
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
        await metaMetrics.configure();
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
        await metaMetrics.configure();
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
        await metaMetrics.configure();
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

    describe('saveDataRecording', () => {
      it('tracks event without updating dataRecorded status', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.configure();
        await metaMetrics.enable();
        const event = MetricsEventBuilder.createEventBuilder({
          category: 'test event',
        }).build();

        metaMetrics.trackEvent(event, false);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: event.name,
          }),
        );
        expect(metaMetrics.isDataRecorded()).toBeFalsy();
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
      expect(await metaMetrics.configure()).toBeTruthy();
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
      expect(await metaMetrics.configure()).toBeTruthy();

      const metricsId = await metaMetrics.getMetaMetricsId();
      expect(metricsId).toEqual(testID);
    });

    it('uses analytics ID from utility', async () => {
      const UUID = '12345678-1234-4234-b234-123456789012';
      (mockAnalytics.getAnalyticsId as jest.Mock).mockResolvedValue(UUID);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(await metaMetrics.getMetaMetricsId()).toEqual(UUID);
    });
  });

  describe('Delete regulation', () => {
    describe('delete request', () => {
      it('data deletion task succeeds', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        (mockAnalytics.getAnalyticsId as jest.Mock).mockResolvedValue(
          'test-analytics-id',
        );
        (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
          status: 200,
          data: { data: { regulateId: 'TWV0YU1hc2t1c2Vzbm9wb2ludCE' } },
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as AxiosResponse<any>);

        const result = await metaMetrics.createDataDeletionTask();

        expect(result).toEqual({ status: DataDeleteResponseStatus.ok });

        expect(StorageWrapper.setItem).toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
          'TWV0YU1hc2t1c2Vzbm9wb2ludCE',
        );

        const currentDate = new Date();
        const day = currentDate.getUTCDate();
        const month = currentDate.getUTCMonth() + 1;
        const year = currentDate.getUTCFullYear();
        expect(StorageWrapper.setItem).toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
          `${day}/${month}/${year}`,
        );
      });

      it('data deletion task fails', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        (mockAnalytics.getAnalyticsId as jest.Mock).mockResolvedValue(
          'test-analytics-id',
        );
        (axios as jest.MockedFunction<typeof axios>).mockRejectedValue({
          response: {
            status: 422,
            data: { message: 'Validation error' },
          },
        } as AxiosError);

        const result = await metaMetrics.createDataDeletionTask();

        expect(result.status).toBe(DataDeleteResponseStatus.error);
        expect(result.error).toBe('Analytics Deletion Task Error');
        expect(StorageWrapper.setItem).not.toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
          expect.any(String),
        );
        expect(StorageWrapper.setItem).not.toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
          expect.any(String),
        );
      });
    });

    describe('Date', () => {
      it('gets date from preferences storage', async () => {
        const expectedDate = '04/05/2023';
        StorageWrapper.getItem = jest.fn().mockResolvedValue(expectedDate);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        expect(metaMetrics.getDeleteRegulationCreationDate()).toBe(
          expectedDate,
        );
        expect(StorageWrapper.getItem).toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
        );
      });

      it('keeps date in instance', async () => {
        const expectedDate = '04/05/2023';
        StorageWrapper.getItem = jest.fn().mockResolvedValue(expectedDate);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        // this resets the call count and changes the return value to nothing
        StorageWrapper.getItem = jest.fn().mockResolvedValue(null);
        expect(metaMetrics.getDeleteRegulationCreationDate()).toBe(
          expectedDate,
        );
        expect(StorageWrapper.getItem).not.toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
        );
      });

      it('returns empty string if no date in preferences storage', async () => {
        StorageWrapper.getItem = jest.fn().mockResolvedValue(undefined);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        expect(metaMetrics.getDeleteRegulationCreationDate()).toBeUndefined();
        expect(StorageWrapper.getItem).toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
        );
      });
    });

    describe('Regulation Id', () => {
      it('gets id from preferences storage', async () => {
        const expecterRegulationId = 'TWV0YU1hc2t1c2Vzbm9wb2ludCE';
        StorageWrapper.getItem = jest
          .fn()
          .mockResolvedValue(expecterRegulationId);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        expect(metaMetrics.getDeleteRegulationId()).toBe(expecterRegulationId);
        expect(StorageWrapper.getItem).toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
        );
      });

      it('keeps id in instance', async () => {
        const expecterRegulationId = 'TWV0YU1hc2t1c2Vzbm9wb2ludCE';
        StorageWrapper.getItem = jest
          .fn()
          .mockResolvedValue(expecterRegulationId);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        // this resets the call count and changes the return value to nothing
        StorageWrapper.getItem = jest.fn().mockResolvedValue(null);
        expect(metaMetrics.getDeleteRegulationId()).toBe(expecterRegulationId);
        expect(StorageWrapper.getItem).not.toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
        );
      });

      it('returns empty string if no id in preferences storage', async () => {
        StorageWrapper.getItem = jest.fn().mockResolvedValue(undefined);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        expect(metaMetrics.getDeleteRegulationId()).toBeUndefined();
        expect(StorageWrapper.getItem).toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
        );
      });
    });

    describe('check request', () => {
      it('data deletion task check succeeds', async () => {
        StorageWrapper.getItem = jest.fn((key) => {
          switch (key) {
            case METAMETRICS_DELETION_REGULATION_ID:
              return Promise.resolve('TWV0YU1hc2t1c2Vzbm9wb2ludCE');
            case ANALYTICS_DATA_DELETION_DATE:
              return Promise.resolve('11/12/2023');
            default:
              return Promise.resolve('');
          }
        });

        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
          status: 200,
          data: {
            data: {
              regulation: {
                id: 'TWV0YU1hc2t1c2Vzbm9wb2ludCE',
                workspaceId: 'TWV0YUZveA',
                overallStatus: 'RUNNING',
                createdAt: '2023-12-11T01:23:45.123456Z',
                streamStatus: [
                  {
                    id: 'RXRoZXJldW1SdWxleiE',
                    destinationStatus: [
                      {
                        name: 'Segment',
                        id: 'segment',
                        status: 'RUNNING',
                        errString: '',
                        errCode: 0,
                        finishedAt: null,
                      },
                    ],
                  },
                ],
              },
            },
          },
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as AxiosResponse<any>);

        const {
          hasCollectedDataSinceDeletionRequest,
          deletionRequestDate,
          dataDeletionRequestStatus,
        } = await metaMetrics.checkDataDeleteStatus();

        expect(hasCollectedDataSinceDeletionRequest).toBeFalsy();
        expect(dataDeletionRequestStatus).toEqual(DataDeleteStatus.running);
        expect(deletionRequestDate).toEqual('11/12/2023');
      });

      it('data deletion task check fails without METAMETRICS_DELETION_REGULATION_ID', async () => {
        StorageWrapper.getItem = jest.fn().mockResolvedValue(undefined);
        const metaMetrics = TestMetaMetrics.getInstance();

        const {
          hasCollectedDataSinceDeletionRequest,
          deletionRequestDate,
          dataDeletionRequestStatus,
        } = await metaMetrics.checkDataDeleteStatus();

        expect(
          axios as jest.MockedFunction<typeof axios>,
        ).not.toHaveBeenCalled();
        expect(hasCollectedDataSinceDeletionRequest).toBeFalsy();
        expect(dataDeletionRequestStatus).toEqual(DataDeleteStatus.unknown);
        expect(deletionRequestDate).toBeUndefined();
      });
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
      await metaMetrics.configure();
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

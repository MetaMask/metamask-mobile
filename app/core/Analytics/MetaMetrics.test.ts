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
// StorageWrapper is already globally mocked in testSetup.js
const mockedStorageWrapper = jest.mocked(StorageWrapper);

jest.mock('./SegmentPersistor', () => ({
  segmentPersistor: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('axios');

// Mock whenEngineReady
jest.mock('./whenEngineReady', () => ({
  whenEngineReady: jest.fn().mockResolvedValue(undefined),
}));

// Mock analytics module
jest.mock('./analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
    trackView: jest.fn(),
    identify: jest.fn(),
    optIn: jest.fn(),
    optOut: jest.fn(),
    socialOptIn: jest.fn(),
    socialOptOut: jest.fn(),
    optInForRegularAccount: jest.fn(),
    optOutForRegularAccount: jest.fn(),
    optInForSocialAccount: jest.fn(),
    optOutForSocialAccount: jest.fn(),
    getAnalyticsId: jest.fn(),
    isEnabled: jest.fn(),
    isOptedIn: jest.fn(),
    isSocialOptedIn: jest.fn(),
    isOptedInForRegularAccount: jest.fn(),
    isOptedInForSocialAccount: jest.fn(),
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

import MetaMetrics from './MetaMetrics';
import { analytics } from './analytics';
const mockAnalytics = jest.mocked(analytics);

/**
 * Extend MetaMetrics to allow reset of the singleton instance
 */
class TestMetaMetrics extends MetaMetrics {
  public static resetInstance(): void {
    TestMetaMetrics.instance = null;
  }
}

describe('MetaMetrics', () => {
  beforeEach(async () => {
    TestMetaMetrics.resetInstance();

    // Reset analytics mocks
    jest.clearAllMocks();
    mockAnalytics.isEnabled.mockReturnValue(false);
    mockAnalytics.getAnalyticsId.mockResolvedValue('');
    mockAnalytics.isSocialOptedIn.mockResolvedValue(false);
    mockAnalytics.trackEvent.mockImplementation(() => Promise.resolve());
    mockAnalytics.identify.mockImplementation(() => Promise.resolve());

    // Reset StorageWrapper mocks (clearAll is not in global mock, but not used by MetaMetrics)
    mockedStorageWrapper.getItem.mockResolvedValue(undefined);
    mockedStorageWrapper.setItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    it('tracks events through analytics module', async () => {
      // Reset instance to ensure fresh test
      TestMetaMetrics.resetInstance();

      mockAnalytics.trackEvent.mockImplementation(() => Promise.resolve());
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      await metaMetrics.enable();

      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

      metaMetrics.trackEvent(event);

      // Verify that analytics.trackEvent was called
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(event.name, {
        anonymous: false,
      });
    });
  });

  describe('Configuration', () => {
    it('succeeds', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
    });
  });

  describe('Disabling', () => {
    it('defaults to disabled metrics', async () => {
      mockAnalytics.getAnalyticsId.mockResolvedValue('');
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(metaMetrics.isEnabled()).toBeFalsy();
    });

    it('uses controller enabled value when available', async () => {
      mockAnalytics.getAnalyticsId.mockResolvedValue('test-id');
      mockAnalytics.isEnabled.mockReturnValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(metaMetrics.isEnabled()).toBeTruthy();
    });

    it('enables metrics', async () => {
      mockAnalytics.isEnabled.mockReturnValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      await metaMetrics.enable();

      expect(mockAnalytics.optInForRegularAccount).toHaveBeenCalled();
      expect(metaMetrics.isEnabled()).toBeTruthy();
    });

    it('disables metrics', async () => {
      mockAnalytics.isEnabled
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();

      // Enable first
      await metaMetrics.enable();
      expect(mockAnalytics.optInForRegularAccount).toHaveBeenCalled();
      expect(metaMetrics.isEnabled()).toBeTruthy();

      // Disable
      await metaMetrics.enable(false);
      expect(mockAnalytics.optOutForRegularAccount).toHaveBeenCalled();
      expect(metaMetrics.isEnabled()).toBeFalsy();
    });

    it('tracks event even when disabled (controller handles enabled check)', async () => {
      mockAnalytics.isEnabled.mockReturnValue(false);
      mockAnalytics.trackEvent.mockImplementation(() => Promise.resolve());
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

      metaMetrics.trackEvent(event);

      // MetaMetrics no longer checks isEnabled - controller handles it
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
    });

    it('tracks event when enabled', async () => {
      mockAnalytics.isEnabled.mockReturnValue(true);
      mockAnalytics.trackEvent.mockImplementation(() => Promise.resolve());
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      await metaMetrics.enable();
      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

      metaMetrics.trackEvent(event);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
        event.name,
        expect.objectContaining({ anonymous: false }),
      );
    });
  });

  describe('enableSocialLogin', () => {
    beforeEach(() => {
      TestMetaMetrics.resetInstance();
      jest.clearAllMocks();
    });

    it('enables social login metrics', async () => {
      mockAnalytics.isSocialOptedIn.mockResolvedValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      await metaMetrics.enableSocialLogin(true);

      expect(mockAnalytics.optInForSocialAccount).toHaveBeenCalled();
    });

    it('disables social login metrics', async () => {
      mockAnalytics.isSocialOptedIn.mockResolvedValue(false);
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      await metaMetrics.enableSocialLogin(false);

      expect(mockAnalytics.optOutForSocialAccount).toHaveBeenCalled();
    });

    it('enables social login metrics by default when no parameter provided', async () => {
      mockAnalytics.isSocialOptedIn.mockResolvedValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      await metaMetrics.enableSocialLogin();

      expect(mockAnalytics.optInForSocialAccount).toHaveBeenCalled();
    });

    it('calls analytics.optInForSocialAccount when enabling social login metrics', async () => {
      mockAnalytics.isEnabled.mockReturnValue(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      await metaMetrics.enableSocialLogin(true);

      expect(mockAnalytics.optInForSocialAccount).toHaveBeenCalled();
      // No longer writes to StorageWrapper - controller handles persistence
    });

    it('calls analytics.optOutForSocialAccount when disabling social login metrics', async () => {
      mockAnalytics.isEnabled.mockReturnValue(false);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      await metaMetrics.enableSocialLogin(false);

      expect(mockAnalytics.optOutForSocialAccount).toHaveBeenCalled();
      // No longer writes to StorageWrapper - controller handles persistence
    });

    it('calls analytics methods for social login state changes', async () => {
      mockAnalytics.isEnabled
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      jest.clearAllMocks();

      // Enable social login
      await metaMetrics.enableSocialLogin(true);
      expect(mockAnalytics.optInForSocialAccount).toHaveBeenCalledTimes(1);
      expect(mockAnalytics.optOutForSocialAccount).not.toHaveBeenCalled();

      // Disable social login
      await metaMetrics.enableSocialLogin(false);
      expect(mockAnalytics.optOutForSocialAccount).toHaveBeenCalledTimes(1);
      expect(mockAnalytics.optInForSocialAccount).toHaveBeenCalledTimes(1);

      // Re-enable social login
      await metaMetrics.enableSocialLogin(true);
      expect(mockAnalytics.optInForSocialAccount).toHaveBeenCalledTimes(2);
      expect(mockAnalytics.optOutForSocialAccount).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tracking', () => {
    /* This is the matrix of tracking use cases based on extension behaviour.
     * it's also retro compatible with our individual anonymous events.
     *
     * How to read it? Here are some examples:
     * - Test A means non-anonymous tracking (NA) and it has no props at all:
     *   The result must be only one non-anonymous event without any props (EMPTY) and no anonymous event at all (NONE).
     * - Test D means anonymous tracking (A) and it has both non-anonymous and anonymous props:
     *   The result must be a non-anonymous event with non-anonymous props (NA PROPS) and an anonymous event with all props (NA PROPS + A PROPS).
     *
     * | Test | Non-anon prop | Anon prop | Result non-anon (NA) event | Result anon (A) event |
     * |------|---------------|-----------|----------------------------|-----------------------|
     * | A    | NO            | NO        | EMPTY                      | NONE                  |
     * | B    | YES           | NO        | NA PROPS                   | NONE                  |
     * | C    | NO            | YES       | EMPTY                      | A PROPS               |
     * | D    | YES           | YES       | NA PROPS                   | NA PROPS + A PROPS    |
     *
     * For C0/C1/C2:
     * - individual prop is one that is mixed with others but is of the form `prop = { anonymous: true, value: 'anon value' }`
     * - group anonymous props are of the form `prop = 'anon value'` but are grouped in an object implementing the SensitiveProperties interface.
     * - mixed means both types in the same event
     *
     * The following test cases include the code (A,B, C0/C1 and D) of the test in the table for reference.
     */
    describe('tracks event', () => {
      it('without properties (test A)', async () => {
        mockAnalytics.trackEvent.mockImplementation(() => Promise.resolve());
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.configure();
        await metaMetrics.enable();
        const event = MetricsEventBuilder.createEventBuilder({
          category: 'test event',
        }).build();

        metaMetrics.trackEvent(event);

        // check if the event was tracked through analytics module
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(event.name, {
          anonymous: false,
        });
        expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
      });

      it('with only non-anonymous properties (test B)', async () => {
        mockAnalytics.trackEvent.mockImplementation(() => Promise.resolve());
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

        // check if the event was tracked through analytics module
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(event.name, {
          anonymous: false,
          ...nonAnonProp,
        });
        expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
      });

      it('with only anonymous properties group (test C)', async () => {
        mockAnalytics.trackEvent.mockImplementation(() => Promise.resolve());
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

        // check if the event was tracked through analytics module
        // non-anonymous event has no properties.
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(event.name, {
          anonymous: false,
          ...{},
        });

        // anonymous event has group anon properties
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(event.name, {
          anonymous: true,
          ...groupAnonProperties,
        });

        // two events should be tracked, one anonymous and one non-anonymous
        expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(2);
      });

      it('with anonymous and non-anonymous properties (test D)', async () => {
        mockAnalytics.trackEvent.mockImplementation(() => Promise.resolve());
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

        // non-anonymous event only has the non-anonymous properties.
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(event.name, {
          anonymous: false,
          ...nonAnonProperties,
        });

        // anonymous event has all properties
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(event.name, {
          anonymous: true,
          ...nonAnonProperties,
          ...anonProperties,
        });

        // Only two events should be tracked, one anonymous and one non-anonymous
        expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(2);
      });
    });

    describe('saveDataRecording', () => {
      it('tracks event without updating dataRecorded status', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        mockAnalytics.trackEvent.mockImplementation(() => Promise.resolve());
        await metaMetrics.configure();
        await metaMetrics.enable();
        const event = MetricsEventBuilder.createEventBuilder({
          category: 'test event',
        }).build();

        metaMetrics.trackEvent(event, false);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(event.name, {
          anonymous: false,
        });
        expect(await metaMetrics.isDataRecorded()).toBeFalsy();
      });
    });
  });

  describe('Grouping', () => {
    it('is a no-op (deprecated method)', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      const groupId = 'group1';
      const groupTraits = { trait1: 'value1' };

      // Should not throw
      await expect(
        metaMetrics.group(groupId, groupTraits),
      ).resolves.toBeUndefined();
    });
  });

  describe('User Traits', () => {
    it('adds traits to user', async () => {
      mockAnalytics.isEnabled.mockReturnValue(true);
      mockAnalytics.identify.mockImplementation(() => Promise.resolve());
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      await metaMetrics.enable();
      const userTraits = { trait1: 'value1' };

      await metaMetrics.addTraitsToUser(userTraits);

      expect(mockAnalytics.identify).toHaveBeenCalledWith(userTraits);
    });

    it('adds traits to user even when disabled (controller handles enabled check)', async () => {
      mockAnalytics.isEnabled.mockReturnValue(false);
      mockAnalytics.identify.mockImplementation(() => Promise.resolve());
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      const userTraits = { trait1: 'value1' };

      await metaMetrics.addTraitsToUser(userTraits);

      // MetaMetrics no longer checks isEnabled - controller handles it
      expect(mockAnalytics.identify).toHaveBeenCalledWith(userTraits);
    });
  });

  describe('Lifecycle', () => {
    it('reset is a no-op (deprecated method)', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();

      // Should not throw
      await expect(metaMetrics.reset()).resolves.toBeUndefined();
    });

    it('flush is a no-op (deprecated method)', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();

      // Should not throw
      await expect(metaMetrics.flush()).resolves.toBeUndefined();
    });
  });

  describe('Ids', () => {
    it('returns ID from analytics module', async () => {
      const UUID = '12345678-1234-4234-b234-123456789012';
      mockAnalytics.getAnalyticsId.mockResolvedValue(UUID);
      const metaMetrics = TestMetaMetrics.getInstance();

      const result = await metaMetrics.getMetaMetricsId();

      expect(result).toEqual(UUID);
      expect(mockAnalytics.getAnalyticsId).toHaveBeenCalled();
    });

    it('always uses analytics module for ID retrieval', async () => {
      const testID = '12345678-1234-4234-b234-123456789012';
      mockAnalytics.getAnalyticsId.mockResolvedValue(testID);
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();

      // reset the call count to check analytics module is called again
      mockAnalytics.getAnalyticsId.mockClear();
      mockAnalytics.getAnalyticsId.mockResolvedValue(testID);

      const result = await metaMetrics.getMetaMetricsId();

      expect(result).toEqual(testID);
      expect(mockAnalytics.getAnalyticsId).toHaveBeenCalled();
    });
  });

  describe('Delete regulation', () => {
    describe('delete request', () => {
      it('data deletion task succeeds', async () => {
        // Set required environment variables
        process.env.SEGMENT_DELETE_API_SOURCE_ID = 'test-source-id';
        process.env.SEGMENT_REGULATIONS_ENDPOINT = 'https://api.segment.io';

        const metaMetrics = TestMetaMetrics.getInstance();
        (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
          status: 200,
          data: { data: { regulateId: 'TWV0YU1hc2t1c2Vzbm9wb2ludCE' } },
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as AxiosResponse<any>);

        const result = await metaMetrics.createDataDeletionTask();

        expect(result).toEqual({ status: DataDeleteResponseStatus.ok });

        expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
          'TWV0YU1hc2t1c2Vzbm9wb2ludCE',
        );

        const currentDate = new Date();
        const day = currentDate.getUTCDate();
        const month = currentDate.getUTCMonth() + 1;
        const year = currentDate.getUTCFullYear();
        expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
          `${day}/${month}/${year}`,
        );
      });

      it('data deletion task fails', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        (axios as jest.MockedFunction<typeof axios>).mockRejectedValue({
          response: {
            status: 422,
            data: { message: 'Validation error' },
          },
        } as AxiosError);

        const result = await metaMetrics.createDataDeletionTask();

        expect(result.status).toBe(DataDeleteResponseStatus.error);
        expect(result.error).toBe('Analytics Deletion Task Error');
        expect(mockedStorageWrapper.setItem).not.toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
          expect.any(String),
        );
        expect(mockedStorageWrapper.setItem).not.toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
          expect.any(String),
        );
      });
    });

    describe('Date', () => {
      it('gets date from preferences storage', async () => {
        const expectedDate = '04/05/2023';
        mockedStorageWrapper.getItem.mockResolvedValue(expectedDate);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        expect(await metaMetrics.getDeleteRegulationCreationDate()).toBe(
          expectedDate,
        );
        expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
        );
      });

      it('reads from storage on each call', async () => {
        const expectedDate = '04/05/2023';
        mockedStorageWrapper.getItem.mockResolvedValue(expectedDate);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();

        expect(await metaMetrics.getDeleteRegulationCreationDate()).toBe(
          expectedDate,
        );
        expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
        );

        // this resets the call count to verify it reads from storage again
        mockedStorageWrapper.getItem.mockClear();
        mockedStorageWrapper.getItem.mockResolvedValue(expectedDate);
        expect(await metaMetrics.getDeleteRegulationCreationDate()).toBe(
          expectedDate,
        );
        expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
        );
      });

      it('returns undefined if no date in preferences storage', async () => {
        mockedStorageWrapper.getItem.mockResolvedValue(undefined);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        expect(
          await metaMetrics.getDeleteRegulationCreationDate(),
        ).toBeUndefined();
        expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
          ANALYTICS_DATA_DELETION_DATE,
        );
      });
    });

    describe('Regulation Id', () => {
      it('gets id from preferences storage', async () => {
        const expecterRegulationId = 'TWV0YU1hc2t1c2Vzbm9wb2ludCE';
        mockedStorageWrapper.getItem.mockResolvedValue(expecterRegulationId);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        expect(await metaMetrics.getDeleteRegulationId()).toBe(
          expecterRegulationId,
        );
        expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
        );
      });

      it('reads from storage on each call', async () => {
        const expecterRegulationId = 'TWV0YU1hc2t1c2Vzbm9wb2ludCE';
        mockedStorageWrapper.getItem.mockResolvedValue(expecterRegulationId);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();

        expect(await metaMetrics.getDeleteRegulationId()).toBe(
          expecterRegulationId,
        );
        expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
        );

        // this resets the call count to verify it reads from storage again
        mockedStorageWrapper.getItem.mockClear();
        mockedStorageWrapper.getItem.mockResolvedValue(expecterRegulationId);
        expect(await metaMetrics.getDeleteRegulationId()).toBe(
          expecterRegulationId,
        );
        expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
        );
      });

      it('returns undefined if no id in preferences storage', async () => {
        mockedStorageWrapper.getItem.mockResolvedValue(undefined);
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        expect(await metaMetrics.getDeleteRegulationId()).toBeUndefined();
        expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
          METAMETRICS_DELETION_REGULATION_ID,
        );
      });
    });

    describe('check request', () => {
      it('data deletion task check succeeds', async () => {
        mockedStorageWrapper.getItem.mockImplementation((key) => {
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
        mockedStorageWrapper.getItem.mockResolvedValue(undefined);
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

  // TODO: implement e2e mode in controller init
  // Keep this commented code for ref
  // describe('E2E Mode', () => {
  //   beforeEach(() => {
  //     mockTrackE2EEvent.mockClear();
  //   });

  //   const testE2EMode = async (isE2E: boolean) => {
  //     // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  //     const utils = require('../../util/test/utils');
  //     utils.isE2E = isE2E;

  //     mockAnalytics.trackEvent.mockImplementation(() => {});
  //     const metaMetrics = MetaMetrics.getInstance();
  //     await metaMetrics.configure();
  //     await metaMetrics.enable();

  //     const event = MetricsEventBuilder.createEventBuilder({
  //       category: 'test event',
  //     }).build();

  //     metaMetrics.trackEvent(event);

  //     if (isE2E) {
  //       expect(mockTrackE2EEvent).toHaveBeenCalledWith(event);
  //     } else {
  //       expect(mockTrackE2EEvent).not.toHaveBeenCalled();
  //     }
  //   };

  //   it('calls MetaMetricsTestUtils.trackEvent when isE2E is true', async () => {
  //     await testE2EMode(true);
  //   });

  //   it('does not call MetaMetricsTestUtils.trackEvent when isE2E is false', async () => {
  //     await testE2EMode(false);
  //   });
  // });
});

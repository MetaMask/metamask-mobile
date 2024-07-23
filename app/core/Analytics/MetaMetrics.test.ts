import MetaMetrics from './MetaMetrics';
import StorageWrapper from '../../store/async-storage-wrapper';
import {
  AGREED,
  ANALYTICS_DATA_DELETION_DATE,
  DENIED,
  METAMETRICS_DELETION_REGULATION_ID,
  METAMETRICS_ID,
  METRICS_OPT_IN,
  MIXPANEL_METAMETRICS_ID,
} from '../../constants/storage';
import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  IMetaMetricsEvent,
} from './MetaMetrics.types';

jest.mock('react-native-default-preference');
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockClear = jest.fn();

jest.mock('axios');

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
    StorageWrapper.getItem = mockGet;
    StorageWrapper.setItem = mockSet;
    StorageWrapper.clearAll = mockClear;
    TestMetaMetrics.resetInstance();
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
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
      expect(metaMetrics.isEnabled()).toBeFalsy();
    });

    it('uses preference enabled value when set', async () => {
      mockGet.mockImplementation(async () => AGREED);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
      expect(metaMetrics.isEnabled()).toBeTruthy();
    });

    it('enables metrics', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      await metaMetrics.enable();

      expect(StorageWrapper.setItem).toHaveBeenLastCalledWith(
        METRICS_OPT_IN,
        AGREED,
      );
      expect(metaMetrics.isEnabled()).toBeTruthy();
    });

    it('disables metrics', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();

      // Enable first as it is disabled by default
      await metaMetrics.enable();
      // Test it is enabled before disabling
      expect(StorageWrapper.setItem).toHaveBeenLastCalledWith(
        METRICS_OPT_IN,
        AGREED,
      );
      expect(metaMetrics.isEnabled()).toBeTruthy();

      await metaMetrics.enable(false);

      expect(StorageWrapper.setItem).toHaveBeenLastCalledWith(
        METRICS_OPT_IN,
        DENIED,
      );
      expect(metaMetrics.isEnabled()).toBeFalsy();
    });
  });

  describe('Tracking', () => {
    it('tracks event', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      await metaMetrics.enable();
      const event: IMetaMetricsEvent = { category: 'event1' };
      const properties = { prop1: 'value1' };

      metaMetrics.trackEvent(event, properties);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
        anonymous: false,
        ...properties,
      });
    });

    it('tracks event without param', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      await metaMetrics.enable();
      const event: IMetaMetricsEvent = { category: 'event1' };

      metaMetrics.trackEvent(event);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
        anonymous: false,
        ...{},
      });
    });

    it('does not track event when diabled', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      const event: IMetaMetricsEvent = { category: 'event1' };
      const properties = { prop1: 'value1' };

      metaMetrics.trackEvent(event, properties);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.track).not.toHaveBeenCalled();
    });

    it('tracks anonymous event', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.enable();
      const event: IMetaMetricsEvent = { category: 'event1' };
      const properties = { prop1: 'value1' };

      metaMetrics.trackAnonymousEvent(event, properties);

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      // the anonymous part should not have a user id
      expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
        anonymous: true,
        ...properties,
      });
      // non anonymous part should not have properties
      expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
        anonymous: true,
      });
    });

    it('tracks anonymous event without param', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.enable();
      const event: IMetaMetricsEvent = { category: 'event1' };

      metaMetrics.trackAnonymousEvent(event);

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      // the anonymous part should not have a user id
      expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
        anonymous: true,
        ...{},
      });
      // non anonymous part should not have properties
      expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
        anonymous: true,
      });
    });

    it('does not track anonymous event if disabled', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      const event: IMetaMetricsEvent = { category: 'event1' };
      const properties = { prop1: 'value1' };

      metaMetrics.trackAnonymousEvent(event, properties);

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.track).not.toHaveBeenCalled();
    });

    it('tracks event without updating dataRecorded status', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      await metaMetrics.enable();
      const event: IMetaMetricsEvent = { category: 'event1' };
      const properties = { prop1: 'value1' };

      metaMetrics.trackEvent(event, properties, false);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
        anonymous: false,
        ...properties,
      });
      expect(metaMetrics.isDataRecorded()).toBeFalsy();
    });

    describe('Legacy events', () => {
      it('tracks legacy properties', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = {
          category: 'event1',
          properties: { action: 'action1', name: 'description1' },
        };

        metaMetrics.trackEvent(event);

        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { segmentMockClient } = global as any;
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: false,
          ...event.properties,
        });
      });

      it('overrides legacy properties', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = {
          category: 'event1',
          properties: { action: 'action1', name: 'description1' },
        };
        const properties = { action: 'action2', name: 'description2' };

        metaMetrics.trackEvent(event, properties);

        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { segmentMockClient } = global as any;
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: false,
          ...properties,
        });
      });

      it('does not break on JS legacy call', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        await metaMetrics.enable();

        const event = undefined;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error: Testing untyped legacy JS call with undefined event
        metaMetrics.trackEvent(event);

        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { segmentMockClient } = global as any;
        expect(segmentMockClient.track).toHaveBeenCalledWith(undefined, {
          anonymous: false,
          undefined,
        });
      });
    });
  });

  describe('Grouping', () => {
    it('groups user', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.enable();
      const groupId = 'group1';
      const groupTraits = { trait1: 'value1' };
      metaMetrics.group(groupId, groupTraits);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.group).toHaveBeenCalledWith(
        groupId,
        groupTraits,
      );
    });

    it('does not groups user if disabled', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      const groupId = 'group1';
      const groupTraits = { trait1: 'value1' };
      metaMetrics.group(groupId, groupTraits);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.group).not.toHaveBeenCalled();
    });
  });

  describe('User Traits', () => {
    it('adds traits to user', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      await metaMetrics.enable();
      const userTraits = { trait1: 'value1' };
      await metaMetrics.addTraitsToUser(userTraits);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.identify).toHaveBeenCalledWith(
        expect.any(String),
        userTraits,
      );
    });

    it('does not add traits to user when disabled', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      const userTraits = { trait1: 'value1' };
      await metaMetrics.addTraitsToUser(userTraits);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.identify).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('resets', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.reset();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.reset).toHaveBeenCalledWith(true);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(METAMETRICS_ID, '');
    });

    it('flushes the segment client', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.flush();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.flush).toHaveBeenCalled();
    });
  });

  describe('Ids', () => {
    it('is returned from StorageWrapper when instance not configured', async () => {
      const UUID = '00000000-0000-0000-0000-000000000000';
      mockGet.mockImplementation(async (key: string) =>
        key === METAMETRICS_ID ? UUID : '',
      );
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.getMetaMetricsId()).toEqual(UUID);
      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METAMETRICS_ID);
    });

    it('is returned from memory when instance configured', async () => {
      const testID = '00000000-0000-0000-0000-000000000000';
      mockGet.mockImplementation(async () => testID);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      // reset the call count to checj no new calls are made
      mockGet.mockClear();

      expect(await metaMetrics.getMetaMetricsId()).toEqual(testID);
      expect(StorageWrapper.getItem).not.toHaveBeenCalled();
    });

    it('uses Mixpanel ID if it is set', async () => {
      const mixPanelUUID = '00000000-0000-0000-0000-000000000000';
      mockGet.mockImplementation(async () => mixPanelUUID);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(StorageWrapper.getItem).toHaveBeenNthCalledWith(
        2,
        MIXPANEL_METAMETRICS_ID,
      );
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        METAMETRICS_ID,
        mixPanelUUID,
      );
      expect(StorageWrapper.getItem).not.toHaveBeenCalledWith(METAMETRICS_ID);
      expect(await metaMetrics.getMetaMetricsId()).toEqual(mixPanelUUID);
    });

    it('uses Metametrics ID if it is set', async () => {
      const UUID = '00000000-0000-0000-0000-000000000000';
      mockGet.mockImplementation(async (key: string) =>
        key === METAMETRICS_ID ? UUID : '',
      );
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(StorageWrapper.getItem).toHaveBeenNthCalledWith(
        2,
        MIXPANEL_METAMETRICS_ID,
      );
      expect(StorageWrapper.getItem).toHaveBeenNthCalledWith(3, METAMETRICS_ID);
      expect(StorageWrapper.setItem).not.toHaveBeenCalled();
      expect(await metaMetrics.getMetaMetricsId()).toEqual(UUID);
    });

    it('maintains same user id', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      const metricsId = await metaMetrics.getMetaMetricsId();
      expect(metricsId).not.toEqual('');

      // create a new instance and check that user id was not changed
      TestMetaMetrics.getInstance();

      expect(StorageWrapper.setItem).not.toHaveBeenCalledWith(
        METAMETRICS_ID,
        '',
      );
      expect(StorageWrapper.getItem).toHaveBeenNthCalledWith(3, METAMETRICS_ID);
      expect(await metaMetrics.getMetaMetricsId()).toEqual(metricsId);
    });

    it('resets user id', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      const metricsId = await metaMetrics.getMetaMetricsId();
      expect(metricsId).not.toEqual('');

      // reset the instance and SDK must reset user id
      await metaMetrics.reset();

      // Check change on the MetaMerics class side
      expect(StorageWrapper.setItem).toHaveBeenNthCalledWith(
        2,
        METAMETRICS_ID,
        '',
      );

      // Check MetaMerics class calls the Segment SDK reset
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { segmentMockClient } = global as any;
      expect(segmentMockClient.reset).toHaveBeenCalledTimes(1);
      expect(segmentMockClient.reset).toHaveBeenCalledWith(true);

      // create a new instance and check user id is different
      TestMetaMetrics.getInstance();
      const metricsId2 = await metaMetrics.getMetaMetricsId();

      expect(metricsId2).not.toEqual('');
      expect(metricsId).not.toEqual(metricsId2);
    });
  });

  describe('Delete regulation', () => {
    describe('delete request', () => {
      it('data deletion task succeeds', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
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
});

import MetaMetrics from './MetaMetrics';
import StorageWrapper from '../../store/storage-wrapper';
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
  ISegmentClient,
} from './MetaMetrics.types';

jest.mock('../../store/storage-wrapper');
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

interface GlobalWithSegmentClient {
  segmentMockClient: ISegmentClient;
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

    it('does not track event when disabled', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      const event: IMetaMetricsEvent = { category: 'test event' };
      const properties = { regular_prop: 'test value' };

      metaMetrics.trackEvent(event, properties);

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

      expect(StorageWrapper.setItem).not.toHaveBeenCalledWith(
        METRICS_OPT_IN,
        AGREED,
      );
      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
      expect(segmentMockClient.track).not.toHaveBeenCalled();
    });

    it('tracks event when enabled', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();
      await metaMetrics.enable();
      const event: IMetaMetricsEvent = { category: 'test event' };

      metaMetrics.trackEvent(event);

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

      // check tracking enabling
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        METRICS_OPT_IN,
        AGREED,
      );
      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);

      // check that the tracking was called
      expect(segmentMockClient.track).toHaveBeenCalledTimes(1);
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
     * | Test |  Track  | Non-anon prop | Anon prop | Result non-anon (NA) event | Result anon (A) event |
     * |------|---------|---------------|-----------|----------------------------|-----------------------|
     * | A    | NA      | NO            | NO        | EMPTY                      | NONE                  |
     * | B    | NA      | YES           | NO        | NA PROPS                   | NONE                  |
     * | C0   | NA      | NO            | YES(indiv)| EMPTY                      | A PROPS               |
     * | C1   | NA      | NO            | YES(group)| EMPTY                      | A PROPS               |
     * | C2   | NA      | NO            | YES(mixed)| EMPTY                      | A PROPS               |
     * | D    | NA      | YES           | YES       | NA PROPS                   | NA PROPS + A PROPS    |
     *
     * For C0/C1:
     * - individual prop is one that is mixed with others but is of the form `prop = { anonymous: true, value: 'anon value' }`
     * - group anonymous props are of the form `prop = 'anon value'` but are grouped in an object implementing the SensitiveProperties interface.
     *
     * The following test cases include the code (A,B, C0/C1 and D) of the test in the table for reference.
     */
    describe('tracks event', () => {
      it('without properties (test A)', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = { category: 'test event' };

        metaMetrics.trackEvent(event);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // check if the event was tracked
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: false,
          ...{},
        });
        expect(segmentMockClient.track).toHaveBeenCalledTimes(1);
      });

      it('with only non-anonymous properties (test B)', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = { category: 'test event' };
        const nonAnonProp = { non_anon_prop: 'test value' };

        metaMetrics.trackEvent(event, nonAnonProp);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // check if the event was tracked
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: false,
          ...nonAnonProp,
        });
        expect(segmentMockClient.track).toHaveBeenCalledTimes(1);
      });

      it('with only individual anonymous properties (test C0)', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = { category: 'test event' };

        const individualAnonProperties = {
          individual_anon_property: { anonymous: true, value: 'anon value' },
        };

        // this call is backward-compatible with the previous system
        metaMetrics.trackEvent(event, individualAnonProperties);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // check if the event was tracked
        // non-anonymous event has no properties.
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: false,
          ...{},
        });

        // anonymous event has individual anon properties
        // the prop value must be extracted and passed directly as a value.
        // the original anonymous prop of the prop is discarded.
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: true,
          ...{
            individual_anon_property:
              individualAnonProperties.individual_anon_property.value,
          },
        });

        // two events should be tracked, one anonymous and one non-anonymous
        expect(segmentMockClient.track).toHaveBeenCalledTimes(2);
      });

      it('with only anonymous properties group (test C1)', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = { category: 'test event' };

        const groupAnonProperties = { group_anon_property: 'group anon value' };
        const properties = {
          sensitiveProperties: { ...groupAnonProperties },
        };

        metaMetrics.trackEvent(event, properties);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // check if the event was tracked
        // non-anonymous event has no properties.
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: false,
          ...{},
        });

        // anonymous event has group anon properties
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: true,
          ...groupAnonProperties,
        });

        // two events should be tracked, one anonymous and one non-anonymous
        expect(segmentMockClient.track).toHaveBeenCalledTimes(2);
      });

      it('with mixed (group and individual) anonymous properties (test C2)', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = { category: 'test event' };

        const individualAnonProperties = {
          anon_prop: { anonymous: true, value: 'anon value' },
        };
        const groupAnonProperties = { group_anon_property: 'group anon value' };
        const properties = {
          properties: { ...individualAnonProperties },
          sensitiveProperties: { ...groupAnonProperties },
        };

        metaMetrics.trackEvent(event, properties);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // check if the event was tracked
        // non-anonymous event has no properties.
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: false,
          ...{},
        });

        // anonymous event has both individual and group anon properties
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: true,
          ...{
            individual_anon_property: individualAnonProperties.anon_prop.value,
          },
          ...groupAnonProperties,
        });

        // two events should be tracked, one anonymous and one non-anonymous
        expect(segmentMockClient.track).toHaveBeenCalledTimes(2);
      });

      it('with anonymous and non-anonymous properties (test D)', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = { category: 'test event' };

        const nonAnonProperties = { non_anon_prop: 'non anon value' };
        const individualAnonProperties = {
          anon_prop: { anonymous: true, value: 'anon value' },
        };
        const groupAnonProperties = { group_anon_property: 'group anon value' };

        // Testing only the mixed non-anon/individual-anon/group-anon properties case as it covers all other cases.
        const properties = {
          properties: {
            ...nonAnonProperties,
            ...individualAnonProperties,
          },
          sensitiveProperties: { ...groupAnonProperties },
        };

        metaMetrics.trackEvent(event, properties);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // non-anonymous event only has the non-anonymous properties.
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: false,
          ...nonAnonProperties,
        });

        // anonymous event has all properties
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: true,
          ...nonAnonProperties,
          ...{ anon_prop: individualAnonProperties.anon_prop.value },
          ...groupAnonProperties,
        });

        // Only two events should be tracked, one anonymous and one non-anonymous
        expect(segmentMockClient.track).toHaveBeenCalledTimes(2);
      });
    });

    describe('saveDataRecording', () => {
      it('tracks event without updating dataRecorded status', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = { category: 'test event' };
        const properties = { regular_prop: 'test value' };

        metaMetrics.trackEvent(event, properties, false);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.category, {
          anonymous: false,
          ...properties,
        });
        expect(metaMetrics.isDataRecorded()).toBeFalsy();
      });
    });

    describe('Legacy events', () => {
      it('tracks legacy properties', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        expect(await metaMetrics.configure()).toBeTruthy();
        await metaMetrics.enable();
        const event: IMetaMetricsEvent = {
          category: 'test event',
          properties: { action: 'test action', name: 'test description' },
        };

        metaMetrics.trackEvent(event);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

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
          category: 'test event',
          properties: {
            action: 'legacy test action',
            name: 'legacy test description',
          },
        };
        const properties = {
          action: 'overriding test action',
          name: 'overriding test description',
        };

        metaMetrics.trackEvent(event, properties);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

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

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

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

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

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

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

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

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

      expect(segmentMockClient.identify).toHaveBeenCalledWith(
        expect.any(String),
        userTraits,
      );
    });

    it('does not add traits to user when disabled', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      const userTraits = { trait1: 'value1' };
      await metaMetrics.addTraitsToUser(userTraits);

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

      expect(segmentMockClient.identify).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('resets', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.reset();

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

      expect(segmentMockClient.reset).toHaveBeenCalledWith(true);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(METAMETRICS_ID, '');
    });

    it('flushes the segment client', async () => {
      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.flush();

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

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

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

      // Check MetaMerics class calls the Segment SDK reset
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

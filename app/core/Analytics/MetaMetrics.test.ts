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
  ISegmentClient,
} from './MetaMetrics.types';
import { MetricsEventBuilder } from './MetricsEventBuilder';
import { segmentPersistor } from './SegmentPersistor';
import { createClient } from '@segment/analytics-react-native';
import { validate } from 'uuid';
import { isHexAddress } from '@metamask/utils';

jest.mock('../../store/storage-wrapper');
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockClear = jest.fn();

jest.mock('./SegmentPersistor', () => ({
  segmentPersistor: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('axios');

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
    it('uses custom persistor for Segment client', async () => {
      // Reset instance to ensure fresh test
      TestMetaMetrics.resetInstance();

      const metaMetrics = TestMetaMetrics.getInstance();
      await metaMetrics.configure();
      await metaMetrics.enable();

      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

      metaMetrics.trackEvent(event);

      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

      // Verify that track is called (event is queued)
      expect(segmentMockClient.track).toHaveBeenCalledWith(event.name, {
        anonymous: false,
      });

      // The key test: verify that createClient was called with our custom persistor
      // This proves that the Segment client was initialized with our persistor
      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          storePersistor: segmentPersistor,
        }),
      );

      // Test that the client can flush (send queued events)
      await metaMetrics.flush();
      expect(segmentMockClient.flush).toHaveBeenCalled();
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

    describe('flush policy configuration', () => {
      it('creates flush policies with default values', () => {
        TestMetaMetrics.resetInstance();
        jest.clearAllMocks();

        TestMetaMetrics.getInstance();

        // Verify that createClient was called with flush policies
        expect(createClient).toHaveBeenCalledWith(
          expect.objectContaining({
            flushPolicies: expect.arrayContaining([
              expect.objectContaining({ count: 20 }), // default event limit
              expect.objectContaining({ interval: 30000 }), // default 30 seconds in milliseconds
            ]),
          }),
        );
      });
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
      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

      metaMetrics.trackEvent(event);

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
      const event = MetricsEventBuilder.createEventBuilder({
        category: 'test event',
      }).build();

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
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.configure();
        await metaMetrics.enable();
        const event = MetricsEventBuilder.createEventBuilder({
          category: 'test event',
        }).build();

        metaMetrics.trackEvent(event);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // check if the event was tracked
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.name, {
          anonymous: false,
        });
        expect(segmentMockClient.track).toHaveBeenCalledTimes(1);
      });

      it('with only non-anonymous properties (test B)', async () => {
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

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // check if the event was tracked
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.name, {
          anonymous: false,
          ...nonAnonProp,
        });
        expect(segmentMockClient.track).toHaveBeenCalledTimes(1);
      });

      it('with only anonymous properties group (test C)', async () => {
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

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // check if the event was tracked
        // non-anonymous event has no properties.
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.name, {
          anonymous: false,
          ...{},
        });

        // anonymous event has group anon properties
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.name, {
          anonymous: true,
          ...groupAnonProperties,
        });

        // two events should be tracked, one anonymous and one non-anonymous
        expect(segmentMockClient.track).toHaveBeenCalledTimes(2);
      });

      it('with anonymous and non-anonymous properties (test D)', async () => {
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

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        // non-anonymous event only has the non-anonymous properties.
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.name, {
          anonymous: false,
          ...nonAnonProperties,
        });

        // anonymous event has all properties
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.name, {
          anonymous: true,
          ...nonAnonProperties,
          ...anonProperties,
        });

        // Only two events should be tracked, one anonymous and one non-anonymous
        expect(segmentMockClient.track).toHaveBeenCalledTimes(2);
      });
    });

    describe('saveDataRecording', () => {
      it('tracks event without updating dataRecorded status', async () => {
        const metaMetrics = TestMetaMetrics.getInstance();
        await metaMetrics.configure();
        await metaMetrics.enable();
        const event = MetricsEventBuilder.createEventBuilder({
          category: 'test event',
        }).build();

        metaMetrics.trackEvent(event, false);

        const { segmentMockClient } =
          global as unknown as GlobalWithSegmentClient;

        expect(StorageWrapper.getItem).toHaveBeenCalledWith(METRICS_OPT_IN);
        expect(segmentMockClient.track).toHaveBeenCalledWith(event.name, {
          anonymous: false,
        });
        expect(metaMetrics.isDataRecorded()).toBeFalsy();
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
      const UUID = '12345678-1234-4234-b234-123456789012';
      mockGet.mockImplementation(async (key: string) =>
        key === METAMETRICS_ID ? UUID : '',
      );
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.getMetaMetricsId()).toEqual(UUID);
      expect(StorageWrapper.getItem).toHaveBeenCalledWith(METAMETRICS_ID);
    });

    it('is returned from memory when instance configured', async () => {
      const testID = '12345678-1234-4234-b234-123456789012';
      mockGet.mockImplementation(async () => testID);
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      // reset the call count to checj no new calls are made
      mockGet.mockClear();

      expect(await metaMetrics.getMetaMetricsId()).toEqual(testID);
      expect(StorageWrapper.getItem).not.toHaveBeenCalled();
    });

    it('uses Mixpanel ID if it is set and is valid hex address', async () => {
      const mixPanelHexAddress = '0x1234567890123456789012345678901234567890';
      mockGet.mockImplementation(async (key: string) =>
        key === MIXPANEL_METAMETRICS_ID ? mixPanelHexAddress : '',
      );
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      expect(StorageWrapper.getItem).toHaveBeenNthCalledWith(
        2,
        MIXPANEL_METAMETRICS_ID,
      );
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        METAMETRICS_ID,
        mixPanelHexAddress,
      );
      expect(StorageWrapper.getItem).not.toHaveBeenCalledWith(METAMETRICS_ID);
      expect(await metaMetrics.getMetaMetricsId()).toEqual(mixPanelHexAddress);
      expect(isHexAddress(mixPanelHexAddress)).toBe(true);
    });

    it('uses Mixpanel ID with uppercase letters after converting to lowercase', async () => {
      const mixPanelHexAddressUppercase =
        '0X1234567890ABCDEF123456789012345678901234';
      const expectedLowercase = mixPanelHexAddressUppercase.toLowerCase();
      mockGet.mockImplementation(async (key: string) =>
        key === MIXPANEL_METAMETRICS_ID ? mixPanelHexAddressUppercase : '',
      );
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      const metricsId = await metaMetrics.getMetaMetricsId();

      expect(StorageWrapper.getItem).toHaveBeenNthCalledWith(
        2,
        MIXPANEL_METAMETRICS_ID,
      );
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        METAMETRICS_ID,
        mixPanelHexAddressUppercase,
      );
      expect(metricsId).toEqual(mixPanelHexAddressUppercase);
      expect(isHexAddress(expectedLowercase)).toBe(true);
    });

    it('ignores Mixpanel ID if it is not a valid hex address', async () => {
      const invalidMixpanelId = '00000000-0000-0000-0000-000000000000';
      mockGet.mockImplementation(async (key: string) =>
        key === MIXPANEL_METAMETRICS_ID ? invalidMixpanelId : '',
      );
      const metaMetrics = TestMetaMetrics.getInstance();
      expect(await metaMetrics.configure()).toBeTruthy();

      const metricsId = await metaMetrics.getMetaMetricsId();

      expect(StorageWrapper.getItem).toHaveBeenNthCalledWith(
        2,
        MIXPANEL_METAMETRICS_ID,
      );
      expect(StorageWrapper.getItem).toHaveBeenNthCalledWith(3, METAMETRICS_ID);
      expect(metricsId).not.toEqual(invalidMixpanelId);
      expect(validate(metricsId as string)).toBe(true);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        METAMETRICS_ID,
        metricsId,
      );
    });

    it('uses Metametrics ID if it is set', async () => {
      const UUID = '12345678-1234-4234-b234-123456789012';
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

    describe('corrupted ID validation', () => {
      it('regenerates new ID when stored ID is JSON-stringified empty string', async () => {
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? '""' : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).not.toEqual('""');
        expect(metricsId).not.toEqual('');
        expect(validate(metricsId as string)).toBe(true);
        expect(StorageWrapper.setItem).toHaveBeenCalledWith(
          METAMETRICS_ID,
          metricsId,
        );
      });

      it('regenerates new ID when stored ID is too short', async () => {
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? 'abc' : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).not.toEqual('abc');
        expect(validate(metricsId as string)).toBe(true);
        expect(StorageWrapper.setItem).toHaveBeenCalledWith(
          METAMETRICS_ID,
          metricsId,
        );
      });

      it('regenerates new ID when stored ID is "null" string', async () => {
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? 'null' : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).not.toEqual('null');
        expect(validate(metricsId as string)).toBe(true);
      });

      it('regenerates new ID when stored ID is "undefined" string', async () => {
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? 'undefined' : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).not.toEqual('undefined');
        expect(validate(metricsId as string)).toBe(true);
      });

      it('regenerates new ID when stored ID has invalid UUID format', async () => {
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? 'not-a-valid-uuid-format' : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).not.toEqual('not-a-valid-uuid-format');
        // casting for testing
        expect(validate(metricsId as unknown as string)).toBe(true);
      });

      it('regenerates new ID when stored ID is NIL UUID (all zeros)', async () => {
        const nilUUID = '00000000-0000-0000-0000-000000000000';
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? nilUUID : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).not.toEqual(nilUUID);
        expect(validate(metricsId as string)).toBe(true);
        expect(StorageWrapper.setItem).toHaveBeenCalledWith(
          METAMETRICS_ID,
          metricsId,
        );
      });

      it('accepts valid UUIDv4 format', async () => {
        const validUUID = '12345678-1234-4234-a234-123456789012';
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? validUUID : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).toEqual(validUUID);
        expect(StorageWrapper.setItem).not.toHaveBeenCalledWith(
          METAMETRICS_ID,
          expect.anything(),
        );
      });

      it('regenerates new ID when stored ID is version 1 UUID', async () => {
        // Example UUIDv1 format: time-based
        const uuidV1 = '12345678-1234-1234-a234-123456789012';
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? uuidV1 : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).not.toEqual(uuidV1);
        expect(validate(metricsId as string)).toBe(true);
        expect(StorageWrapper.setItem).toHaveBeenCalledWith(
          METAMETRICS_ID,
          metricsId,
        );
      });

      it('regenerates new ID when stored ID is version 3 UUID', async () => {
        // Example UUIDv3 format: MD5-based
        const uuidV3 = '12345678-1234-3234-a234-123456789012';
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? uuidV3 : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).not.toEqual(uuidV3);
        expect(validate(metricsId as string)).toBe(true);
        expect(StorageWrapper.setItem).toHaveBeenCalledWith(
          METAMETRICS_ID,
          metricsId,
        );
      });

      it('regenerates new ID when stored ID is version 5 UUID', async () => {
        // Example UUIDv5 format: SHA1-based
        const uuidV5 = '12345678-1234-5234-a234-123456789012';
        mockGet.mockImplementation(async (key: string) =>
          key === METAMETRICS_ID ? uuidV5 : '',
        );
        const metaMetrics = TestMetaMetrics.getInstance();

        await metaMetrics.configure();

        const metricsId = await metaMetrics.getMetaMetricsId();
        expect(metricsId).not.toEqual(uuidV5);
        expect(validate(metricsId as string)).toBe(true);
        expect(StorageWrapper.setItem).toHaveBeenCalledWith(
          METAMETRICS_ID,
          metricsId,
        );
      });
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

  describe('E2E Mode', () => {
    beforeEach(() => {
      mockTrackE2EEvent.mockClear();
    });

    const testE2EMode = async (isE2E: boolean) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const utils = require('../../util/test/utils');
      utils.isE2E = isE2E;

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

import MetaMetrics from './MetaMetrics';
import DefaultPreference from 'react-native-default-preference';
import {
  AGREED,
  ANALYTICS_DATA_DELETION_DATE,
  DENIED,
  METAMETRICS_ID,
  METAMETRICS_SEGMENT_REGULATION_ID,
  METRICS_OPT_IN,
  MIXPANEL_METAMETRICS_ID,
} from '../../constants/storage';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { DataDeleteResponseStatus } from './MetaMetrics.types';

jest.mock('react-native-default-preference');
const mockGet = jest.fn();
const mockSet = jest.fn();

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
    DefaultPreference.get = mockGet;
    DefaultPreference.set = mockSet;
    TestMetaMetrics.resetInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it('defaults to disabled metrics', async () => {
    mockGet.mockResolvedValue(undefined);
    const metaMetrics = await TestMetaMetrics.getInstance();

    expect(DefaultPreference.get).toHaveBeenCalledWith(METRICS_OPT_IN);
    expect(metaMetrics.isEnabled()).toBeFalsy();
  });

  it('uses preference enabled value when set', async () => {
    mockGet.mockImplementation(async () => AGREED);
    const metaMetrics = await TestMetaMetrics.getInstance();

    expect(DefaultPreference.get).toHaveBeenCalledWith(METRICS_OPT_IN);
    expect(metaMetrics.isEnabled()).toBeTruthy();
  });

  it('enables metrics', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    await metaMetrics.enable();

    expect(DefaultPreference.set).toHaveBeenLastCalledWith(
      METRICS_OPT_IN,
      AGREED,
    );
    expect(metaMetrics.isEnabled()).toBeTruthy();
  });

  it('disables metrics', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();

    // Enable first as it is disabled by default
    await metaMetrics.enable();
    // Test it is enabled before disabling
    expect(DefaultPreference.set).toHaveBeenLastCalledWith(
      METRICS_OPT_IN,
      AGREED,
    );
    expect(metaMetrics.isEnabled()).toBeTruthy();

    await metaMetrics.enable(false);

    expect(DefaultPreference.set).toHaveBeenLastCalledWith(
      METRICS_OPT_IN,
      DENIED,
    );
    expect(metaMetrics.isEnabled()).toBeFalsy();
  });

  it('tracks event', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    await metaMetrics.enable();
    const event = 'event1';
    const properties = { prop1: 'value1' };

    metaMetrics.trackEvent(event, properties);

    expect(DefaultPreference.get).toHaveBeenCalledWith(METRICS_OPT_IN);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.track).toHaveBeenCalledWith(event, {
      anonymous: false,
      ...properties,
    });
  });

  it('tracks event without param', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    await metaMetrics.enable();
    const event = 'event1';

    metaMetrics.trackEvent(event);

    expect(DefaultPreference.get).toHaveBeenCalledWith(METRICS_OPT_IN);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.track).toHaveBeenCalledWith(event, {
      anonymous: false,
      ...{},
    });
  });

  it('does not track event when diabled', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    const event = 'event1';
    const properties = { prop1: 'value1' };

    metaMetrics.trackEvent(event, properties);

    expect(DefaultPreference.get).toHaveBeenCalledWith(METRICS_OPT_IN);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.track).not.toHaveBeenCalled();
  });

  it('tracks anonymous event', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    await metaMetrics.enable();
    const event = 'event1';
    const properties = { prop1: 'value1' };

    metaMetrics.trackAnonymousEvent(event, properties);

    const { segmentMockClient } = global as any;
    // the anonymous part should not have a user id
    expect(segmentMockClient.track).toHaveBeenCalledWith(event, {
      anonymous: true,
      ...properties,
    });
    // non anonymous part should not have properties
    expect(segmentMockClient.track).toHaveBeenCalledWith(event, {
      anonymous: true,
    });
  });

  it('tracks anonymous event without param', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    await metaMetrics.enable();
    const event = 'event1';

    metaMetrics.trackAnonymousEvent(event);

    const { segmentMockClient } = global as any;
    // the anonymous part should not have a user id
    expect(segmentMockClient.track).toHaveBeenCalledWith(event, {
      anonymous: true,
      ...{},
    });
    // non anonymous part should not have properties
    expect(segmentMockClient.track).toHaveBeenCalledWith(event, {
      anonymous: true,
    });
  });

  it('does not track anonymous event if disabled', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    const event = 'event1';
    const properties = { prop1: 'value1' };

    metaMetrics.trackAnonymousEvent(event, properties);

    const { segmentMockClient } = global as any;
    // the anonymous part
    expect(segmentMockClient.track).not.toHaveBeenCalled();
    // non anonymous part
    expect(segmentMockClient.track).not.toHaveBeenCalled();
  });

  it('groups user', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    await metaMetrics.enable();
    const groupId = 'group1';
    const groupTraits = { trait1: 'value1' };
    metaMetrics.group(groupId, groupTraits);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.group).toHaveBeenCalledWith(groupId, groupTraits);
  });

  it('does not groups user if disabled', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    const groupId = 'group1';
    const groupTraits = { trait1: 'value1' };
    metaMetrics.group(groupId, groupTraits);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.group).not.toHaveBeenCalled();
  });

  it('creates segment delete regulation', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
      status: 200,
      data: { regulateId: 'regulateId1' },
    } as AxiosResponse<any>);

    const result = await metaMetrics.createDeleteRegulation();

    expect(result).toEqual({ status: DataDeleteResponseStatus.ok });

    expect(DefaultPreference.set).toHaveBeenCalledWith(
      METAMETRICS_SEGMENT_REGULATION_ID,
      'regulateId1',
    );

    const currentDate = new Date();
    const day = currentDate.getUTCDate();
    const month = currentDate.getUTCMonth() + 1;
    const year = currentDate.getUTCFullYear();
    expect(DefaultPreference.set).toHaveBeenCalledWith(
      ANALYTICS_DATA_DELETION_DATE,
      `${day}/${month}/${year}`,
    );
  });

  it('handles segment delete regulation error', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValue({
      response: {
        status: 422,
        data: { message: 'Validation error' },
      },
    } as AxiosError);

    const result = await metaMetrics.createDeleteRegulation();

    expect(result.status).toBe(DataDeleteResponseStatus.error);
    expect(DefaultPreference.set).not.toHaveBeenCalledWith(
      METAMETRICS_SEGMENT_REGULATION_ID,
      expect.any(String),
    );
    expect(DefaultPreference.set).not.toHaveBeenCalledWith(
      ANALYTICS_DATA_DELETION_DATE,
      expect.any(String),
    );
  });

  it('gets delete regulation creation date', async () => {
    const expectedDate = '04/05/2023';
    DefaultPreference.get = jest.fn().mockResolvedValue(expectedDate);
    const metaMetrics = await TestMetaMetrics.getInstance();
    expect(await metaMetrics.getDeleteRegulationCreationDate()).toBe(
      expectedDate,
    );
    expect(DefaultPreference.get).toHaveBeenCalledWith(
      ANALYTICS_DATA_DELETION_DATE,
    );
  });

  it('returns empty string if no date is set', async () => {
    DefaultPreference.get = jest.fn().mockResolvedValue(undefined);
    const metaMetrics = await TestMetaMetrics.getInstance();
    expect(await metaMetrics.getDeleteRegulationCreationDate()).toBeUndefined();
    expect(DefaultPreference.get).toHaveBeenCalledWith(
      ANALYTICS_DATA_DELETION_DATE,
    );
  });

  it('resets', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    await metaMetrics.reset();
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.reset).toHaveBeenCalledWith(true);
    expect(DefaultPreference.set).toHaveBeenCalledWith(METAMETRICS_ID, '');
  });

  it('adds traits to user', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    await metaMetrics.enable();
    const userTraits = { trait1: 'value1' };
    metaMetrics.addTraitsToUser(userTraits);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.identify).toHaveBeenCalledWith(
      expect.any(String),
      userTraits,
    );
  });

  it('does not add traits to user when disabled', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    const userTraits = { trait1: 'value1' };
    await metaMetrics.addTraitsToUser(userTraits);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.identify).not.toHaveBeenCalled();
  });

  it('flushes the segment client', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    await metaMetrics.flush();
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.flush).toHaveBeenCalled();
  });

  it('uses Mixpanel ID if it is set', async () => {
    const mixPanelId = '0x00';
    mockGet.mockImplementation(async () => mixPanelId);
    await TestMetaMetrics.getInstance();

    expect(DefaultPreference.get).toHaveBeenNthCalledWith(
      2,
      MIXPANEL_METAMETRICS_ID,
    );
    expect(DefaultPreference.set).toHaveBeenCalledWith(
      METAMETRICS_ID,
      mixPanelId,
    );
    expect(DefaultPreference.get).not.toHaveBeenCalledWith(METAMETRICS_ID);
  });

  it('uses Metametrics ID if it is set', async () => {
    const id = '0x00';
    mockGet.mockImplementation(async (key: string) =>
      key === METAMETRICS_ID ? id : '',
    );
    await TestMetaMetrics.getInstance();

    expect(DefaultPreference.get).toHaveBeenNthCalledWith(
      2,
      MIXPANEL_METAMETRICS_ID,
    );
    expect(DefaultPreference.get).toHaveBeenNthCalledWith(3, METAMETRICS_ID);
    expect(DefaultPreference.set).not.toHaveBeenCalled();
  });

  it('maintains same user id', async () => {
    await TestMetaMetrics.getInstance();
    const metricsId = mockSet.mock.calls[0][1];
    expect(metricsId).not.toEqual('');

    // create a new instance and check that user id was not changed
    await TestMetaMetrics.getInstance();

    expect(DefaultPreference.set).not.toHaveBeenCalledWith(METAMETRICS_ID, '');
    expect(DefaultPreference.get).toHaveBeenNthCalledWith(3, METAMETRICS_ID);
  });

  it('resets user id', async () => {
    const metaMetrics = await TestMetaMetrics.getInstance();
    const metricsId = mockSet.mock.calls[0][1];

    expect(metricsId).not.toEqual('');

    // reset the instance and SDK must reset user id
    await metaMetrics.reset();

    // Check change on the MetaMerics class side
    expect(DefaultPreference.set).toHaveBeenNthCalledWith(
      2,
      METAMETRICS_ID,
      '',
    );

    // Check MetaMerics class calls the Segment SDK reset
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.reset).toHaveBeenCalledTimes(1);
    expect(segmentMockClient.reset).toHaveBeenCalledWith(true);

    // create a new instance and check user id is different
    await TestMetaMetrics.getInstance();
    const metricsId2 = mockSet.mock.calls[2][1];

    expect(metricsId2).not.toEqual('');

    expect(metricsId).not.toEqual(metricsId2);
  });
});

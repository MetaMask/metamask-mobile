import MetaMetrics from './MetaMetrics';
import DefaultPreference from 'react-native-default-preference';
import { METAMETRICS_ANONYMOUS_ID } from './MetaMetrics.constants';
import {
  AGREED,
  ANALYTICS_DATA_DELETION_DATE,
  DENIED,
  METAMETRICS_ID,
  METAMETRICS_SEGMENT_REGULATION_ID,
  METRICS_OPT_IN,
} from '../../constants/storage';
import axios, { AxiosResponse } from 'axios';

jest.mock('react-native-default-preference');
const mockGet = jest.fn();

jest.mock('axios');

describe('MetaMetrics', () => {
  beforeEach(async () => {
    DefaultPreference.get = mockGet;
    MetaMetrics.resetInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
  });

  it('defaults to disabled metrics', async () => {
    mockGet.mockResolvedValue(undefined);
    const metaMetrics = await MetaMetrics.getInstance();

    expect(DefaultPreference.get).toHaveBeenCalledWith(METRICS_OPT_IN);
    expect(metaMetrics.isEnabled()).toBeFalsy();
  });

  it('uses preference enabled value when set', async () => {
    mockGet.mockImplementation(async () => AGREED);
    const metaMetrics = await MetaMetrics.getInstance();

    expect(DefaultPreference.get).toHaveBeenCalledWith(METRICS_OPT_IN);
    expect(metaMetrics.isEnabled()).toBeTruthy();
  });

  it('enables metrics', async () => {
    const metaMetrics = await MetaMetrics.getInstance();
    await metaMetrics.enable();

    expect(DefaultPreference.set).toHaveBeenLastCalledWith(
      METRICS_OPT_IN,
      AGREED,
    );
    expect(metaMetrics.isEnabled()).toBeTruthy();
  });

  it('disables metrics', async () => {
    const metaMetrics = await MetaMetrics.getInstance();

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
    const metaMetrics = await MetaMetrics.getInstance();
    await metaMetrics.enable();
    const event = 'event1';
    const properties = { prop1: 'value1' };

    metaMetrics.trackEvent(event, properties);

    expect(DefaultPreference.get).toHaveBeenCalledWith(METRICS_OPT_IN);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.track).toHaveBeenCalledWith(
      event,
      properties,
      expect.any(String),
      METAMETRICS_ANONYMOUS_ID,
    );
  });

  it('tracks anonymous event', async () => {
    const metaMetrics = await MetaMetrics.getInstance();
    await metaMetrics.enable();
    const event = 'event1';
    const properties = { prop1: 'value1' };

    metaMetrics.trackAnonymousEvent(event, properties);

    const { segmentMockClient } = global as any;
    // the anonymous part should not have a user id
    expect(segmentMockClient.track).toHaveBeenCalledWith(
      event,
      properties,
      undefined,
      METAMETRICS_ANONYMOUS_ID,
    );
    // non anonymous part should not have properties
    expect(segmentMockClient.track).toHaveBeenCalledWith(
      event,
      {},
      expect.any(String),
      METAMETRICS_ANONYMOUS_ID,
    );
  });

  it('groups user', async () => {
    const metaMetrics = await MetaMetrics.getInstance();
    await metaMetrics.enable();
    const groupId = 'group1';
    const groupTraits = { trait1: 'value1' };
    metaMetrics.group(groupId, groupTraits);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.group).toHaveBeenCalledWith(groupId, groupTraits);
  });

  it('creates segment delete regulation', async () => {
    const metaMetrics = await MetaMetrics.getInstance();
    (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
      status: 200,
      data: { regulateId: 'regulateId1' },
    } as AxiosResponse<any>);

    await metaMetrics.createSegmentDeleteRegulation();

    expect(DefaultPreference.set).toHaveBeenCalledWith(
      METAMETRICS_SEGMENT_REGULATION_ID,
      'regulateId1',
    );
    expect(DefaultPreference.set).toHaveBeenCalledWith(
      ANALYTICS_DATA_DELETION_DATE,
      expect.any(String),
    );
  });

  it('resets', async () => {
    const metaMetrics = await MetaMetrics.getInstance();
    await metaMetrics.reset();
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.reset).toHaveBeenCalledWith(
      METAMETRICS_ANONYMOUS_ID,
    );
    expect(DefaultPreference.set).toHaveBeenCalledWith(METAMETRICS_ID, '');
  });

  it('adds traits to user', async () => {
    const metaMetrics = await MetaMetrics.getInstance();
    await metaMetrics.enable();
    const userTraits = { trait1: 'value1' };
    metaMetrics.addTraitsToUser(userTraits);
    const { segmentMockClient } = global as any;
    expect(segmentMockClient.identify).toHaveBeenCalledWith(
      expect.any(String),
      userTraits,
    );
  });

  it('maintains same user id', async () => {
    const metaMetrics = await MetaMetrics.getInstance();
    await metaMetrics.enable();

    const event = 'event1';
    const properties = { prop1: 'value1' };
    metaMetrics.trackEvent(event, properties);

    const metaMetrics2 = await MetaMetrics.getInstance();
    metaMetrics2.trackEvent(event, properties);

    const { segmentMockClient } = global as any;
    expect(segmentMockClient.track.mock.calls[0]).toEqual(
      segmentMockClient.track.mock.calls[1],
    );
  });

  it('resets user id', async () => {
    const metaMetrics = await MetaMetrics.getInstance();
    await metaMetrics.enable();

    const event = 'event1';
    const properties = { prop1: 'value1' };
    metaMetrics.trackEvent(event, properties);

    // reset the instance and SDK must reset user id
    await metaMetrics.reset();

    const metaMetrics2 = await MetaMetrics.getInstance();
    metaMetrics2.trackEvent(event, properties);

    const { segmentMockClient } = global as any;
    expect(segmentMockClient.track.mock.calls[0]).not.toEqual(
      segmentMockClient.track.mock.calls[1],
    );
  });
});

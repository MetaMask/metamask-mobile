import MetaMetrics from './MetaMetrics';
import DefaultPreference from 'react-native-default-preference';
import axios, { AxiosResponse } from 'axios';
// import { createClient } from '@segment/analytics-react-native';
import { IMetaMetrics } from './MetaMetrics.types';
import { METAMETRICS_ANONYMOUS_ID } from './MetaMetrics.constants';
import {
  METRICS_OPT_IN,
  METAMETRICS_SEGMENT_REGULATION_ID,
  ANALYTICS_DATA_DELETION_DATE,
  DENIED,
} from '../../constants/storage';

jest.mock('react-native-default-preference');
jest.mock('axios');
jest.mock('@segment/analytics-react-native');

describe('MetaMetrics', () => {
  let segmentClientMock: jest.Mocked<any>;
  let metaMetrics: IMetaMetrics;

  beforeAll(() => {
    segmentClientMock = {
      identify: jest.fn(),
      group: jest.fn(),
      track: jest.fn(),
      reset: jest.fn(),
      createClient: jest.fn(),
    };
    metaMetrics = MetaMetrics.init(segmentClientMock);
  });

  //   afterEach(() => {
  //     jest.clearAllMocks();
  //   });

  it('should track event', () => {
    const event = 'event1';
    const properties = { prop1: 'value1' };
    metaMetrics.trackEvent(event, properties);
    expect(segmentClientMock.track).toHaveBeenCalledWith(
      event,
      properties,
      expect.any(String),
      METAMETRICS_ANONYMOUS_ID,
    );
  });

  it('should track anonymous event', () => {
    const event = 'event1';
    const properties = { prop1: 'value1' };
    metaMetrics.trackAnonymousEvent(event, properties);
    expect(segmentClientMock.track).toHaveBeenCalledWith(
      event,
      properties,
      undefined,
      METAMETRICS_ANONYMOUS_ID,
    );
  });

  it('should disable metrics', () => {
    metaMetrics.disable();
    expect(DefaultPreference.set).toHaveBeenCalledWith(METRICS_OPT_IN, DENIED);
  });

  it('should group user', () => {
    const groupId = 'group1';
    const groupTraits = { trait1: 'value1' };
    metaMetrics.group(groupId, groupTraits);
    expect(segmentClientMock.group).toHaveBeenCalledWith(groupId, groupTraits);
  });

  it('should create segment delete regulation', async () => {
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

  it('should reset', () => {
    metaMetrics.reset();
    expect(segmentClientMock.reset).toHaveBeenCalledWith(
      METAMETRICS_ANONYMOUS_ID,
    );
  });
});

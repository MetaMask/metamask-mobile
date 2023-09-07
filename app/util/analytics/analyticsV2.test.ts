import { trackEventV2, trackErrorAsAnalytics } from './analyticsV2'; // replace with actual path
import DefaultPreference from 'react-native-default-preference';
import Analytics from '../../core/Analytics/Analytics';
import Logger from '../Logger';
import { InteractionManager } from 'react-native';
import { AGREED, DENIED } from '../../constants/storage';
import MetaMetricsProviderSegmentImpl from '../../core/Analytics/MetaMetricsProvider.segment.impl';

jest.mock('react-native-default-preference');
jest.mock('../../core/Analytics/Analytics');
jest.mock('../Logger');
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation((callback) => callback());

describe('Analytics trackEventV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TODO Should test the provider calls, not the implementation details of the provider
  describe('with legacy provider', () => {
    it('does not track event if metrics opt-in is denied', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(DENIED);

      await trackEventV2('testEvent', { foo: 'bar' });

      expect(Analytics.trackEvent).not.toHaveBeenCalled();
      expect(Analytics.trackEventWithParameters).not.toHaveBeenCalled();
    });

    it('tracks event with no parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      await trackEventV2('testEvent');

      expect(Analytics.trackEvent).toHaveBeenCalledWith('testEvent', undefined);
      expect(Analytics.trackEventWithParameters).not.toHaveBeenCalled();
    });

    it('tracks event with non-anonymous parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      await trackEventV2('testEvent', { foo: 'bar' });

      expect(Analytics.trackEventWithParameters).toHaveBeenCalledWith(
        'testEvent',
        { foo: 'bar' },
        undefined,
      );
    });

    it('tracks event with anonymous parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      await trackEventV2('testEvent', {
        foo: { value: 'bar', anonymous: true },
      });

      expect(Analytics.trackEventWithParameters).toHaveBeenCalledWith(
        'testEvent',
        { foo: 'bar' },
        true,
      );
    });

    it('logs error when an exception is thrown', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);
      (Analytics.trackEventWithParameters as jest.Mock).mockImplementation(
        () => {
          throw new Error('Test error');
        },
      );

      await trackEventV2('testEvent', { foo: 'bar' });

      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Test error'),
        'Error logging analytics',
      );
    });

    it('tracks error as analytics', () => {
      trackErrorAsAnalytics('testType', 'testMessage', 'testInfo');

      expect(Analytics.trackEventWithParameters).toHaveBeenCalledWith(
        { category: 'Error occurred' },
        {
          error: true,
          type: 'testType',
          errorMessage: 'testMessage',
          otherInfo: 'testInfo',
        },
        undefined,
      );
    });
  });

  describe('with Segment provider', () => {
    it('returns Segment instance as singleton', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      // call it twice to test singleton
      MetaMetricsProviderSegmentImpl.getInstance();
      MetaMetricsProviderSegmentImpl.getInstance();

      expect(createClient).toHaveBeenCalledTimes(1); // testing singleton
    });

    it('does not track event if metrics opt-in is denied', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(DENIED);

      await trackEventV2(
        'testEvent',
        { foo: 'bar' },
        MetaMetricsProviderSegmentImpl.getInstance(),
      );
      const trackMock = (createClient as jest.Mock).mock.results[0].value.track;

      expect(trackMock).not.toHaveBeenCalled();
    });

    it('tracks event with no parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      await trackEventV2(
        'testEvent',
        undefined,
        MetaMetricsProviderSegmentImpl.getInstance(),
      );
      const trackMock = (createClient as jest.Mock).mock.results[0].value.track;

      expect(trackMock).toHaveBeenCalledWith('testEvent');
    });

    it('tracks event with non-anonymous parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      await trackEventV2(
        'testEvent',
        { foo: 'bar' },
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      // TODO replace Analytics with segmentClient
      expect(Analytics.trackEventWithParameters).toHaveBeenCalledWith(
        'testEvent',
        { foo: 'bar' },
        undefined,
      );
    });

    it('tracks event with anonymous parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      await trackEventV2(
        'testEvent',
        { foo: { value: 'bar', anonymous: true } },
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      // TODO replace Analytics with segmentClient
      expect(Analytics.trackEventWithParameters).toHaveBeenCalledWith(
        'testEvent',
        { foo: 'bar' },
        true,
      );
    });

    it('logs error when an exception is thrown', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);
      // TODO replace Analytics with segmentClient
      (Analytics.trackEventWithParameters as jest.Mock).mockImplementation(
        () => {
          throw new Error('Test error');
        },
      );

      await trackEventV2(
        'testEvent',
        { foo: 'bar' },
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Test error'),
        'Error logging analytics',
      );
    });

    it('tracks error as analytics', () => {
      trackErrorAsAnalytics(
        'testType',
        'testMessage',
        'testInfo',
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      // TODO replace Analytics with segmentClient
      expect(Analytics.trackEventWithParameters).toHaveBeenCalledWith(
        { category: 'Error occurred' },
        {
          error: true,
          type: 'testType',
          errorMessage: 'testMessage',
          otherInfo: 'testInfo',
        },
        undefined,
      );
    });
  });
});

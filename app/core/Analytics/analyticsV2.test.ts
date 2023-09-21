import DefaultPreference from 'react-native-default-preference';
import { InteractionManager } from 'react-native';
import { AGREED, DENIED } from '../../constants/storage';

import analyticsV2 from './analyticsV2';
import MetaMetricsProviderSegmentImpl from './MetaMetricsProvider.segment.impl';
import MetaMetricsProviderLegacyImpl from './MetaMetricsProvider.legacy.impl';

jest.mock('react-native-default-preference');
jest.mock('./Analytics');
jest.mock('../../util/Logger');
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation((callback) => callback());

describe('Analytics trackEventV2', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uses the correct implementation', () => {
    beforeEach(() => {
      jest
        .spyOn(MetaMetricsProviderLegacyImpl, 'getInstance')
        .mockImplementation(() => ({
          trackEvent: jest.fn(),
          trackEventWithParameters: jest.fn(),
        }));

      jest
        .spyOn(MetaMetricsProviderSegmentImpl, 'getInstance')
        .mockImplementation(() => ({
          trackEvent: jest.fn(),
          trackEventWithParameters: jest.fn(),
        }));
    });

    it('with legacy impl by default', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      await analyticsV2.trackEvent('testEvent');
      analyticsV2.trackErrorAsAnalytics(
        'testType',
        'testErrorMessage',
        'testOtherInfo',
      );

      expect(MetaMetricsProviderLegacyImpl.getInstance).toHaveBeenCalledTimes(
        2,
      );
      expect(MetaMetricsProviderSegmentImpl.getInstance).not.toHaveBeenCalled();
    });

    it('with passed impl', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      await analyticsV2.trackEvent(
        'testEvent',
        undefined,
        MetaMetricsProviderSegmentImpl.getInstance(),
      );
      analyticsV2.trackErrorAsAnalytics(
        'testType',
        'testErrorMessage',
        'testOtherInfo',
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      expect(MetaMetricsProviderLegacyImpl.getInstance).not.toHaveBeenCalled();
      expect(MetaMetricsProviderSegmentImpl.getInstance).toHaveBeenCalledTimes(
        2,
      );
    });

    it('with impl passed as params', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      await analyticsV2.trackEvent(
        'testEvent',
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      expect(MetaMetricsProviderLegacyImpl.getInstance).not.toHaveBeenCalled();
      expect(MetaMetricsProviderSegmentImpl.getInstance).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('using legacy provider', () => {
    const mockTrackEvent = jest.fn();
    const mockTrackEventWithParameters = jest.fn();

    beforeEach(() => {
      jest
        .spyOn(MetaMetricsProviderLegacyImpl, 'getInstance')
        .mockImplementation(() => ({
          trackEvent: mockTrackEvent,
          trackEventWithParameters: mockTrackEventWithParameters,
        }));
    });

    it('does not track event if metrics opt-in is denied', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(DENIED);
      const eventName = 'testEvent';
      const params = { foo: 'bar' };

      await analyticsV2.trackEvent(eventName);
      await analyticsV2.trackEvent(eventName, params);

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockTrackEventWithParameters).not.toHaveBeenCalled();
    });

    it('tracks event with no parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);
      const eventName = 'testEvent';

      await analyticsV2.trackEvent(eventName);

      expect(mockTrackEvent).toHaveBeenCalledWith(eventName);
      expect(mockTrackEventWithParameters).not.toHaveBeenCalled();
    });

    it('tracks event with non-anonymous parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);
      const eventName = 'testEvent';
      const params = { foo: 'bar' };

      await analyticsV2.trackEvent(eventName, params);

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockTrackEventWithParameters).toHaveBeenCalledWith(
        eventName,
        params,
      );
    });

    it('tracks event with anonymous parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      const eventName = 'testEvent';
      const AnonymousParams = { foo: 'bar', anonymous: true };

      await analyticsV2.trackEvent(eventName, AnonymousParams);

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockTrackEventWithParameters).toHaveBeenCalledWith(
        eventName,
        AnonymousParams,
      );
    });

    it('tracks error as analytics', () => {
      const type = 'testEvent';
      const errorMessage = 'testErrorMessage';
      const otherInfo = 'testOtherInfo';

      analyticsV2.trackErrorAsAnalytics(type, errorMessage, otherInfo);

      expect(mockTrackEventWithParameters).toHaveBeenCalledWith(
        { category: 'Error occurred' },
        {
          error: true,
          type,
          errorMessage,
          otherInfo,
        },
      );
    });
  });

  describe('using segment provider', () => {
    const mockTrackEvent = jest.fn();
    const mockTrackEventWithParameters = jest.fn();

    beforeEach(() => {
      jest
        .spyOn(MetaMetricsProviderSegmentImpl, 'getInstance')
        .mockImplementation(() => ({
          trackEvent: mockTrackEvent,
          trackEventWithParameters: mockTrackEventWithParameters,
        }));
    });

    it('does not track event if metrics opt-in is denied', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(DENIED);
      const eventName = 'testEvent';
      const params = { foo: 'bar' };

      await analyticsV2.trackEvent(
        eventName,
        undefined,
        MetaMetricsProviderSegmentImpl.getInstance(),
      );
      await analyticsV2.trackEvent(
        eventName,
        params,
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockTrackEventWithParameters).not.toHaveBeenCalled();
    });

    it('tracks event with no parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);
      const eventName = 'testEvent';

      await analyticsV2.trackEvent(
        eventName,
        undefined,
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(eventName);
      expect(mockTrackEventWithParameters).not.toHaveBeenCalled();
    });

    it('tracks event with non-anonymous parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);
      const eventName = 'testEvent';
      const params = { foo: 'bar' };

      await analyticsV2.trackEvent(
        eventName,
        params,
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockTrackEventWithParameters).toHaveBeenCalledWith(
        eventName,
        params,
      );
    });

    it('tracks event with anonymous parameters', async () => {
      (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

      const eventName = 'testEvent';
      const AnonymousParams = { foo: 'bar', anonymous: true };

      await analyticsV2.trackEvent(
        eventName,
        AnonymousParams,
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockTrackEventWithParameters).toHaveBeenCalledWith(
        eventName,
        AnonymousParams,
      );
    });

    it('tracks error as analytics', () => {
      const type = 'testEvent';
      const errorMessage = 'testErrorMessage';
      const otherInfo = 'testOtherInfo';

      analyticsV2.trackErrorAsAnalytics(
        type,
        errorMessage,
        otherInfo,
        MetaMetricsProviderSegmentImpl.getInstance(),
      );

      expect(mockTrackEventWithParameters).toHaveBeenCalledWith(
        { category: 'Error occurred' },
        {
          error: true,
          type,
          errorMessage,
          otherInfo,
        },
      );
    });
  });
});

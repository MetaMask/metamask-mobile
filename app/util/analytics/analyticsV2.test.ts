import { trackEventV2, trackErrorAsAnalytics } from './analyticsV2'; // replace with actual path
import DefaultPreference from 'react-native-default-preference';
import Analytics from '../../core/Analytics/Analytics';
import Logger from '../Logger';
import { InteractionManager } from 'react-native';
import { AGREED, DENIED } from '../../constants/storage';

jest.mock('react-native-default-preference');
jest.mock('../../core/Analytics/Analytics');
jest.mock('../Logger');
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation((callback) => callback());

describe('Analytics module', () => {
  beforeEach(() => {
    (DefaultPreference.get as jest.Mock).mockClear();
    (Analytics.trackEvent as jest.Mock).mockClear();
    (Analytics.trackEventWithParameters as jest.Mock).mockClear();
    (Logger.error as jest.Mock).mockClear();
    (InteractionManager.runAfterInteractions as jest.Mock).mockClear();
  });

  it('should not track event if metrics opt-in is denied', async () => {
    (DefaultPreference.get as jest.Mock).mockResolvedValue(DENIED);

    await trackEventV2('testEvent', { foo: 'bar' });

    expect(Analytics.trackEvent).not.toHaveBeenCalled();
    expect(Analytics.trackEventWithParameters).not.toHaveBeenCalled();
  });

  it('should track event with no parameters', async () => {
    (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

    await trackEventV2('testEvent');

    expect(Analytics.trackEvent).toHaveBeenCalledWith('testEvent', undefined);
    expect(Analytics.trackEventWithParameters).not.toHaveBeenCalled();
  });

  it('should track event with non-anonymous parameters', async () => {
    (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

    await trackEventV2('testEvent', { foo: 'bar' });

    expect(Analytics.trackEventWithParameters).toHaveBeenCalledWith(
      'testEvent',
      { foo: 'bar' },
        undefined,
    );
  });

  it('should track event with anonymous parameters', async () => {
    (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);

    await trackEventV2('testEvent', { foo: { value: 'bar', anonymous: true } });

    expect(Analytics.trackEventWithParameters).toHaveBeenCalledWith(
      'testEvent',
      { foo: 'bar' },
      true,
    );
  });

  it('should log error when an exception is thrown', async () => {
    (DefaultPreference.get as jest.Mock).mockResolvedValue(AGREED);
    (Analytics.trackEventWithParameters as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });

    await trackEventV2('testEvent', { foo: 'bar' });

    expect(Logger.error).toHaveBeenCalledWith(
      new Error('Test error'),
      'Error logging analytics',
    );
  });

  it('should track error as analytics', () => {
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

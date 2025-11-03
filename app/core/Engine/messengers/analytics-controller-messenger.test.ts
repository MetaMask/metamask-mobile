import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getAnalyticsControllerMessenger } from './analytics-controller-messenger';
import { RootMessenger } from '../types';

function getTestRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  }) as unknown as RootMessenger;
}

describe('getAnalyticsControllerMessenger', () => {
  it('returns a messenger instance', () => {
    const rootMessenger = getTestRootMessenger();

    const analyticsControllerMessenger =
      getAnalyticsControllerMessenger(rootMessenger);

    expect(analyticsControllerMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates messenger to root messenger', () => {
    const rootMessenger = getTestRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAnalyticsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith({
      actions: [],
      events: [],
      messenger: expect.any(Messenger),
    });
  });

  it('delegates with empty actions and events arrays', () => {
    const rootMessenger = getTestRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAnalyticsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith({
      actions: [],
      events: [],
      messenger: expect.any(Messenger),
    });
  });

  it('returns messenger with correct type', () => {
    const rootMessenger = getTestRootMessenger();

    const analyticsControllerMessenger =
      getAnalyticsControllerMessenger(rootMessenger);

    expect(analyticsControllerMessenger).toBeDefined();
  });
});

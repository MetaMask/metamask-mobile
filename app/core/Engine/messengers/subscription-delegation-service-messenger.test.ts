import { Messenger } from '@metamask/messenger';
import { getRootExtendedMessenger } from '../types';
import { getSubscriptionDelegationServiceMessenger } from './subscription-delegation-service-messenger';

describe('getSubscriptionDelegationServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootExtendedMessenger();

    const serviceMessenger =
      getSubscriptionDelegationServiceMessenger(rootMessenger);

    expect(serviceMessenger).toBeInstanceOf(Messenger);
  });
});

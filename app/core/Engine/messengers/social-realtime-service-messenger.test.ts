import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';

import type { RootMessenger } from '../types';
import { getSocialRealtimeServiceMessenger } from './social-realtime-service-messenger';

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSocialRealtimeServiceMessenger', () => {
  it('returns a messenger', () => {
    expect(
      getSocialRealtimeServiceMessenger(getRootMessenger()),
    ).toBeInstanceOf(Messenger);
  });

  it('allows required actions and events', () => {
    expect(() =>
      getSocialRealtimeServiceMessenger(getRootMessenger()),
    ).not.toThrow();
  });
});

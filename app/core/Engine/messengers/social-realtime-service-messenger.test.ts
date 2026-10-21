import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';

import type { RootMessenger } from '../types';
import {
  getSocialRealtimeServiceInitMessenger,
  getSocialRealtimeServiceMessenger,
} from './social-realtime-service-messenger';

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

describe('getSocialRealtimeServiceInitMessenger', () => {
  it('returns a messenger', () => {
    expect(
      getSocialRealtimeServiceInitMessenger(getRootMessenger()),
    ).toBeInstanceOf(Messenger);
  });

  it('allows required actions', () => {
    expect(() =>
      getSocialRealtimeServiceInitMessenger(getRootMessenger()),
    ).not.toThrow();
  });
});

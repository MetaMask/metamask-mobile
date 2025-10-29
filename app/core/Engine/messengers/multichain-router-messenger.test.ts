import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getMultichainRouterMessenger,
  getMultichainRouterInitMessenger,
} from './multichain-router-messenger';

describe('getMultichainRouterMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const multichainRouterMessenger = getMultichainRouterMessenger(messenger);

    expect(multichainRouterMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

describe('getMultichainRouterInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const multichainRouterInitMessenger =
      getMultichainRouterInitMessenger(messenger);

    expect(multichainRouterInitMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

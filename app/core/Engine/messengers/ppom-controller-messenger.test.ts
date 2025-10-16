import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getPPOMControllerMessenger,
  getPPOMControllerInitMessenger,
} from './ppom-controller-messenger';

describe('getPPOMControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const ppomControllerMessenger = getPPOMControllerMessenger(messenger);

    expect(ppomControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

describe('getPPOMControllerInitializationMessenger', () => {
  it('returns a restricted messenger for initialization', () => {
    const messenger = new Messenger<never, never>();
    const ppomControllerInitMessenger =
      getPPOMControllerInitMessenger(messenger);

    expect(ppomControllerInitMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

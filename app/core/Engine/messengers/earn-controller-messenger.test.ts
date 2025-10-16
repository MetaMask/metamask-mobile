import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getEarnControllerMessenger,
  getEarnControllerInitMessenger,
} from './earn-controller-messenger';

describe('getEarnControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const earnControllerMessenger = getEarnControllerMessenger(messenger);

    expect(earnControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

describe('getEarnControllerInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const earnControllerInitMessenger =
      getEarnControllerInitMessenger(messenger);

    expect(earnControllerInitMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

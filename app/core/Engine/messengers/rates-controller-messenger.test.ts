import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getRatesControllerMessenger,
  getRatesControllerInitMessenger,
} from './rates-controller-messenger';

describe('getRatesControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const ratesControllerMessenger = getRatesControllerMessenger(messenger);

    expect(ratesControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

describe('getRatesControllerInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const ratesControllerInitMessenger =
      getRatesControllerInitMessenger(messenger);

    expect(ratesControllerInitMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

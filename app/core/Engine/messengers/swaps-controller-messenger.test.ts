import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getSwapsControllerMessenger } from './swaps-controller-messenger';

describe('getSwapsControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const swapsControllerMessenger = getSwapsControllerMessenger(messenger);

    expect(swapsControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

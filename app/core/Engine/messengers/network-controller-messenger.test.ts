import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getNetworkControllerMessenger,
  getNetworkControllerInitMessenger,
} from './network-controller-messenger';

describe('getNetworkControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const networkControllerMessenger = getNetworkControllerMessenger(messenger);

    expect(networkControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

describe('getNetworkControllerInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const networkControllerInitMessenger =
      getNetworkControllerInitMessenger(messenger);

    expect(networkControllerInitMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

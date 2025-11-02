import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getTokensControllerMessenger,
  getTokensControllerInitMessenger,
} from './tokens-controller-messenger';

describe('getTokensControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const tokensControllerMessenger = getTokensControllerMessenger(messenger);

    expect(tokensControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

describe('getTokensControllerInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const tokensControllerInitMessenger =
      getTokensControllerInitMessenger(messenger);

    expect(tokensControllerInitMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

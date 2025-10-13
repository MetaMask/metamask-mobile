import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getTokenListControllerMessenger,
  getTokenListControllerInitMessenger,
} from './token-list-controller-messenger';

describe('getTokenListControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const tokenListControllerMessenger =
      getTokenListControllerMessenger(messenger);

    expect(tokenListControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

describe('getTokenListControllerInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const tokenListControllerInitMessenger =
      getTokenListControllerInitMessenger(messenger);

    expect(tokenListControllerInitMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});

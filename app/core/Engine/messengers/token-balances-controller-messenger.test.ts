import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getTokenBalancesControllerMessenger,
  getTokenBalancesControllerInitMessenger,
} from './token-balances-controller-messenger';

describe('getTokenBalancesControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const tokenBalancesControllerMessenger =
      getTokenBalancesControllerMessenger(messenger);

    expect(tokenBalancesControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});

describe('getTokenBalancesControllerInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const tokenBalancesControllerInitMessenger =
      getTokenBalancesControllerInitMessenger(messenger);

    expect(tokenBalancesControllerInitMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});

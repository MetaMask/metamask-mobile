import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import {
  getTokenBalancesControllerMessenger,
  getTokenBalancesControllerInitMessenger,
} from './token-balances-controller-messenger';
import { RootMessenger } from '../types';

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getTokenBalancesControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenBalancesControllerMessenger =
      getTokenBalancesControllerMessenger(messenger);

    expect(tokenBalancesControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getTokenBalancesControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenBalancesControllerInitMessenger =
      getTokenBalancesControllerInitMessenger(messenger);

    expect(tokenBalancesControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});

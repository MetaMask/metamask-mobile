import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
} from '@metamask/messenger';
import { DelegationControllerMessenger } from '@metamask/delegation-controller';
import { getDelegationControllerMessenger } from './delegation-controller-messenger';

type AllDelegationControllerMessengerActions =
  MessengerActions<DelegationControllerMessenger>;

type AllDelegationControllerMessengerEvents =
  MessengerEvents<DelegationControllerMessenger>;

type RootMessenger = Messenger<
  MockAnyNamespace,
  AllDelegationControllerMessengerActions,
  AllDelegationControllerMessengerEvents
>;

/**
 * Creates and returns a root messenger for testing
 *
 * @returns A messenger instance
 */
function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getDelegationControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegationControllerMessenger =
      getDelegationControllerMessenger(rootMessenger);

    expect(delegationControllerMessenger).toBeInstanceOf(Messenger);
  });
});

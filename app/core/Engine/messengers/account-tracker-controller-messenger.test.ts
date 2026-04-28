import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getAccountTrackerControllerMessenger } from './account-tracker-controller-messenger';
import { AccountTrackerControllerMessenger } from '@metamask/assets-controllers';
import { RootMessenger as EngineRootMessenger } from '../types';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<AccountTrackerControllerMessenger>,
  MessengerEvents<AccountTrackerControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getAccountTrackerControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const accountTrackerControllerMessenger =
      getAccountTrackerControllerMessenger(
        // The mock root messenger is derived only from
        // `AccountTrackerControllerMessenger`, whose type comes from
        // `@metamask/assets-controllers`'s nested older
        // `@metamask/transaction-controller`. The production messenger uses
        // mobile's direct (newer) version, so the action/event union types
        // differ structurally even though they overlap at runtime.
        rootMessenger as unknown as EngineRootMessenger,
      );

    expect(accountTrackerControllerMessenger).toBeInstanceOf(Messenger);
  });
});

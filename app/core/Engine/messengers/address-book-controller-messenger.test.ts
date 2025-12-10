import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { AddressBookControllerMessenger } from '@metamask/address-book-controller';
import { getAddressBookControllerMessenger } from './address-book-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<AddressBookControllerMessenger>,
  MessengerEvents<AddressBookControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getAddressBookControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const addressBookControllerMessenger =
      getAddressBookControllerMessenger(rootMessenger);

    expect(addressBookControllerMessenger).toBeInstanceOf(Messenger);
  });
});

import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { ChompApiServiceMessenger } from '@metamask/chomp-api-service';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import {
  getChompApiServiceMessenger,
  getChompApiServiceInitMessenger,
} from './chomp-api-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<ChompApiServiceMessenger>
  | RemoteFeatureFlagControllerGetStateAction,
  MessengerEvents<ChompApiServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getChompApiServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const chompApiServiceMessenger = getChompApiServiceMessenger(rootMessenger);

    expect(chompApiServiceMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getChompApiServiceInitMessenger', () => {
  it('returns a restricted init messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const chompApiServiceInitMessenger =
      getChompApiServiceInitMessenger(rootMessenger);

    expect(chompApiServiceInitMessenger).toBeInstanceOf(Messenger);
  });
});

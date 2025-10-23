import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getAssetsContractControllerMessenger } from './assets-contract-controller-messenger';
import { AssetsContractControllerMessenger } from '@metamask/assets-controllers';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<AssetsContractControllerMessenger>,
  MessengerEvents<AssetsContractControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getAssetsContractControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const assetsContractControllerMessenger =
      getAssetsContractControllerMessenger(rootMessenger);

    expect(assetsContractControllerMessenger).toBeInstanceOf(Messenger);
  });
});

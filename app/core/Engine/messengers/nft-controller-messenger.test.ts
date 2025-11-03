import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { NftControllerMessenger } from '@metamask/assets-controllers';
import { getNftControllerMessenger } from './nft-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<NftControllerMessenger>,
  MessengerEvents<NftControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getNftControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const nftControllerMessenger = getNftControllerMessenger(rootMessenger);

    expect(nftControllerMessenger).toBeInstanceOf(Messenger);
  });
});

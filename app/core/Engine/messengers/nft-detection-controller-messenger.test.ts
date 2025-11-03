import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getNftDetectionControllerMessenger } from './nft-detection-controller-messenger';
import { NftDetectionControllerMessenger } from '@metamask/assets-controllers';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<NftDetectionControllerMessenger>,
  MessengerEvents<NftDetectionControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getNftDetectionControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const nftDetectionControllerMessenger =
      getNftDetectionControllerMessenger(rootMessenger);

    expect(nftDetectionControllerMessenger).toBeInstanceOf(Messenger);
  });
});

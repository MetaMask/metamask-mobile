import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  MessengerActions,
  MessengerEvents,
  MockAnyNamespace,
} from '@metamask/messenger';
import { ProofOfOwnershipServiceMessenger } from '@metamask/profile-metrics-controller';
import { getProofOfOwnershipServiceMessenger } from './proof-of-ownership-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ProofOfOwnershipServiceMessenger>,
  MessengerEvents<ProofOfOwnershipServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getProofOfOwnershipServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const proofOfOwnershipServiceMessenger =
      getProofOfOwnershipServiceMessenger(messenger);

    expect(proofOfOwnershipServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates required actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getProofOfOwnershipServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'KeyringController:signPersonalMessage',
          'SnapController:handleRequest',
        ]),
      }),
    );
  });
});

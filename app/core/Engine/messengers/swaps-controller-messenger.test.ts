import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { SwapsControllerMessenger } from '@metamask/swaps-controller';
import { getSwapsControllerMessenger } from './swaps-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SwapsControllerMessenger>,
  MessengerEvents<SwapsControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
describe('getSwapsControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const swapsControllerMessenger = getSwapsControllerMessenger(messenger);

    expect(swapsControllerMessenger).toBeInstanceOf(Messenger);
  });
});

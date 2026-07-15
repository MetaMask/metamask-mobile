import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import type { StellarAssetsControllerMessenger } from '../../controllers/stellar-assets-controller/stellar-assets-controller';
import {
  getStellarAssetsControllerInitMessenger,
  getStellarAssetsControllerMessenger,
  type StellarAssetsControllerInitMessenger,
} from './stellar-assets-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<StellarAssetsControllerMessenger>
  | MessengerActions<StellarAssetsControllerInitMessenger>,
  | MessengerEvents<StellarAssetsControllerMessenger>
  | MessengerEvents<StellarAssetsControllerInitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getStellarAssetsControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const stellarAssetsControllerMessenger =
      getStellarAssetsControllerMessenger(rootMessenger);

    expect(stellarAssetsControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getStellarAssetsControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const stellarAssetsControllerInitMessenger =
      getStellarAssetsControllerInitMessenger(rootMessenger);

    expect(stellarAssetsControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});

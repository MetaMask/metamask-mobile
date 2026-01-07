import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { DeFiPositionsControllerMessenger } from '@metamask/assets-controllers';
import {
  getDeFiPositionsControllerInitMessenger,
  getDeFiPositionsControllerMessenger,
  DeFiPositionsControllerInitMessenger,
} from './defi-positions-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<DeFiPositionsControllerMessenger>
  | MessengerActions<DeFiPositionsControllerInitMessenger>,
  | MessengerEvents<DeFiPositionsControllerMessenger>
  | MessengerEvents<DeFiPositionsControllerInitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getDeFiPositionsControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const defiPositionsControllerMessenger =
      getDeFiPositionsControllerMessenger(rootMessenger);

    expect(defiPositionsControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getDeFiPositionsControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const defiPositionsControllerInitMessenger =
      getDeFiPositionsControllerInitMessenger(rootMessenger);

    expect(defiPositionsControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});

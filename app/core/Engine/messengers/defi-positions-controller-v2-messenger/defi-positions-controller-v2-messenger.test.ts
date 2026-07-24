import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { DeFiPositionsControllerV2Messenger } from '@metamask/assets-controllers';
import {
  getDeFiPositionsControllerV2InitMessenger,
  getDeFiPositionsControllerV2Messenger,
  DeFiPositionsControllerV2InitMessenger,
} from './defi-positions-controller-v2-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<DeFiPositionsControllerV2Messenger>
  | MessengerActions<DeFiPositionsControllerV2InitMessenger>,
  | MessengerEvents<DeFiPositionsControllerV2Messenger>
  | MessengerEvents<DeFiPositionsControllerV2InitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getDeFiPositionsControllerV2Messenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const defiPositionsControllerV2Messenger =
      getDeFiPositionsControllerV2Messenger(rootMessenger);

    expect(defiPositionsControllerV2Messenger).toBeInstanceOf(Messenger);
  });
});

describe('getDeFiPositionsControllerV2InitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const defiPositionsControllerV2InitMessenger =
      getDeFiPositionsControllerV2InitMessenger(rootMessenger);

    expect(defiPositionsControllerV2InitMessenger).toBeInstanceOf(Messenger);
  });
});

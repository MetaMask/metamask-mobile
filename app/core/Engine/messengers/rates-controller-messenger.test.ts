import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getRatesControllerMessenger,
  getRatesControllerInitMessenger,
  RatesControllerInitMessenger,
} from './rates-controller-messenger';
import { CurrencyRateMessenger } from '@metamask/assets-controllers';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<CurrencyRateMessenger>
  | MessengerActions<RatesControllerInitMessenger>,
  | MessengerEvents<CurrencyRateMessenger>
  | MessengerEvents<RatesControllerInitMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getRatesControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const ratesControllerMessenger = getRatesControllerMessenger(rootMessenger);

    expect(ratesControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getRatesControllerInitMessenger', () => {
  it('returns a messenger for initialization', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const ratesControllerInitMessenger =
      getRatesControllerInitMessenger(rootMessenger);

    expect(ratesControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});

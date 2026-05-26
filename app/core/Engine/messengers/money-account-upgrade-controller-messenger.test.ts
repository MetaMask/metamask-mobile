import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { MoneyAccountUpgradeControllerMessenger } from '@metamask/money-account-upgrade-controller';
import {
  KeyringControllerGetStateAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerState,
} from '@metamask/remote-feature-flag-controller';
import { ControllerStateChangeEvent } from '@metamask/base-controller';
import {
  getMoneyAccountUpgradeControllerMessenger,
  getMoneyAccountUpgradeControllerInitMessenger,
} from './money-account-upgrade-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<MoneyAccountUpgradeControllerMessenger>
  | KeyringControllerGetStateAction
  | RemoteFeatureFlagControllerGetStateAction,
  | MessengerEvents<MoneyAccountUpgradeControllerMessenger>
  | KeyringControllerUnlockEvent
  | ControllerStateChangeEvent<
      'RemoteFeatureFlagController',
      RemoteFeatureFlagControllerState
    >
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getMoneyAccountUpgradeControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const moneyAccountUpgradeControllerMessenger =
      getMoneyAccountUpgradeControllerMessenger(rootMessenger);

    expect(moneyAccountUpgradeControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getMoneyAccountUpgradeControllerInitMessenger', () => {
  it('returns a restricted init messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const moneyAccountUpgradeControllerInitMessenger =
      getMoneyAccountUpgradeControllerInitMessenger(rootMessenger);

    expect(moneyAccountUpgradeControllerInitMessenger).toBeInstanceOf(
      Messenger,
    );
  });
});

import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { MoneyAccountUpgradeControllerMessenger } from '@metamask/money-account-upgrade-controller';
import { NetworkControllerGetStateAction } from '@metamask/network-controller';
import {
  getMoneyAccountUpgradeControllerMessenger,
  getMoneyAccountUpgradeControllerInitMessenger,
} from './money-account-upgrade-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<MoneyAccountUpgradeControllerMessenger>
  | NetworkControllerGetStateAction,
  MessengerEvents<MoneyAccountUpgradeControllerMessenger>
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

  it('delegates the bootstrap triggers the controller subscribes to', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getMoneyAccountUpgradeControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'KeyringController:getState',
          'RemoteFeatureFlagController:getState',
        ]),
        events: [
          'KeyringController:stateChange',
          'RemoteFeatureFlagController:stateChange',
        ],
      }),
    );
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

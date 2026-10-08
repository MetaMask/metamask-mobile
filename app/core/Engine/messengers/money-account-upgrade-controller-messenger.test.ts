import { Messenger, MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { getMoneyAccountUpgradeControllerMessenger } from './money-account-upgrade-controller-messenger';

describe('getMoneyAccountUpgradeControllerMessenger', () => {
  it('returns a restricted messenger with bootstrap dependencies', () => {
    const rootMessenger = new Messenger<MockAnyNamespace>({ namespace: MOCK_ANY_NAMESPACE });
    const messenger = getMoneyAccountUpgradeControllerMessenger(rootMessenger);
    expect(messenger).toBeInstanceOf(Messenger);
  });
});

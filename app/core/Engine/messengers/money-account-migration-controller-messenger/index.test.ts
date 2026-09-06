import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getMoneyAccountMigrationControllerMessenger } from '.';
import type { MoneyAccountMigrationControllerMessenger } from '../../controllers/money-account-migration-controller/types';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MoneyAccountMigrationControllerMessenger>,
  MessengerEvents<MoneyAccountMigrationControllerMessenger>
>;

describe('getMoneyAccountMigrationControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });

    const messenger =
      getMoneyAccountMigrationControllerMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});

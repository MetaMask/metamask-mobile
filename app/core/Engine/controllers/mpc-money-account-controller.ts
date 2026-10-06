import { getUUIDFromAddressOfNormalAccount } from '@metamask/accounts-controller';
import {
  MoneyAccountController,
  type MoneyAccount,
  type MoneyAccountControllerMessenger,
} from '@metamask/money-account-controller';
import {
  isMpcBackedMoneyAccount,
  type MpcBackedMoneyAccount,
} from '../../../lib/Money/mpc-money-account';

const MIGRATE_ACTION = 'MoneyAccountController:migrateMoneyAccountAddress';

export { isMpcBackedMoneyAccount };
export type { MpcBackedMoneyAccount };

/**
 * Extends Money Account with migration to the MPC keyring address.
 */
export class MpcMoneyAccountController extends MoneyAccountController {
  constructor(options: {
    messenger: MoneyAccountControllerMessenger;
    state?: ConstructorParameters<typeof MoneyAccountController>[0]['state'];
  }) {
    super(options);

    const messenger = this.messenger as
      | {
          registerActionHandler?: (
            actionType: string,
            handler: (address: string) => void,
          ) => void;
        }
      | undefined;

    messenger?.registerActionHandler?.(MIGRATE_ACTION, (address: string) => {
      this.migrateMoneyAccountAddress(address);
    });
  }

  /**
   * Point the primary money account at the MPC keyring address.
   *
   * @param newAddress - The MPC keyring account address.
   */
  migrateMoneyAccountAddress(newAddress: string): void {
    const current = this.getMoneyAccount();
    if (!current) {
      throw new Error('No money account to migrate');
    }

    if (
      current.address.toLowerCase() === newAddress.toLowerCase() &&
      isMpcBackedMoneyAccount(current)
    ) {
      return;
    }

    const id = getUUIDFromAddressOfNormalAccount(newAddress);
    const migrated: MpcBackedMoneyAccount = {
      ...current,
      id,
      address: newAddress,
      options: {
        ...current.options,
        mpcKeyring: true,
      } as MoneyAccount['options'] & { mpcKeyring: true },
    };

    this.update((state) => {
      delete state.moneyAccounts[current.id];
      state.moneyAccounts[id] = migrated;
    });
  }
}

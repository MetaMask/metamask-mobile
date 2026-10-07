import type {
  KeyringControllerAddNewKeyringAction,
  KeyringControllerGetStateAction,
  KeyringControllerWithKeyringAction,
} from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';
import type { MoneyAccountControllerInitAction } from '@metamask/money-account-controller';
import { isStrictHexString, type Hex } from '@metamask/utils';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Logger from '../../../util/Logger';

const serviceName = 'MoneyAccountMpcService';

export interface MoneyAccountControllerMigrateMoneyAccountAddressAction {
  type: 'MoneyAccountController:migrateMoneyAccountAddress';
  handler: (address: string) => void;
}

type MoneyAccountMpcAllowedActions =
  | KeyringControllerAddNewKeyringAction
  | KeyringControllerGetStateAction
  | KeyringControllerWithKeyringAction
  | MoneyAccountControllerInitAction
  | MoneyAccountControllerMigrateMoneyAccountAddressAction;

export interface MoneyAccountMpcServiceEnableMfaAction {
  type: `${typeof serviceName}:enableMfa`;
  handler: MoneyAccountMpcService['enableMfa'];
}

export type MoneyAccountMpcMessenger = Messenger<
  typeof serviceName,
  MoneyAccountMpcServiceEnableMfaAction | MoneyAccountMpcAllowedActions,
  never
>;

/**
 * Creates the MPC keyring account and migrates Money Account onto it.
 */
export class MoneyAccountMpcService {
  readonly name: typeof serviceName = serviceName;

  readonly #messenger: MoneyAccountMpcMessenger;

  constructor({ messenger }: { messenger: MoneyAccountMpcMessenger }) {
    Logger.log(serviceName, 'constructor');
    this.#messenger = messenger;
    this.#messenger.registerMethodActionHandlers(this, ['enableMfa']);
  }

  /**
   * Enable MFA for the wallet's Money Account.
   *
   * @returns The MPC keyring account address.
   */
  async enableMfa(): Promise<{ address: Hex }> {
    Logger.log(serviceName, 'enableMfa');
    await this.#messenger.call('MoneyAccountController:init');

    const address = await this.#resolveMpcAddress();
    await this.#messenger.call(
      'MoneyAccountController:migrateMoneyAccountAddress',
      address,
    );

    return { address };
  }

  async #resolveMpcAddress(): Promise<Hex> {
    const { keyrings } = await this.#messenger.call(
      'KeyringController:getState',
    );
    const existing = keyrings.find(
      (keyring) => keyring.type === ExtendedKeyringTypes.mpc,
    );
    const existingAddress = existing?.accounts[0];
    if (isStrictHexString(existingAddress)) {
      return existingAddress;
    }
    Logger.log(serviceName, 'resolveMpcAddress', existingAddress);

    const created = (await this.#messenger.call(
      'KeyringController:addNewKeyring',
      ExtendedKeyringTypes.mpc,
      { mode: 'create' },
    )) as { id: string };

    const accounts = (await this.#messenger.call(
      'KeyringController:withKeyring',
      { id: created.id },
      async ({ keyring }) =>
        (keyring as { getAccounts: () => Promise<string[]> }).getAccounts(),
    )) as unknown as string[];

    const address = accounts[0];
    if (!isStrictHexString(address)) {
      throw new Error('MPC keyring did not produce an account address');
    }

    return address;
  }
}

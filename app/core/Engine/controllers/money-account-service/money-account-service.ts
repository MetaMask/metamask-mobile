import { HdKeyring } from '@metamask/eth-hd-keyring';
import {
  MONEY_DERIVATION_PATH,
  MoneyKeyring,
} from '@metamask/eth-money-keyring';
import {
  KeyringControllerError,
  KeyringMetadata,
} from '@metamask/keyring-controller';

import type { MoneyAccountServiceMessenger } from './types';

export const serviceName = 'MoneyAccountService';

const MESSENGER_EXPOSED_METHODS = [
  'createMoneyAccount',
  'getMoneyAccount',
] as const;

export class MoneyAccountService {
  readonly #messenger: MoneyAccountServiceMessenger;

  name: typeof serviceName = serviceName;

  constructor({ messenger }: { messenger: MoneyAccountServiceMessenger }) {
    this.#messenger = messenger;

    this.#messenger.registerMethodActionHandlers(
      this,
      MESSENGER_EXPOSED_METHODS,
    );
  }

  /**
   * Creates a Money keyring derived from the HD keyring identified by
   * the given entropy source, and returns the new keyring's metadata.
   *
   * If a keyring already existed, just returns null
   *
   * @param entropySource - The metadata id of the HD keyring to derive from.
   * @returns The metadata of the newly created Money keyring.
   */
  async createMoneyAccount(
    entropySource: string,
  ): Promise<KeyringMetadata | null> {
    const mnemonic = (await this.#messenger.call(
      'KeyringController:withKeyring',
      { id: entropySource },
      async ({ keyring }) => {
        if (keyring.type !== HdKeyring.type) {
          throw new Error('Got keyring without HD Keyring type');
        }
        const hdKeyring = keyring as HdKeyring;

        if (!hdKeyring.mnemonic) {
          throw new Error(
            'HD keyring does not have a mnemonic for the given entropy source.',
          );
        }

        return (await hdKeyring.serialize()).mnemonic;
      },
    )) as number[];

    const { keyrings } = this.#messenger.call('KeyringController:getState');

    const moneyKeyringExists = keyrings.some(
      (keyring) => keyring.type === MoneyKeyring.type,
    );

    if (moneyKeyringExists) {
      return null;
    }

    return await this.#messenger.call(
      'KeyringController:addNewKeyring',
      MoneyKeyring.type,
      { mnemonic, numberOfAccounts: 1, hdPath: MONEY_DERIVATION_PATH },
    );
  }

  /**
   * Returns the Money keyring metadata if one exists, otherwise null.
   *
   * @returns The metadata of the Money keyring, or null if none exists.
   */
  async getMoneyAccount(): Promise<KeyringMetadata | null> {
    return (await this.#messenger
      .call(
        'KeyringController:withKeyring',
        { type: MoneyKeyring.type },
        async ({ metadata }) => metadata,
      )
      .catch((error: unknown) => {
        if (error instanceof KeyringControllerError) {
          // TODO: how should we determine whether this is a 'real' error, or something we potentially expect, like not finding a keyring?
          return null;
        }
        throw error;
      })) as KeyringMetadata | null;
  }
}

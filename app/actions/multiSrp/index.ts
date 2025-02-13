import HdKeyring from '@metamask/eth-hd-keyring';
import { Json } from '@metamask/eth-query';
import { EthKeyring } from '@metamask/keyring-internal-api';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { KeyringSelector } from '@metamask/keyring-controller';

export async function importNewSecretRecoveryPhrase(mnemonic: string) {
  const { KeyringController } = Engine.context;

  try {
    const hdKeyrings = (await KeyringController.getKeyringsByType(
      ExtendedKeyringTypes.hd,
    )) as HdKeyring[];
    const alreadyImportedSRP = hdKeyrings.some(
      (keyring) =>
        Buffer.from(
          Buffer.from(
            Array.from(new Uint16Array(Buffer.from(keyring.mnemonic).buffer))
              .map((i) => wordlist[i])
              .join(' '),
          ),
        ).toString('utf8') === mnemonic,
    );

    if (alreadyImportedSRP) {
      throw new Error('This mnemonic has already been imported.');
    }

    const newKeyring = (await KeyringController.addNewKeyring(
      ExtendedKeyringTypes.hd,
      {
        mnemonic,
        numberOfAccounts: 1,
      },
    )) as EthKeyring<Json>;
    const newAccountAddress = (await newKeyring.getAccounts())[0];
    return Engine.setSelectedAddress(newAccountAddress);
  } catch (e: unknown) {
    Logger.error(e as Error, 'error while trying to add a new account');
  }
}

export async function createNewSecretRecoveryPhrase() {
  const { KeyringController } = Engine.context;
  try {
    const newHdkeyring = (await KeyringController.addNewKeyring(
      ExtendedKeyringTypes.hd,
    )) as HdKeyring;

    const newAccountAddress = (await newHdkeyring.getAccounts())[0];
    return Engine.setSelectedAddress(newAccountAddress);
  } catch (e: unknown) {
    Logger.error(e as Error, 'error while trying to add a new srp');
  }
}

export async function addNewHdAccount(
  keyringId?: string,
  name?: string,
): Promise<void> {
  const { KeyringController } = Engine.context;
  try {
    const keyringSelector: KeyringSelector = keyringId
      ? {
          id: keyringId,
        }
      : {
          type: ExtendedKeyringTypes.hd,
        };

    Logger.log('keyringSelector', keyringSelector);

    const addedAccountAddress = await KeyringController.withKeyring(
      keyringSelector,
      async (keyring) => (await keyring.addAccounts(1))[0],
    );
    Logger.log('added account address', addedAccountAddress);
    Engine.setSelectedAddress(addedAccountAddress);

    if (name) {
      Engine.setAccountLabel(addedAccountAddress, name);
    }
  } catch (e: unknown) {
    Logger.error(e as Error, 'error while trying to add a new account');
  }
}

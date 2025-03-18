import HdKeyring from '@metamask/eth-hd-keyring';
import { Json } from '@metamask/eth-query';
import { EthKeyring } from '@metamask/keyring-internal-api';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';

export async function importNewSecretRecoveryPhrase(mnemonic: string) {
  const { KeyringController } = Engine.context;

  const hdKeyrings = (await KeyringController.getKeyringsByType(
    ExtendedKeyringTypes.hd,
  )) as HdKeyring[];
  const alreadyImportedSRP = hdKeyrings.some((keyring) => {
    const codePointsToEnglishWords = Buffer.from(
      Array.from(new Uint16Array(Buffer.from(keyring.mnemonic).buffer))
        .map((i) => wordlist[i])
        .join(' '),
    );
    return Buffer.from(codePointsToEnglishWords).toString('utf8') === mnemonic;
  });

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
  const [newAccountAddress] = await newKeyring.getAccounts();
  return Engine.setSelectedAddress(newAccountAddress);
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

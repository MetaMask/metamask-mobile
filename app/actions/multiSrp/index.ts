import { HdKeyring } from '@metamask/eth-hd-keyring';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import { KeyringSelector } from '@metamask/keyring-controller';
///: BEGIN:ONLY_INCLUDE_IF(beta)
import {
  MultichainWalletSnapFactory,
  WalletClientType,
} from '../../core/SnapKeyring/MultichainWalletSnapClient';
///: END:ONLY_INCLUDE_IF
import {
  endPerformanceTrace,
  startPerformanceTrace,
} from '../../core/redux/slices/performance';
import { PerformanceEventNames } from '../../core/redux/slices/performance/constants';
import { store } from '../../store';

///: BEGIN:ONLY_INCLUDE_IF(seedless-onboarding)
import ReduxService from '../../core/redux';
import {
  bufferedEndTrace,
  bufferedTrace,
  TraceName,
  TraceOperation,
} from '../../util/trace';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
///: END:ONLY_INCLUDE_IF(seedless-onboarding)

export async function importNewSecretRecoveryPhrase(mnemonic: string) {
  const { KeyringController } = Engine.context;

  // Convert input mnemonic to codepoints
  const mnemonicWords = mnemonic.toLowerCase().split(' ');
  const inputCodePoints = new Uint16Array(
    mnemonicWords.map((word) => wordlist.indexOf(word)),
  );

  const hdKeyrings = (await KeyringController.getKeyringsByType(
    ExtendedKeyringTypes.hd,
  )) as HdKeyring[];

  // TODO: This is temporary and will be removed once https://github.com/MetaMask/core/issues/5411 is resolved.
  const alreadyImportedSRP = hdKeyrings.some((keyring) => {
    // Compare directly with stored codepoints
    const storedCodePoints = new Uint16Array(
      // The mnemonic will not be undefined because there will be a keyring.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      Buffer.from(keyring.mnemonic!).buffer,
    );

    if (inputCodePoints.length !== storedCodePoints.length) return false;

    return inputCodePoints.every(
      (code, index) => code === storedCodePoints[index],
    );
  });

  if (alreadyImportedSRP) {
    throw new Error('This mnemonic has already been imported.');
  }

  const newKeyring = await KeyringController.addNewKeyring(
    ExtendedKeyringTypes.hd,
    {
      mnemonic,
      numberOfAccounts: 1,
    },
  );

  const [newAccountAddress] = await KeyringController.withKeyring(
    {
      id: newKeyring.id,
    },
    async ({ keyring }) => keyring.getAccounts(),
  );

  ///: BEGIN:ONLY_INCLUDE_IF(seedless-onboarding)
  const { SeedlessOnboardingController } = Engine.context;

  // TODO: to use loginCompleted
  if (selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
    // on Error, wallet should notify user that the newly added seed phrase is not synced properly
    // user can try manual sync again (phase 2)
    const seed = new Uint8Array(inputCodePoints.buffer);
    let addSeedPhraseSuccess = false;
    try {
      bufferedTrace({
        name: TraceName.OnboardingAddSrp,
        op: TraceOperation.OnboardingSecurityOp,
      });
      await SeedlessOnboardingController.addNewSeedPhraseBackup(
        seed,
        newKeyring.id,
      );
      addSeedPhraseSuccess = true;
    } finally {
      bufferedEndTrace({
        name: TraceName.OnboardingAddSrp,
        data: { success: addSeedPhraseSuccess },
      });
    }
  }
  ///: END:ONLY_INCLUDE_IF(seedless-onboarding)

  ///: BEGIN:ONLY_INCLUDE_IF(beta)
  const multichainClient = MultichainWalletSnapFactory.createClient(
    WalletClientType.Solana,
  );

  await multichainClient.addDiscoveredAccounts(newKeyring.id);
  ///: END:ONLY_INCLUDE_IF

  return Engine.setSelectedAddress(newAccountAddress);
}

export async function createNewSecretRecoveryPhrase() {
  const { KeyringController } = Engine.context;
  const newHdkeyring = await KeyringController.addNewKeyring(
    ExtendedKeyringTypes.hd,
  );

  const [newAccountAddress] = await KeyringController.withKeyring(
    {
      id: newHdkeyring.id,
    },
    async ({ keyring }) => keyring.getAccounts(),
  );

  return Engine.setSelectedAddress(newAccountAddress);
}

export async function addNewHdAccount(
  keyringId?: string,
  name?: string,
): Promise<void> {
  const { KeyringController } = Engine.context;
  const keyringSelector: KeyringSelector = keyringId
    ? {
        id: keyringId,
      }
    : {
        type: ExtendedKeyringTypes.hd,
      };

  store.dispatch(
    startPerformanceTrace({
      eventName: PerformanceEventNames.AddHdAccount,
    }),
  );

  const [addedAccountAddress] = await KeyringController.withKeyring(
    keyringSelector,
    async ({ keyring }) => await keyring.addAccounts(1),
  );
  Engine.setSelectedAddress(addedAccountAddress);

  if (name) {
    Engine.setAccountLabel(addedAccountAddress, name);
  }

  // We consider the account to be created once it got selected and renamed.
  store.dispatch(
    endPerformanceTrace({
      eventName: PerformanceEventNames.AddHdAccount,
    }),
  );
}

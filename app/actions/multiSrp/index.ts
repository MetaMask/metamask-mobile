import { HdKeyring } from '@metamask/eth-hd-keyring';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import { KeyringSelector } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  MultichainWalletSnapFactory,
  WalletClientType,
} from '../../core/SnapKeyring/MultichainWalletSnapClient';
///: END:ONLY_INCLUDE_IF
import {
  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  SolScope,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  BtcScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import {
  endPerformanceTrace,
  startPerformanceTrace,
} from '../../core/redux/slices/performance';
import { PerformanceEventNames } from '../../core/redux/slices/performance/constants';
import { store } from '../../store';
import { getTraceTags } from '../../util/sentry/tags';

import ReduxService from '../../core/redux';
import { TraceName, TraceOperation, trace, endTrace } from '../../util/trace';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import { SecretType } from '@metamask/seedless-onboarding-controller';

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

  const { SeedlessOnboardingController } = Engine.context;

  // TODO: to use loginCompleted
  if (selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
    // on Error, wallet should notify user that the newly added seed phrase is not synced properly
    // user can try manual sync again (phase 2)
    const seed = new Uint8Array(inputCodePoints.buffer);
    let addSeedPhraseSuccess = false;
    try {
      trace({
        name: TraceName.OnboardingAddSrp,
        op: TraceOperation.OnboardingSecurityOp,
      });
      await SeedlessOnboardingController.addNewSecretData(
        seed,
        SecretType.Mnemonic,
        {
          keyringId: newKeyring.id,
        },
      );
      addSeedPhraseSuccess = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // Log the error but don't let it crash the import process
      console.error('Failed to backup seed phrase:', errorMessage);

      trace({
        name: TraceName.OnboardingAddSrpError,
        op: TraceOperation.OnboardingError,
        tags: { errorMessage },
      });
      endTrace({
        name: TraceName.OnboardingAddSrpError,
      });

      throw error;
    } finally {
      endTrace({
        name: TraceName.OnboardingAddSrp,
        data: { success: addSeedPhraseSuccess },
      });
    }
  }

  let discoveredAccountsCount = 0;

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const bitcoinMultichainClient = MultichainWalletSnapFactory.createClient(
    WalletClientType.Bitcoin,
  );
  discoveredAccountsCount +=
    await bitcoinMultichainClient.addDiscoveredAccounts(
      newKeyring.id,
      BtcScope.Mainnet,
    );
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  const solanaMultichainClient = MultichainWalletSnapFactory.createClient(
    WalletClientType.Solana,
  );
  discoveredAccountsCount += await solanaMultichainClient.addDiscoveredAccounts(
    newKeyring.id,
    SolScope.Mainnet,
  );
  ///: END:ONLY_INCLUDE_IF

  Engine.setSelectedAddress(newAccountAddress);

  return { address: newAccountAddress, discoveredAccountsCount };
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
): Promise<InternalAccount> {
  store.dispatch(
    startPerformanceTrace({
      eventName: PerformanceEventNames.AddHdAccount,
    }),
  );

  trace({
    name: TraceName.CreateHdAccount,
    op: TraceOperation.CreateAccount,
    tags: getTraceTags(store.getState()),
  });

  const { KeyringController, AccountsController } = Engine.context;
  const keyringSelector: KeyringSelector = keyringId
    ? {
        id: keyringId,
      }
    : {
        type: ExtendedKeyringTypes.hd,
      };

  const [addedAccountAddress] = await KeyringController.withKeyring(
    keyringSelector,
    async ({ keyring }) => await keyring.addAccounts(1),
  );
  Engine.setSelectedAddress(addedAccountAddress);

  if (name) {
    Engine.setAccountLabel(addedAccountAddress, name);
  }

  const account = AccountsController.getAccountByAddress(addedAccountAddress);

  // This should always be true. If it's not, we have a bug.
  // We query the account that was newly created and return it.
  if (!account) {
    throw new Error('Account not found after creation');
  }

  // We consider the account to be created once it got selected and renamed.
  endTrace({
    name: TraceName.CreateHdAccount,
  });

  store.dispatch(
    endPerformanceTrace({
      eventName: PerformanceEventNames.AddHdAccount,
    }),
  );

  return account;
}

import { HdKeyring } from '@metamask/eth-hd-keyring';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import { KeyringSelector } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  MultichainWalletSnapFactory,
  WALLET_SNAP_MAP,
  WalletClientType,
} from '../../core/SnapKeyring/MultichainWalletSnapClient';
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
import Logger from '../../util/Logger';
import { discoverAccounts } from '../../multichain-accounts/discovery';
import { isMultichainAccountsState2Enabled } from '../../multichain-accounts/remote-feature-flag';
import { captureException } from '@sentry/core';

interface ImportNewSecretRecoveryPhraseOptions {
  shouldSelectAccount: boolean;
}

interface ImportNewSecretRecoveryPhraseReturnType {
  address: string;
  discoveredAccountsCount: number;
}

export async function importNewSecretRecoveryPhrase(
  mnemonic: string,
  options: ImportNewSecretRecoveryPhraseOptions = {
    shouldSelectAccount: true,
  },
  callback?: (options: ImportNewSecretRecoveryPhraseReturnType) => void,
): Promise<ImportNewSecretRecoveryPhraseReturnType> {
  const { KeyringController } = Engine.context;
  const { shouldSelectAccount } = options;

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
      // handle seedless controller import error by reverting keyring controller mnemonic import
      // KeyringController.removeAccount will remove keyring when it's emptied, currently there are no other method in keyring controller to remove keyring
      await KeyringController.removeAccount(newAccountAddress);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // Log the error but don't let it crash the import process
      Logger.error(new Error(`Failed to backup seed phrase: ${errorMessage}`));

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

  let discoveredAccountsCount: number = 0;
  if (isMultichainAccountsState2Enabled()) {
    // We use an IIFE to be able to use async/await but not block the main thread.
    (async () => {
      try {
        // We need to dispatch a full sync here since this is a new SRP
        await Engine.context.AccountTreeController.syncWithUserStorage();
        // Then we discover accounts
        discoveredAccountsCount = await discoverAccounts(newKeyring.id);
      } catch (error) {
        captureException(
          new Error(`Unable to sync, discover and create accounts: ${error}`),
        );
        discoveredAccountsCount = 0;
      } finally {
        // We trigger the callback with the results, even in case of error (0 discovered accounts)
        callback?.({ address: newAccountAddress, discoveredAccountsCount });
      }
    })();
  } else {
    discoveredAccountsCount = (
      await Promise.all(
        Object.values(WalletClientType).map(async (clientType) => {
          const snapClient =
            MultichainWalletSnapFactory.createClient(clientType);
          return await snapClient.addDiscoveredAccounts(
            newKeyring.id,
            WALLET_SNAP_MAP[clientType].discoveryScope,
          );
        }),
      )
    ).reduce((acc, count) => acc + count || 0, 0);
  }

  if (shouldSelectAccount) {
    Engine.setSelectedAddress(newAccountAddress);
  }

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

import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import { KeyringSelector } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
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
import { captureException } from '@sentry/core';
import { toMultichainAccountGroupId } from '@metamask/account-api';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';

export interface ImportNewSecretRecoveryPhraseOptions {
  shouldSelectAccount: boolean;
}

export interface ImportNewSecretRecoveryPhraseReturnType {
  address: string;
  discoveredAccountsCount: number;
}

export async function importNewSecretRecoveryPhrase(
  seed: string,
  options: ImportNewSecretRecoveryPhraseOptions = {
    shouldSelectAccount: true,
  },
  callback?: (
    options: ImportNewSecretRecoveryPhraseReturnType & { error?: Error },
  ) => Promise<void>,
): Promise<ImportNewSecretRecoveryPhraseReturnType> {
  const { MultichainAccountService } = Engine.context;
  const { shouldSelectAccount } = options;

  // Convert mnemonic
  const seedLower = seed.toLowerCase();
  const mnemonic = mnemonicPhraseToBytes(seedLower);

  const wallet = await MultichainAccountService.createMultichainAccountWallet({
    type: 'import',
    mnemonic,
  });
  // NOTE: This should never fail because a wallet can only be created if it has
  // at least one account and thus, one group too.
  const group = wallet.getAccountGroup(
    toMultichainAccountGroupId(wallet.id, 0),
  );
  if (!group) {
    throw new Error(
      'Failed to get default multichain account group after wallet creation',
    );
  }
  const [account] = group.getAccounts();
  if (!account) {
    throw new Error(
      'Failed to get default account from multichain account group after wallet creation',
    );
  }
  const entropySource = wallet.entropySource;
  const newAccountAddress = account.address;

  const { SeedlessOnboardingController } = Engine.context;

  // TODO: to use loginCompleted
  if (selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
    // on Error, wallet should notify user that the newly added seed phrase is not synced properly
    // user can try manual sync again (phase 2)
    let addSeedPhraseSuccess = false;
    try {
      trace({
        name: TraceName.OnboardingAddSrp,
        op: TraceOperation.OnboardingSecurityOp,
      });
      await SeedlessOnboardingController.addNewSecretData(
        mnemonic,
        SecretType.Mnemonic,
        {
          keyringId: entropySource,
        },
      );
      addSeedPhraseSuccess = true;
    } catch (error) {
      await MultichainAccountService.removeMultichainAccountWallet(
        entropySource,
        newAccountAddress,
      );

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

  // This function will return 0 discovered account immediately, so we have to use
  // the `callback` instead to get this information.
  let discoveredAccountsCount: number = 0;
  // We use an IIFE to be able to use async/await but not block the main thread.
  (async () => {
    let capturedError;
    try {
      // HACK: Force Snap keyring instantiation.
      await Engine.getSnapKeyring();
      // We need to dispatch a full sync here since this is a new SRP
      await Engine.context.AccountTreeController.syncWithUserStorage();
      // Then we discover accounts
      discoveredAccountsCount = await discoverAccounts(entropySource);
    } catch (error) {
      capturedError = new Error(
        `Unable to sync, discover and create accounts: ${error}`,
      );
      discoveredAccountsCount = 0;

      captureException(capturedError);
    } finally {
      // We trigger the callback with the results, even in case of error (0 discovered accounts)
      await callback?.({
        address: newAccountAddress,
        discoveredAccountsCount,
        error: capturedError,
      });
    }
  })();

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

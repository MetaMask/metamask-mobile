import Engine from '../../core/Engine';

import ReduxService from '../../core/redux';
import { TraceName, TraceOperation, trace, endTrace } from '../../util/trace';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import { SecretType } from '@metamask/seedless-onboarding-controller';
import Logger from '../../util/Logger';
import { discoverAccounts } from '../../multichain-accounts/discovery';
import { captureException } from '@sentry/core';
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
  const { KeyringController, MultichainAccountService } = Engine.context;
  const { shouldSelectAccount } = options;

  // Convert mnemonic
  const seedLower = seed.toLowerCase();
  const mnemonic = mnemonicPhraseToBytes(seedLower);

  const wallet = await MultichainAccountService.createMultichainAccountWallet({
    type: 'import',
    mnemonic,
  });
  const entropySource = wallet.entropySource;

  const [newAccount] = await KeyringController.withKeyringV2(
    {
      id: entropySource,
    },
    async ({ keyring }) => keyring.getAccounts(),
  );

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
        newAccount.address,
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
        address: newAccount.address,
        discoveredAccountsCount,
        error: capturedError,
      });
    }
  })();

  if (shouldSelectAccount) {
    Engine.setSelectedAddress(newAccount.address);
  }

  return { address: newAccount.address, discoveredAccountsCount };
}

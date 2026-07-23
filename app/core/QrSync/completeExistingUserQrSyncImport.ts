import { importNewSecretRecoveryPhrase } from '../../actions/multiSrp';
import Routes from '../../constants/navigation/Routes';
import { showAlreadySyncedSheet } from '../../components/Views/AddDeviceToWallet/showAlreadySyncedSheet';
import { showImportFailedSheet } from '../../components/Views/AddDeviceToWallet/showImportFailedSheet';
import Engine from '../Engine';
import type { AppNavigationProp } from '../NavigationService/types';
import { isDuplicateMnemonicError } from './duplicateMnemonicError';
import { QrSyncSyncFlows } from './constants';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from './qrSyncTelemetry';
import { startExistingUserQrMetadataProvisioning } from './startExistingUserQrMetadataProvisioning';

export {
  DUPLICATE_MNEMONIC_ERROR_MESSAGES,
  isDuplicateMnemonicError,
} from './duplicateMnemonicError';

/** Prevents Add Device + QR scanner from starting two imports at once. */
let inFlightExistingUserImport: Promise<void> | null = null;

const showAlreadySyncedAndGoHome = (navigation: AppNavigationProp): void => {
  navigation.navigate(Routes.WALLET_VIEW);
  showAlreadySyncedSheet(navigation);
};

const runExistingUserQrSyncImport = async (
  navigation: AppNavigationProp,
  mnemonic: string,
): Promise<void> => {
  try {
    // Do not race import against a timer — Multichain/keyring import cannot be
    // cancelled, and a timeout would leave late vault mutations after failure UI.
    // skipDiscovery: Phase C applies extension layout, then reconciles user storage.
    const { entropySource } = await importNewSecretRecoveryPhrase(mnemonic, {
      shouldSelectAccount: true,
      skipDiscovery: true,
    });

    // Primary SRP is now in the vault. Remaining-secret / Phase B failures must
    // not show a total import-failed UI (Bugbot: failure UI after primary import).
    Engine.context.QrSyncController.enrichPrimaryProvisioningEntry(
      entropySource,
    );

    try {
      await Engine.context.QrSyncController.importRemainingSecrets();
    } catch (remainingError) {
      reportQrSyncFailure(remainingError, {
        surface: QrSyncSurfaces.IMPORT,
        operation: QrSyncOperations.IMPORT_REMAINING_SECRETS,
        source: QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT,
        syncFlow: QrSyncSyncFlows.EXISTING_USER,
      });
    }

    // Phase C only when Phase B finalized to secrets_imported (Bugbot: Phase C
    // after incomplete Phase B). Otherwise clear QR state and still go Home —
    // the primary SRP import already succeeded.
    if (
      !startExistingUserQrMetadataProvisioning(
        QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT,
      )
    ) {
      Engine.context.QrSyncController.resetState();
    }

    navigation.navigate(Routes.WALLET_VIEW);
  } catch (error) {
    Engine.context.QrSyncController.resetState();

    if (isDuplicateMnemonicError(error)) {
      showAlreadySyncedAndGoHome(navigation);
      return;
    }

    reportQrSyncFailure(error, {
      surface: QrSyncSurfaces.IMPORT,
      operation: QrSyncOperations.EXISTING_USER_MNEMONIC_IMPORT,
      source: QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT,
      syncFlow: QrSyncSyncFlows.EXISTING_USER,
    });
    navigation.navigate(Routes.WALLET_VIEW);
    showImportFailedSheet(navigation);
  }
};

/**
 * Completes existing-user QR sync by importing the primary mnemonic, remaining
 * secrets, and applying extension wallet/account metadata (Phase C) when Phase B
 * finalized successfully.
 * Duplicate SRP is surfaced with SuccessErrorSheet and treated as
 * already-synced.
 */
export const completeExistingUserQrSyncImport = async (
  navigation: AppNavigationProp,
  mnemonic: string,
): Promise<void> => {
  if (inFlightExistingUserImport) {
    return inFlightExistingUserImport;
  }

  inFlightExistingUserImport = runExistingUserQrSyncImport(
    navigation,
    mnemonic,
  ).finally(() => {
    inFlightExistingUserImport = null;
  });

  return inFlightExistingUserImport;
};

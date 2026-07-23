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
    // Existing-user sync never receives the extension primary mnemonic, so skip
    // enrichPrimaryProvisioningEntry — only import remaining (non-primary) secrets.
    await importNewSecretRecoveryPhrase(mnemonic, {
      shouldSelectAccount: true,
      skipDiscovery: true,
    });

    // Vault import of the scanned mnemonic already succeeded. Remaining-secret /
    // Phase B failures must not show a total import-failed UI.
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

    // Fire Phase C (preconditions asserted inside provisionFromMetadata), then
    // always clear QR session state before navigating Home.
    startExistingUserQrMetadataProvisioning(
      QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT,
    );
    Engine.context.QrSyncController.resetState();

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
 * Completes existing-user QR sync by importing the scanned mnemonic, remaining
 * secrets, and starting extension wallet/account metadata provisioning (Phase C).
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

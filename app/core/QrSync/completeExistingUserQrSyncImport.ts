import { importNewSecretRecoveryPhrase } from '../../actions/multiSrp';
import Routes from '../../constants/navigation/Routes';
import { showAlreadySyncedSheet } from '../../components/Views/AddDeviceToWallet/showAlreadySyncedSheet';
import { showImportFailedSheet } from '../../components/Views/AddDeviceToWallet/showImportFailedSheet';
import Engine from '../Engine';
import type { AppNavigationProp } from '../NavigationService/types';
import { isDuplicateMnemonicError } from './duplicateMnemonicError';
import { reportQrSyncFailure } from './qrSyncTelemetry';

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
    await importNewSecretRecoveryPhrase(mnemonic);
    Engine.context.QrSyncController.resetState();
    navigation.navigate(Routes.WALLET_VIEW);
  } catch (error) {
    Engine.context.QrSyncController.resetState();

    if (isDuplicateMnemonicError(error)) {
      showAlreadySyncedAndGoHome(navigation);
      return;
    }

    reportQrSyncFailure(error, {
      surface: 'import',
      operation: 'existing_user_mnemonic_import',
      source: 'completeExistingUserQrSyncImport',
    });
    navigation.navigate(Routes.WALLET_VIEW);
    showImportFailedSheet(navigation);
  }
};

/**
 * Completes existing-user QR sync by importing the primary mnemonic.
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

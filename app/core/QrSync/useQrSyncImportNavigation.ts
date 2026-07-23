import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import Routes from '../../constants/navigation/Routes';
import { selectCompletedOnboarding } from '../../selectors/onboarding';
import {
  selectQrSyncExistingUserImportMnemonic,
  selectQrSyncShouldNavigateToImport,
} from '../../selectors/qrSyncController';
import type { AppNavigationProp } from '../NavigationService/types';
import Engine from '../Engine';
import { QrSyncSecretTypes, QrSyncSyncFlows } from './constants';
import { completeExistingUserQrSyncImport } from './completeExistingUserQrSyncImport';
import { navigateToQrSyncImport } from './navigateToQrSyncImport';
import { showAlreadySyncedSheet } from '../../components/Views/AddDeviceToWallet/showAlreadySyncedSheet';
import { showImportFailedSheet } from '../../components/Views/AddDeviceToWallet/showImportFailedSheet';
import type { QrSyncSecretImportEntry } from './types';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from './qrSyncTelemetry';
import { startExistingUserQrMetadataProvisioning } from './startExistingUserQrMetadataProvisioning';

interface UseQrSyncImportNavigationOptions {
  enabled: boolean;
  deferWhileScannerOpen?: boolean;
  isScannerOpen?: boolean;
}

/** Add Device + QR scanner both mount this hook; only one navigation pass may run. */
let inFlightImportNavigation: Promise<void> | null = null;

const resolveMnemonicFromPendingSecrets = (
  pendingSecretImports: QrSyncSecretImportEntry[] | null | undefined,
): string | null => {
  if (!pendingSecretImports?.length) {
    return null;
  }

  const primaryMnemonic = pendingSecretImports.find(
    (entry) => entry.type === QrSyncSecretTypes.MNEMONIC && entry.isPrimary,
  )?.value;

  if (primaryMnemonic) {
    return primaryMnemonic;
  }

  return (
    pendingSecretImports.find(
      (entry) => entry.type === QrSyncSecretTypes.MNEMONIC,
    )?.value ?? null
  );
};

const finishExistingUserSyncWithoutMnemonic = async (
  navigation: AppNavigationProp,
): Promise<void> => {
  const accountsBefore = await Engine.context.KeyringController.getAccounts();
  let importFailed = false;

  try {
    await Engine.context.QrSyncController.importRemainingSecrets();
  } catch (error) {
    importFailed = true;
    reportQrSyncFailure(error, {
      surface: QrSyncSurfaces.IMPORT,
      operation: QrSyncOperations.IMPORT_REMAINING_SECRETS,
      source: QrSyncTelemetrySources.FINISH_EXISTING_USER_WITHOUT_MNEMONIC,
      syncFlow: QrSyncSyncFlows.EXISTING_USER,
    });
  }

  const accountsAfter = await Engine.context.KeyringController.getAccounts();
  const addedNewAccounts = accountsAfter.length > accountsBefore.length;

  // Thrown failures are real import errors. Unchanged account count after a
  // successful importRemainingSecrets call means the secrets were already here.
  if (importFailed && !addedNewAccounts) {
    Engine.context.QrSyncController.resetState();
    navigation.navigate(Routes.WALLET_VIEW);
    showImportFailedSheet(navigation);
    return;
  }

  if (!addedNewAccounts) {
    Engine.context.QrSyncController.resetState();
    navigation.navigate(Routes.WALLET_VIEW);
    showAlreadySyncedSheet(navigation);
    return;
  }

  // Phase C only when Phase B finalized to secrets_imported; otherwise clear
  // QR state so we do not leave a stuck provisioning session.
  if (
    !startExistingUserQrMetadataProvisioning(
      QrSyncTelemetrySources.FINISH_EXISTING_USER_WITHOUT_MNEMONIC,
    )
  ) {
    Engine.context.QrSyncController.resetState();
  }
  navigation.navigate(Routes.WALLET_VIEW);
};

/**
 * Drives vault import / onboarding navigation after QR sync Phase A
 * (SYNC_READY → awaiting_password with pending secrets).
 */
export const useQrSyncImportNavigation = ({
  enabled,
  // Kept for call-site compatibility; secrets ready must not wait on scanner.
  deferWhileScannerOpen: _deferWhileScannerOpen = false,
  isScannerOpen: _isScannerOpen = false,
}: UseQrSyncImportNavigationOptions): void => {
  const navigation = useNavigation<AppNavigationProp>();
  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const shouldNavigateToImport = useSelector(
    selectQrSyncShouldNavigateToImport,
  );
  const qrSyncMnemonic = useSelector(selectQrSyncExistingUserImportMnemonic);
  const hasHandledImportNavigationRef = useRef(false);

  useEffect(() => {
    if (!enabled || !shouldNavigateToImport) {
      hasHandledImportNavigationRef.current = false;
      return;
    }

    if (hasHandledImportNavigationRef.current || inFlightImportNavigation) {
      return;
    }

    if (completedOnboarding) {
      // Prefer live controller state — Redux can lag/strip ephemeral secrets.
      const pendingSecretImports =
        Engine.context.QrSyncController.state?.pendingSecretImports;
      const mnemonic =
        resolveMnemonicFromPendingSecrets(pendingSecretImports) ??
        qrSyncMnemonic;

      hasHandledImportNavigationRef.current = true;

      if (mnemonic) {
        inFlightImportNavigation = completeExistingUserQrSyncImport(
          navigation,
          mnemonic,
        )
          .catch((error: unknown) => {
            hasHandledImportNavigationRef.current = false;
            Engine.context.QrSyncController.resetState();
            reportQrSyncFailure(error, {
              surface: QrSyncSurfaces.IMPORT,
              operation: QrSyncOperations.EXISTING_USER_IMPORT_NAVIGATION,
              source: QrSyncTelemetrySources.USE_QR_SYNC_IMPORT_NAVIGATION,
              syncFlow: QrSyncSyncFlows.EXISTING_USER,
            });
          })
          .finally(() => {
            inFlightImportNavigation = null;
          });
        return;
      }

      if (pendingSecretImports?.length) {
        inFlightImportNavigation = finishExistingUserSyncWithoutMnemonic(
          navigation,
        ).finally(() => {
          inFlightImportNavigation = null;
        });
        return;
      }

      Engine.context.QrSyncController.resetState();
      navigation.navigate(Routes.WALLET_VIEW);
      return;
    }

    hasHandledImportNavigationRef.current = true;
    navigateToQrSyncImport(navigation);
  }, [
    completedOnboarding,
    enabled,
    navigation,
    qrSyncMnemonic,
    shouldNavigateToImport,
  ]);
};

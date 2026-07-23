import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import Routes from '../../constants/navigation/Routes';
import { selectCompletedOnboarding } from '../../selectors/onboarding';
import { selectQrSyncShouldNavigateToImport } from '../../selectors/qrSyncController';
import type { AppNavigationProp } from '../NavigationService/types';
import Engine from '../Engine';
import { QrSyncSyncFlows } from './constants';
import { navigateToQrSyncImport } from './navigateToQrSyncImport';
import { showAlreadySyncedSheet } from '../../components/Views/AddDeviceToWallet/showAlreadySyncedSheet';
import { showImportFailedSheet } from '../../components/Views/AddDeviceToWallet/showImportFailedSheet';
import Logger from '../../util/Logger';
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

/**
 * Existing-user QR sync after SYNC_READY: import all pending secrets via
 * Phase B (`importRemainingSecrets`), then start Phase C metadata layout.
 *
 * Unlike new-user sync, existing-user has no Authentication restore of a
 * primary SRP — extension may still flag a wallet `isPrimary`, and that
 * mnemonic must be vault-imported + enriched here so Phase C can create
 * groups 1..N. There is no separate `importNewSecretRecoveryPhrase` path.
 */
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

  // Phase C is non-blocking and needs provisioning metadata until
  // `completeProvisioning` runs. Do NOT resetState here — early reset leaves
  // only group 0 (Account 1) per wallet because groups 1..N are created in Phase C.
  // Matches new-user `finalizeOnboardingCompletion` behavior.
  startExistingUserQrMetadataProvisioning(
    QrSyncTelemetrySources.FINISH_EXISTING_USER_WITHOUT_MNEMONIC,
  );
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

      hasHandledImportNavigationRef.current = true;

      if (!pendingSecretImports?.length) {
        Logger.log(
          'QR sync existing-user import: no pending secrets in sync data',
        );
        Engine.context.QrSyncController.resetState();
        navigation.navigate(Routes.WALLET_VIEW);
        return;
      }

      inFlightImportNavigation = finishExistingUserSyncWithoutMnemonic(
        navigation,
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

    hasHandledImportNavigationRef.current = true;
    navigateToQrSyncImport(navigation);
  }, [completedOnboarding, enabled, navigation, shouldNavigateToImport]);
};

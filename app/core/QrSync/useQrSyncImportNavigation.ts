import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import Routes from '../../constants/navigation/Routes';
import { selectCompletedOnboarding } from '../../selectors/onboarding';
import { selectQrSyncShouldNavigateToImport } from '../../selectors/qrSyncController';
import type { AppNavigationProp } from '../NavigationService/types';
import { useMessenger } from '../../hooks/useMessenger';
import { QrSyncSyncFlows } from './constants';
import type { RouteMessengerInstance } from './route-messenger';
import { navigateToQrSyncImport } from './navigateToQrSyncImport';
import { showAlreadySyncedSheet } from '../../components/Views/AddDeviceToWallet/showAlreadySyncedSheet';
import { showImportFailedSheet } from '../../components/Views/AddDeviceToWallet/showImportFailedSheet';
import { startExistingUserQrMetadataProvisioning } from './startExistingUserQrMetadataProvisioning';
import Logger from '../../util/Logger';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from './qrSyncTelemetry';

interface UseQrSyncImportNavigationOptions {
  enabled: boolean;
  deferWhileScannerOpen?: boolean;
  isScannerOpen?: boolean;
}

/** Add Device + QR scanner both mount this hook; only one navigation pass may run. */
let inFlightImportNavigation: Promise<void> | null = null;

/**
 * Existing-user QR sync after SYNC_READY: two-phase flow matching new-user.
 *
 * Phase B — `importRemainingSecrets`: imports any missing wallet secrets via
 * `importState(stripMetadata)`. For existing users the primary wallet is already
 * in the keyring; `importState` skips it by entropy source ID. Status advances
 * to SECRETS_IMPORTED regardless.
 *
 * Phase C — `provisionFromMetadata`: always runs for existing users. Applies
 * wallet/account names, groups, and layout from the persisted secrets-stripped
 * `provisioningMetadata` payload — even when Phase B imported no new secrets
 * (the common case: primary-only payload, names/groups changed on extension).
 *
 * Account count before vs. after Phase B determines whether to show the
 * "already synced" sheet after navigation (Phase C always runs either way).
 */
const finishExistingUserSyncWithoutMnemonic = async (
  navigation: AppNavigationProp,
  messenger: RouteMessengerInstance,
): Promise<void> => {
  const accountsBefore = await messenger.call('KeyringController:getAccounts');
  let importFailed = false;

  try {
    await messenger.call('QrSyncController:importRemainingSecrets');
  } catch (error) {
    importFailed = true;
    reportQrSyncFailure(error, {
      surface: QrSyncSurfaces.IMPORT,
      operation: QrSyncOperations.IMPORT_REMAINING_SECRETS,
      source: QrSyncTelemetrySources.FINISH_EXISTING_USER_WITHOUT_MNEMONIC,
      syncFlow: QrSyncSyncFlows.EXISTING_USER,
    });
  }

  const accountsAfter = await messenger.call('KeyringController:getAccounts');
  const addedNewAccounts = accountsAfter.length > accountsBefore.length;

  if (importFailed && !addedNewAccounts) {
    await messenger.call('QrSyncController:resetState');
    navigation.navigate(Routes.WALLET_VIEW);
    showImportFailedSheet(navigation);
    return;
  }

  // Phase C: non-blocking, matches new-user finalizeOnboardingCompletion pattern.
  // Always runs for existing users — applies names/groups/layout even when no new
  // secrets were imported (the common case: primary-only payload, metadata changed).
  // Do NOT resetState here — that would clear provisioningMetadata before Phase C reads it.
  startExistingUserQrMetadataProvisioning(
    QrSyncTelemetrySources.FINISH_EXISTING_USER_WITHOUT_MNEMONIC,
  );
  navigation.navigate(Routes.WALLET_VIEW);

  // Show "already synced" sheet after navigation when no new wallets were imported.
  if (!addedNewAccounts) {
    showAlreadySyncedSheet(navigation);
  }
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
  const messenger = useMessenger<RouteMessengerInstance>();
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
      hasHandledImportNavigationRef.current = true;

      inFlightImportNavigation = (async () => {
        let hasPendingSecretImports: boolean;
        try {
          // Live controller check — Redux can lag/strip ephemeral secrets.
          hasPendingSecretImports = await messenger.call(
            'QrSyncController:hasPendingSecretImports',
          );
        } catch (error: unknown) {
          hasHandledImportNavigationRef.current = false;
          reportQrSyncFailure(error, {
            surface: QrSyncSurfaces.IMPORT,
            operation: QrSyncOperations.EXISTING_USER_IMPORT_NAVIGATION,
            source: QrSyncTelemetrySources.USE_QR_SYNC_IMPORT_NAVIGATION,
            syncFlow: QrSyncSyncFlows.EXISTING_USER,
          });
          return;
        }

        if (!hasPendingSecretImports) {
          Logger.log(
            'QR sync existing-user import: no pending secrets in sync data',
          );
          await messenger.call('QrSyncController:resetState');
          navigation.navigate(Routes.WALLET_VIEW);
          return;
        }

        try {
          await finishExistingUserSyncWithoutMnemonic(navigation, messenger);
        } catch (error: unknown) {
          hasHandledImportNavigationRef.current = false;
          await messenger.call('QrSyncController:resetState');
          reportQrSyncFailure(error, {
            surface: QrSyncSurfaces.IMPORT,
            operation: QrSyncOperations.EXISTING_USER_IMPORT_NAVIGATION,
            source: QrSyncTelemetrySources.USE_QR_SYNC_IMPORT_NAVIGATION,
            syncFlow: QrSyncSyncFlows.EXISTING_USER,
          });
        }
      })().finally(() => {
        inFlightImportNavigation = null;
      });
      return;
    }

    hasHandledImportNavigationRef.current = true;
    navigateToQrSyncImport(navigation);
  }, [
    completedOnboarding,
    enabled,
    messenger,
    navigation,
    shouldNavigateToImport,
  ]);
};

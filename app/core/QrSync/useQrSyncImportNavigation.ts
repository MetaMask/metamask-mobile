import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { selectCompletedOnboarding } from '../../selectors/onboarding';
import {
  selectQrSyncImportMnemonic,
  selectQrSyncShouldNavigateToImport,
} from '../../selectors/qrSyncController';
import type { AppNavigationProp } from '../NavigationService/types';
import { completeExistingUserQrSyncImport } from './completeExistingUserQrSyncImport';
import { navigateToQrSyncImport } from './navigateToQrSyncImport';
import Logger from '../../util/Logger';

interface UseQrSyncImportNavigationOptions {
  enabled: boolean;
  deferWhileScannerOpen?: boolean;
  isScannerOpen?: boolean;
}

export const useQrSyncImportNavigation = ({
  enabled,
  deferWhileScannerOpen = false,
  isScannerOpen = false,
}: UseQrSyncImportNavigationOptions): void => {
  const navigation = useNavigation<AppNavigationProp>();
  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const shouldNavigateToImport = useSelector(
    selectQrSyncShouldNavigateToImport,
  );
  const qrSyncMnemonic = useSelector(selectQrSyncImportMnemonic);
  const hasHandledImportNavigationRef = useRef(false);

  useEffect(() => {
    if (!enabled || !shouldNavigateToImport) {
      hasHandledImportNavigationRef.current = false;
      return;
    }

    if (deferWhileScannerOpen && isScannerOpen) {
      return;
    }

    if (hasHandledImportNavigationRef.current) {
      return;
    }

    if (completedOnboarding) {
      if (!qrSyncMnemonic) {
        return;
      }

      hasHandledImportNavigationRef.current = true;
      completeExistingUserQrSyncImport(navigation, qrSyncMnemonic).catch(
        (error: unknown) => {
          hasHandledImportNavigationRef.current = false;
          Logger.error(
            error as Error,
            'useQrSyncImportNavigation: existing-user import failed',
          );
        },
      );
      return;
    }

    hasHandledImportNavigationRef.current = true;
    navigateToQrSyncImport(navigation);
  }, [
    completedOnboarding,
    deferWhileScannerOpen,
    enabled,
    isScannerOpen,
    navigation,
    qrSyncMnemonic,
    shouldNavigateToImport,
  ]);
};

import { useState, useCallback } from 'react';
import { setIsBackupAndSyncFeatureEnabled as setIsBackupAndSyncFeatureEnabledAction } from '../../../../actions/identity';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';

/**
 * Custom hook to set the enablement status of a backup and sync feature.
 *
 * @returns An object containing the `setIsBackupAndSyncFeatureEnabled` function, loading state, and error state.
 */
export function useBackupAndSync(): {
  setIsBackupAndSyncFeatureEnabled: (
    feature: keyof typeof BACKUPANDSYNC_FEATURES,
    enabled: boolean,
  ) => Promise<string | null>;
  error: string | null;
} {
  const [error, setError] = useState<string | null>(null);

  const setIsBackupAndSyncFeatureEnabled = useCallback(
    async (feature: keyof typeof BACKUPANDSYNC_FEATURES, enabled: boolean) => {
      setError(null);

      try {
        const actionError = await setIsBackupAndSyncFeatureEnabledAction(
          feature,
          enabled,
        );
        if (actionError) {
          setError(actionError);
          return actionError;
        }
        return null;
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : JSON.stringify(e ?? '');
        setError(errorMessage);
        return errorMessage;
      }
    },
    [],
  );

  return { setIsBackupAndSyncFeatureEnabled, error };
}

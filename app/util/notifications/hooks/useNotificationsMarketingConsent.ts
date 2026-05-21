import { useCallback } from 'react';
import { useNotificationStoragePreferences } from './useNotificationStoragePreferences';
import { useNotificationsRuntimeGate } from './useNotificationsRuntimeGate';

export const useNotificationsMarketingConsent = ({
  enabled,
}: { enabled?: boolean } = {}) => {
  const runtimeGate = useNotificationsRuntimeGate();
  const resolvedEnabled = enabled ?? runtimeGate;
  const {
    error,
    hasNotificationPreferences,
    isLoading,
    preferences,
    updatePreferencesSection,
  } = useNotificationStoragePreferences({ enabled: resolvedEnabled });

  const marketingPreferences = preferences?.marketing;
  const marketingNotificationsEnabled =
    marketingPreferences?.inAppNotificationsEnabled === true &&
    marketingPreferences?.pushNotificationsEnabled === true;

  const setMarketingNotificationsEnabled = useCallback(
    async (isEnabled: boolean) => {
      await updatePreferencesSection('marketing', (currentPreferences) => ({
        ...currentPreferences,
        inAppNotificationsEnabled: isEnabled,
        pushNotificationsEnabled: isEnabled,
      }));
    },
    [updatePreferencesSection],
  );

  return {
    error,
    hasNotificationPreferences,
    isLoading,
    marketingNotificationsEnabled,
    marketingPreferences,
    setMarketingNotificationsEnabled,
  };
};

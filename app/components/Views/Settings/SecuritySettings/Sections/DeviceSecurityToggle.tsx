import React, { useState, useCallback } from 'react';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';
import createStyles from '../SecuritySettings.styles';
import { SecurityPrivacyViewSelectorsIDs } from '../SecurityPrivacyView.testIds';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import Logger from '../../../../../util/Logger';
import AuthenticationError from '../../../../../core/Authentication/AuthenticationError';
import { AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS } from '../../../../../constants/error';
import { useStyles } from '../../../../hooks/useStyles';
import useAuthCapabilities from '../../../../../core/Authentication/hooks/useAuthCapabilities';
import { createTurnOffRememberMeModalNavDetails } from '../../../../UI/TurnOffRememberMeModal/TurnOffRememberMeModal';
import { useAuthentication } from '../../../../../core/Authentication';
import { Linking } from 'react-native';
import { strings } from '../../../../../../locales/i18n';

interface DeviceSecurityToggleProps {
  /**
   * When true (default), toggling triggers reauthentication and credential migration.
   * When false, toggling only updates the Redux preference without reauthentication.
   * Use `false` for preset/onboarding flows where no wallet exists yet.
   */
  requiresReauthentication?: boolean;
}

/**
 * DeviceSecurityToggle component that renders a single toggle for device security
 * (biometrics or device passcode) based on device capabilities.
 *
 * Uses the useAuthCapabilities hook to determine:
 * - Whether the toggle should be visible
 * - What label to display (e.g., "Face ID", "Biometrics", "Device Passcode")
 * - Whether the toggle is enabled
 *
 * @param requiresReauthentication - When true (default), toggling triggers reauthentication.
 *   Set to false for preset flows (e.g., onboarding) where only the preference should be saved.
 *
 * The toggle is disabled when Remember Me is enabled.
 */
const DeviceSecurityToggle = ({
  requiresReauthentication = true,
}: DeviceSecurityToggleProps) => {
  const navigation = useNavigation();
  const { styles } = useStyles(createStyles, {});
  const { updateAuthPreference, getAuthCapabilities, updateOsAuthEnabled } =
    useAuthentication();
  const { isLoading, capabilities } = useAuthCapabilities();

  // Optimistic value for immediate UI feedback - also serves as "updating" indicator
  const [optimisticValue, setOptimisticValue] = useState<boolean | null>(null);
  const isUpdating = optimisticValue !== null;
  const isToggleDisabled = isUpdating || isLoading;

  const onDeviceSecurityToggle = useCallback(
    async (enabled: boolean) => {
      // Update Redux state without reauthentication
      if (!requiresReauthentication) {
        updateOsAuthEnabled(enabled);
        return;
      }

      // Handle turning off Remember Me
      // Since we're deprecating Remember Me, once Remember Me is turned off, it cannot be turned back on.
      if (
        !enabled &&
        capabilities?.authType === AUTHENTICATION_TYPE.REMEMBER_ME
      ) {
        navigation.navigate(...createTurnOffRememberMeModalNavDetails());
        return;
      }

      // Set optimistic value immediately for instant UI feedback
      setOptimisticValue(enabled);

      // Single source of truth: derived auth type for the target toggle state
      const { authType } = await getAuthCapabilities({
        osAuthEnabled: enabled,
        // Remember Me is already deprecated at this point, so we can safely set it to false
        allowLoginWithRememberMe: false,
      });

      try {
        await updateAuthPreference({ authType });
        // This setTimeout is intentional for two reasons:
        // 1. Ensure that useAuthCapabilities hook resolves the latest capabilites (prevents toggle flicker)
        // 2. Prevent spamming the toggle
        setTimeout(() => {
          setOptimisticValue(null);
        }, 100);
      } catch (error) {
        // Check if error is "password required" - navigate to password entry
        const isPasswordRequiredError =
          error instanceof AuthenticationError &&
          error.customErrorMessage ===
            AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS;

        if (isPasswordRequiredError) {
          // Navigate to password entry - keep optimistic value until callback completes
          navigation.navigate('EnterPasswordSimple', {
            onPasswordSet: async (enteredPassword: string) => {
              try {
                await updateAuthPreference({
                  authType,
                  password: enteredPassword,
                });
              } catch (updateError) {
                Logger.error(
                  updateError as Error,
                  'Failed to update auth preference after password entry',
                );
              } finally {
                setOptimisticValue(null);
              }
            },
            onCancel: () => {
              setOptimisticValue(null);
            },
          });
          return;
        }

        // Other errors - clear optimistic value and log
        Logger.error(
          error as Error,
          'Failed to update device security preference',
        );
        setOptimisticValue(null);
      }
    },
    [
      capabilities,
      navigation,
      requiresReauthentication,
      updateAuthPreference,
      updateOsAuthEnabled,
    ],
  );

  /** Opens device settings for enabling OS biometrics or passcode */
  const onOpenDeviceSettings = useCallback(() => Linking.openSettings(), []);

  // Don't render toggle if capabilites are not available
  if (!capabilities) {
    return null;
  }

  // Use optimistic value while updating, otherwise derive from capabilities
  const actualValue =
    capabilities?.authType === AUTHENTICATION_TYPE.REMEMBER_ME
      ? capabilities?.allowLoginWithRememberMe
      : capabilities?.osAuthEnabled;
  const displayValue = optimisticValue !== null ? optimisticValue : actualValue;

  return (
    <Box style={styles.setting}>
      {/** Priority: biometrics toggle → device passcode toggle → device settings link when neither available */}
      {capabilities?.deviceAuthRequiresSettings ? (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onOpenDeviceSettings}
        >
          {strings('app_settings.enable_device_authentication')}
        </Button>
      ) : (
        <SecurityOptionToggle
          title={capabilities.authLabel}
          value={displayValue}
          onOptionUpdated={onDeviceSecurityToggle}
          testId={SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE}
          disabled={isToggleDisabled}
        />
      )}
    </Box>
  );
};

export default DeviceSecurityToggle;

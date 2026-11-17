import React, { useCallback, useState } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { useStyles } from '../../../../component-library/hooks';
import { Authentication } from '../../../../core';
import NavigationService from '../../../../core/NavigationService';
import { getMfaRecoveryErrorCode } from '../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import {
  PasswordlessRecoverySetupError,
  setupPasswordlessRecovery,
  type PasswordlessRecoverySetupResult,
} from '../../../../core/MfaRecovery/setupPasswordlessRecovery';
import { useTheme } from '../../../../util/theme';
import { useMfa } from '../../../../util/identity/mfa/useMfa';
import styleSheet from './DeveloperOptions.styles';

const SETUP_BUTTON_TEST_ID = 'passwordless-recovery-dev-setup-button';
export const TRY_RECOVERY_BUTTON_TEST_ID =
  'passwordless-recovery-dev-try-button';
const SETUP_RESULT_TEST_ID = 'passwordless-recovery-dev-setup-result';

const resultMessage = (result: PasswordlessRecoverySetupResult): string =>
  strings(
    result === 'already_enabled'
      ? 'app_settings.developer_options.passwordless_recovery.already_enabled'
      : 'app_settings.developer_options.passwordless_recovery.enabled',
  );

/**
 * Developer-only preparation for passwordless recovery. The wallet must be
 * unlocked. Recovery itself stays on the locked rehydration screen.
 */
const PasswordlessRecoveryDeveloperOptionsSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const { verifyOrEnroll } = useMfa();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSetup = useCallback(async () => {
    setIsRunning(true);
    setMessage(null);
    try {
      const result = await setupPasswordlessRecovery(() =>
        verifyOrEnroll({
          methods: ['passkey'],
          verifyWith: 'passkey',
          reason: { operation: 'settings.passwordless_recovery_setup' },
        }).then(() => undefined),
      );
      setMessage(resultMessage(result));
    } catch (error) {
      setMessage(
        strings('app_settings.developer_options.passwordless_recovery.failed', {
          code:
            error instanceof PasswordlessRecoverySetupError && error.detail
              ? `${error.code}: ${error.detail}`
              : getMfaRecoveryErrorCode(error),
        }),
      );
    } finally {
      setIsRunning(false);
    }
  }, [verifyOrEnroll]);

  /**
   * Opens the same recovery screen a real outdated password would open.
   * The wallet is locked, not deleted. `reset: false` keeps the password.
   */
  const handleTryRecovery = useCallback(async () => {
    const navigation = NavigationService.navigation;
    if (!navigation) {
      setMessage(
        strings(
          'app_settings.developer_options.passwordless_recovery.open_failed',
          { code: 'navigation_unavailable' },
        ),
      );
      return;
    }

    setIsRunning(true);
    setMessage(null);
    try {
      await Authentication.lockApp({
        reset: false,
        navigateToLogin: false,
        lockSeedless: false,
      });
      navigation.reset({
        index: 0,
        routes: [
          {
            name: Routes.ONBOARDING.REHYDRATE,
            params: { isSeedlessPasswordOutdated: true },
          },
        ],
      });
    } catch (error) {
      setMessage(
        strings(
          'app_settings.developer_options.passwordless_recovery.open_failed',
          { code: getMfaRecoveryErrorCode(error) },
        ),
      );
      setIsRunning(false);
    }
  }, []);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.passwordless_recovery.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings(
          'app_settings.developer_options.passwordless_recovery.description',
        )}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleSetup}
        isDisabled={isRunning}
        isLoading={isRunning}
        isFullWidth
        style={styles.accessory}
        testID={SETUP_BUTTON_TEST_ID}
      >
        {strings('app_settings.developer_options.passwordless_recovery.button')}
      </Button>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={handleTryRecovery}
        isDisabled={isRunning}
        isLoading={isRunning}
        isFullWidth
        style={styles.accessory}
        testID={TRY_RECOVERY_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.passwordless_recovery.try_button',
        )}
      </Button>
      {message ? (
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
          testID={SETUP_RESULT_TEST_ID}
        >
          {message}
        </Text>
      ) : null}
    </>
  );
};

export default PasswordlessRecoveryDeveloperOptionsSection;

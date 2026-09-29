import React, { useCallback, useState } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';
import styleSheet from '../DeveloperOptions.styles';
import {
  getMfaRecoveryErrorCode,
  getMfaRecoveryErrorDetail,
  runMfaRecoveryCubistTest,
  type MfaRecoveryTestStep,
} from './runMfaRecoveryCubistTest';

const RUN_BUTTON_TEST_ID = 'mfa-recovery-dev-run-cubist-test-button';

const MfaRecoveryDeveloperOptionsSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState<MfaRecoveryTestStep | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    setStep(null);
    setResult(null);
    setError(null);

    let currentStep: MfaRecoveryTestStep | null = null;

    try {
      const recoveryResult = await runMfaRecoveryCubistTest((nextStep) => {
        currentStep = nextStep;
        setStep(nextStep);
      });
      setResult(
        strings('app_settings.developer_options.mfa_recovery.success', {
          status: recoveryResult.ensureUserStatus,
          epoch: recoveryResult.epoch,
          matches: recoveryResult.matches ? 'yes' : 'no',
        }),
      );
    } catch (runError) {
      const code = getMfaRecoveryErrorCode(runError);
      const detail = getMfaRecoveryErrorDetail(runError);
      console.error('MFA recovery test failed', {
        code,
        detail,
        step: currentStep,
      });
      setError(
        strings('app_settings.developer_options.mfa_recovery.failure', {
          code: detail === undefined ? code : `${code} (${detail})`,
        }),
      );
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.mfa_recovery.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.mfa_recovery.description')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleRun}
        isDisabled={isRunning}
        isFullWidth
        style={styles.accessory}
        testID={RUN_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.mfa_recovery.run_cubist_test_button',
        )}
      </Button>
      {(isRunning || error !== null) && step !== null && (
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {strings('app_settings.developer_options.mfa_recovery.running', {
            step: strings(
              `app_settings.developer_options.mfa_recovery.steps.${step}`,
            ),
          })}
        </Text>
      )}
      {result !== null && (
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {result}
        </Text>
      )}
      {error !== null && (
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {error}
        </Text>
      )}
    </>
  );
};

export default MfaRecoveryDeveloperOptionsSection;

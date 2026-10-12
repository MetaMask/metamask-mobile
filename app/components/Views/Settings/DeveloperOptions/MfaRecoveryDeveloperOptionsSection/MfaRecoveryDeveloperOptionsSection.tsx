import React, { useCallback, useEffect, useState } from 'react';
import QuickCrypto from 'react-native-quick-crypto';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
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
  getMfaRecoveryIdentifierRouter,
  isMfaRecoveryConfigured,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller';
import { selectMfaRecoveryEnabled } from '../../../../../selectors/featureFlagController/mfaRecovery';
import {
  getMfaRecoveryErrorCode,
  getMfaRecoveryErrorDetail,
  runMfaRecoveryCubistRecover,
  runMfaRecoveryCubistTest,
  type MfaRecoveryRecoverResult,
  type MfaRecoveryTestResult,
  type MfaRecoveryTestStep,
  type MfaRecoveryTestDependencies,
} from './runMfaRecoveryCubistTest';

const RUN_BUTTON_TEST_ID = 'mfa-recovery-dev-run-cubist-test-button';
const RECOVER_BUTTON_TEST_ID = 'mfa-recovery-dev-recover-secret-button';
const RESUME_BUTTON_TEST_ID = 'mfa-recovery-dev-resume-button';
const ABORT_BUTTON_TEST_ID = 'mfa-recovery-dev-abort-button';

type MfaRecoveryRunResult = MfaRecoveryTestResult | MfaRecoveryRecoverResult;
type MfaRecoveryRunner = (
  dependencies: MfaRecoveryTestDependencies,
  onStep: (step: MfaRecoveryTestStep) => void,
) => Promise<MfaRecoveryRunResult>;
type MfaRecoveryResultFormatter = (result: MfaRecoveryRunResult) => string;

const MfaRecoveryDeveloperOptionsSection = () => {
  const isMfaRecoveryEnabled = useSelector(selectMfaRecoveryEnabled);
  const isMfaRecoveryConfiguredForEnvironment = isMfaRecoveryConfigured();
  const isMfaRecoveryAvailable =
    isMfaRecoveryEnabled && isMfaRecoveryConfiguredForEnvironment;
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState<MfaRecoveryTestStep | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);

  const refreshPhase = useCallback(async () => {
    try {
      setPhase(await Engine.context.MfaRecoveryController.getPhase());
    } catch {
      setPhase(null);
    }
  }, []);

  useEffect(() => {
    refreshPhase();
  }, [refreshPhase]);

  const handleRun = useCallback(
    async (
      runner: MfaRecoveryRunner,
      formatResult: MfaRecoveryResultFormatter,
    ) => {
      if (isRunning) {
        return;
      }

      setIsRunning(true);
      setStep(null);
      setResult(null);
      setError(null);

      let currentStep: MfaRecoveryTestStep | null = null;

      try {
        const recoveryResult = await runner(
          {
            address:
              Engine.context.KeyringController.state.keyrings[0]
                ?.accounts?.[0] ?? '',
            controller: Engine.context.MfaRecoveryController,
            identifierRouter: getMfaRecoveryIdentifierRouter(),
            randomBytes: (length) =>
              new Uint8Array(QuickCrypto.randomBytes(length)),
          },
          (nextStep) => {
            currentStep = nextStep;
            setStep(nextStep);
          },
        );
        setResult(formatResult(recoveryResult));
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
        refreshPhase();
      }
    },
    [isRunning, refreshPhase],
  );

  const handlePendingOperation = useCallback(
    async (action: 'resume' | 'abort') => {
      if (isRunning) {
        return;
      }

      setError(null);
      try {
        if (action === 'resume') {
          await Engine.context.MfaRecoveryController.resume();
        } else {
          await Engine.context.MfaRecoveryController.abort();
        }
        await refreshPhase();
      } catch (runError) {
        const code = getMfaRecoveryErrorCode(runError);
        const detail = getMfaRecoveryErrorDetail(runError);
        setError(
          strings('app_settings.developer_options.mfa_recovery.failure', {
            code: detail === undefined ? code : `${code} (${detail})`,
          }),
        );
      }
    },
    [isRunning, refreshPhase],
  );

  const handleRunCubistTest = useCallback(() => {
    handleRun(runMfaRecoveryCubistTest, (recoveryResult) => {
      if ('fingerprint' in recoveryResult) {
        throw new Error('Unexpected recovery result');
      }
      return strings('app_settings.developer_options.mfa_recovery.success', {
        epoch: recoveryResult.epoch,
        matches: recoveryResult.matches ? 'yes' : 'no',
      });
    });
  }, [handleRun]);

  const handleRecoverSecret = useCallback(() => {
    handleRun(runMfaRecoveryCubistRecover, (recoveryResult) => {
      if (!('fingerprint' in recoveryResult)) {
        throw new Error('Unexpected recovery result');
      }
      if (recoveryResult.matches === undefined) {
        return strings(
          'app_settings.developer_options.mfa_recovery.recover_success_no_reference',
          {
            epoch: recoveryResult.epoch,
            fingerprint: recoveryResult.fingerprint,
          },
        );
      }
      return strings(
        'app_settings.developer_options.mfa_recovery.recover_success',
        {
          epoch: recoveryResult.epoch,
          matches: recoveryResult.matches ? 'yes' : 'no',
        },
      );
    });
  }, [handleRun]);

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
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.mfa_recovery.status', {
          enabled: isMfaRecoveryEnabled ? 'yes' : 'no',
          configured: isMfaRecoveryConfiguredForEnvironment ? 'yes' : 'no',
          phase: phase ?? 'unknown',
        })}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleRunCubistTest}
        isDisabled={isRunning || !isMfaRecoveryAvailable}
        isFullWidth
        style={styles.accessory}
        testID={RUN_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.mfa_recovery.run_cubist_test_button',
        )}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleRecoverSecret}
        isDisabled={isRunning || !isMfaRecoveryAvailable}
        isFullWidth
        style={styles.accessory}
        testID={RECOVER_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.mfa_recovery.recover_secret_button',
        )}
      </Button>
      {phase !== null && phase !== 'idle' && (
        <>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={() => handlePendingOperation('resume')}
            isDisabled={isRunning || !isMfaRecoveryAvailable}
            isFullWidth
            style={styles.accessory}
            testID={RESUME_BUTTON_TEST_ID}
          >
            {strings(
              'app_settings.developer_options.mfa_recovery.resume_button',
            )}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={() => handlePendingOperation('abort')}
            isDisabled={isRunning || !isMfaRecoveryAvailable}
            isFullWidth
            style={styles.accessory}
            testID={ABORT_BUTTON_TEST_ID}
          >
            {strings(
              'app_settings.developer_options.mfa_recovery.abort_button',
            )}
          </Button>
        </>
      )}
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

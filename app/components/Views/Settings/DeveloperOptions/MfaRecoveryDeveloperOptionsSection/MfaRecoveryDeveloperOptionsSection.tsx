import React, { useCallback, useEffect, useState } from 'react';
import QuickCrypto from 'react-native-quick-crypto';
import { useSelector } from 'react-redux';
import { bytesToHex } from '@metamask/utils';
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
import {
  CUBIST_AUTH_AUDIENCE,
  TOPRF_AAL2_AUDIENCE,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import { selectMfaRecoveryEnabled } from '../../../../../selectors/featureFlagController/mfaRecovery';
import { useMfa } from '../../../../../util/identity/mfa/useMfa';
import { clearPendingOperationForDev } from '../../../../../core/Engine/controllers/mfa-recovery-controller/dev/clear-pending-operation';
import { getLastApplyMutationFailure } from '../../../../../core/Engine/controllers/mfa-recovery-controller/dev/apply-mutation-diagnostics';
import { createSocialIdentifier } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifiers';
import { getLastApprovalDiagnostic } from '../../../../../core/Engine/controllers/mfa-recovery-controller/dev/pending-operation-diagnostics';
import {
  getMfaRecoveryErrorCode,
  getMfaRecoveryErrorDetail,
  runMfaRecoveryCubistRecover,
  runMfaRecoveryCubistTest,
  type RecoveryReadIdentifierType,
  type MfaRecoveryRecoverResult,
  type MfaRecoveryTestResult,
} from './runMfaRecoveryCubistTest';
import {
  runMfaRecoverySetup,
  type MfaRecoveryIdentifierCombination,
  type MfaRecoverySetupDependencies,
  type MfaRecoverySetupResult,
  type MfaRecoverySetupStep,
} from './runMfaRecoverySetup';
import {
  runToprfRecoverySecretTest,
  type ToprfRecoverySecretTestResult,
  type ToprfRecoverySecretTestStep,
} from './runToprfRecoverySecretTest';
const RUN_BUTTON_TEST_ID = 'mfa-recovery-dev-run-cubist-test-button';
const RECOVER_BUTTON_TEST_ID = 'mfa-recovery-dev-recover-secret-button';
const RECOVER_BUTTONS: readonly {
  identifierType: RecoveryReadIdentifierType;
  labelKey: string;
}[] = [
  {
    identifierType: 'siwe',
    labelKey:
      'app_settings.developer_options.mfa_recovery.recover_secret_button_siwe',
  },
  {
    identifierType: 'passkey',
    labelKey:
      'app_settings.developer_options.mfa_recovery.recover_secret_button_passkey',
  },
  {
    identifierType: 'social',
    labelKey:
      'app_settings.developer_options.mfa_recovery.recover_secret_button_social',
  },
];
const SETUP_BUTTON_TEST_ID = 'mfa-recovery-dev-setup-recovery-button';
const SETUP_BUTTON_LABEL_KEYS: Record<
  MfaRecoveryIdentifierCombination,
  string
> = {
  siwe_passkey:
    'app_settings.developer_options.mfa_recovery.setup_recovery_button_siwe_passkey',
  siwe_social:
    'app_settings.developer_options.mfa_recovery.setup_recovery_button_siwe_social',
  passkey_social:
    'app_settings.developer_options.mfa_recovery.setup_recovery_button_passkey_social',
};
const SETUP_COMBINATIONS = Object.keys(
  SETUP_BUTTON_LABEL_KEYS,
) as MfaRecoveryIdentifierCombination[];
const TOPRF_TEST_BUTTON_TEST_ID =
  'mfa-recovery-dev-toprf-recovery-secret-button';
const RESET_PENDING_BUTTON_TEST_ID = 'mfa-recovery-dev-reset-pending-button';
const RESUME_BUTTON_TEST_ID = 'mfa-recovery-dev-resume-button';
const ABORT_BUTTON_TEST_ID = 'mfa-recovery-dev-abort-button';
const AAL2_APPROVAL_OPERATION = 'mfaRecovery.devOptions';
const AAL2_APPROVAL_AUDIENCES = [TOPRF_AAL2_AUDIENCE];

type MfaRecoveryStep = MfaRecoverySetupStep | ToprfRecoverySecretTestStep;
type MfaRecoveryRunResult =
  | MfaRecoveryTestResult
  | MfaRecoveryRecoverResult
  | MfaRecoverySetupResult
  | ToprfRecoverySecretTestResult;
type MfaRecoveryRunner = (
  dependencies: MfaRecoverySetupDependencies,
  onStep: (step: MfaRecoveryStep) => void,
) => Promise<MfaRecoveryRunResult>;
type MfaRecoveryResultFormatter = (result: MfaRecoveryRunResult) => string;

function formatFailureCode(runError: unknown): string {
  const code = getMfaRecoveryErrorCode(runError);
  const detail = getMfaRecoveryErrorDetail(runError);
  const escrowFailure =
    code === 'incomplete_mutation' ? getLastApplyMutationFailure() : undefined;
  const approvalCheck =
    code === 'invalid_pending_operation'
      ? getLastApprovalDiagnostic()
      : undefined;
  return [code, detail, escrowFailure, approvalCheck]
    .filter((part) => part !== undefined)
    .map((part, index) => (index === 0 ? part : `(${part})`))
    .join(' ');
}

const MfaRecoveryDeveloperOptionsSection = () => {
  const isMfaRecoveryEnabled = useSelector(selectMfaRecoveryEnabled);
  const isMfaRecoveryConfiguredForEnvironment = isMfaRecoveryConfigured();
  const isMfaRecoveryAvailable = isMfaRecoveryConfiguredForEnvironment;
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState<MfaRecoveryStep | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const { verifyOrEnroll } = useMfa();

  // requestMfaApproval with requireVerification needs a live verification
  // session, otherwise it throws aal2_required without calling the server.
  const verifyMfa = useCallback(async () => {
    await verifyOrEnroll({
      methods: ['totp'],
      verifyWith: 'totp',
      reason: { operation: AAL2_APPROVAL_OPERATION },
    });
  }, [verifyOrEnroll]);

  const mintAal2Token = useCallback(async () => {
    const { approval } =
      await Engine.context.AuthenticationController.requestMfaApproval({
        requestHash: bytesToHex(new Uint8Array(QuickCrypto.randomBytes(32))),
        audiences: AAL2_APPROVAL_AUDIENCES,
        requireVerification: true,
        includeIdentifiers: false,
        reason: { operation: AAL2_APPROVAL_OPERATION },
      });
    return approval;
  }, []);

  const getAuthIdentifiers = useCallback(async () => {
    const { identifiers = [] } =
      await Engine.context.AuthenticationController.requestMfaApproval({
        requestHash: bytesToHex(new Uint8Array(QuickCrypto.randomBytes(32))),
        audiences: [CUBIST_AUTH_AUDIENCE],
        requireVerification: true,
        includeIdentifiers: true,
        reason: { operation: AAL2_APPROVAL_OPERATION },
      });
    return identifiers;
  }, []);

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

      let currentStep: MfaRecoveryStep | null = null;

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
            verifyMfa,
            mintAal2Token,
            getAuthIdentifiers,
            seedless: Engine.context.SeedlessOnboardingController,
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
            code: formatFailureCode(runError),
          }),
        );
      } finally {
        setIsRunning(false);
        refreshPhase();
      }
    },
    [getAuthIdentifiers, isRunning, mintAal2Token, refreshPhase, verifyMfa],
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
        setError(
          strings('app_settings.developer_options.mfa_recovery.failure', {
            code: formatFailureCode(runError),
          }),
        );
      }
    },
    [isRunning, refreshPhase],
  );

  const handleResetPendingOperation = useCallback(async () => {
    setError(null);
    clearPendingOperationForDev(Engine.context.MfaRecoveryController);
    await refreshPhase();
  }, [refreshPhase]);

  const handleEnableFlagOverride = useCallback(() => {
    Engine.context.RemoteFeatureFlagController.setFlagOverride('mfaRecovery', {
      enabled: true,
      minimumVersion: '0.0.0',
    });
  }, []);

  const handleRunCubistTest = useCallback(() => {
    handleRun(runMfaRecoveryCubistTest, (recoveryResult) => {
      if ('fingerprint' in recoveryResult || 'after' in recoveryResult) {
        throw new Error('Unexpected recovery result');
      }
      return strings('app_settings.developer_options.mfa_recovery.success', {
        epoch: recoveryResult.epoch,
        matches: recoveryResult.matches ? 'yes' : 'no',
      });
    });
  }, [handleRun]);

  const handleSetupRecovery = useCallback(
    (combination: MfaRecoveryIdentifierCombination) => {
      handleRun(
        (dependencies, onStep) =>
          runMfaRecoverySetup(dependencies, onStep, combination),
        (recoveryResult) => {
          if (!('after' in recoveryResult) || 'fingerprint' in recoveryResult) {
            throw new Error('Unexpected recovery result');
          }
          return strings(
            'app_settings.developer_options.mfa_recovery.setup_success',
            { before: recoveryResult.before, after: recoveryResult.after },
          );
        },
      );
    },
    [handleRun],
  );

  const handleToprfRecoverySecretTest = useCallback(() => {
    handleRun(
      (dependencies, onStep) =>
        runToprfRecoverySecretTest(
          {
            address: dependencies.address,
            signPersonalMessage: (params) =>
              Engine.context.KeyringController.signPersonalMessage(params),
            seedless: dependencies.seedless,
            mintAal2Token: async () => {
              await dependencies.verifyMfa();
              return await dependencies.mintAal2Token();
            },
          },
          onStep,
        ),
      (recoveryResult) => {
        if (!('shareExisted' in recoveryResult)) {
          throw new Error('Unexpected recovery result');
        }
        return strings(
          'app_settings.developer_options.mfa_recovery.toprf_test_success',
          {
            before: recoveryResult.before,
            after: recoveryResult.after,
            shareExisted: recoveryResult.shareExisted ? 'yes' : 'no',
            fingerprint: recoveryResult.fingerprint,
          },
        );
      },
    );
  }, [handleRun]);

  const handleRecoverSecret = useCallback(
    (identifierType: RecoveryReadIdentifierType) => {
      handleRun(
        (dependencies, onStep) =>
          runMfaRecoveryCubistRecover(
            dependencies,
            onStep,
            identifierType,
            identifierType === 'social'
              ? createSocialIdentifier(
                  Engine.context.SeedlessOnboardingController.state,
                )
              : undefined,
          ),
        (recoveryResult) => {
          if (
            !('fingerprint' in recoveryResult) ||
            !('epoch' in recoveryResult)
          ) {
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
        },
      );
    },
    [handleRun],
  );

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
      {RECOVER_BUTTONS.map(({ identifierType, labelKey }) => (
        <Button
          key={identifierType}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={() => handleRecoverSecret(identifierType)}
          isDisabled={isRunning || !isMfaRecoveryAvailable}
          isFullWidth
          style={styles.accessory}
          testID={`${RECOVER_BUTTON_TEST_ID}-${identifierType}`}
        >
          {strings(labelKey)}
        </Button>
      ))}
      {SETUP_COMBINATIONS.map((combination) => (
        <Button
          key={combination}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={() => handleSetupRecovery(combination)}
          isDisabled={isRunning || !isMfaRecoveryAvailable}
          isFullWidth
          style={styles.accessory}
          testID={`${SETUP_BUTTON_TEST_ID}-${combination}`}
        >
          {strings(SETUP_BUTTON_LABEL_KEYS[combination])}
        </Button>
      ))}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleToprfRecoverySecretTest}
        isDisabled={isRunning || !__DEV__}
        isFullWidth
        style={styles.accessory}
        testID={TOPRF_TEST_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.mfa_recovery.toprf_test_button',
        )}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleResetPendingOperation}
        isDisabled={isRunning || !__DEV__}
        isFullWidth
        style={styles.accessory}
        testID={RESET_PENDING_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.mfa_recovery.reset_pending_button',
        )}
      </Button>
      {__DEV__ && !isMfaRecoveryEnabled && (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleEnableFlagOverride}
          isDisabled={isRunning}
          isFullWidth
          style={styles.accessory}
        >
          {strings(
            'app_settings.developer_options.mfa_recovery.enable_flag_override_button',
          )}
        </Button>
      )}
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

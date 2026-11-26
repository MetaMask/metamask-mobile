import React, { useCallback, useEffect, useState } from 'react';
import type { RecoveryIdentifiers } from '@metamask/mfa-recovery-controller';
import { useSelector } from 'react-redux';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';
import styleSheet from '../DeveloperOptions.styles';
import { isMfaRecoveryConfigured } from '../../../../../core/Engine/controllers/mfa-recovery-controller/config';
import { createMfaRecoveryService } from '../../../../../core/MfaRecovery/engineBindings';
import { redactForDisplay } from '../../../../../core/MfaRecovery/redactForDisplay';
import type { MfaRecoveryService } from '../../../../../core/MfaRecovery/services/mfa-recovery-service';
import { findSocialIdentifier } from '../../../../../core/MfaRecovery/services/recovery-setup';
import { selectMfaRecoveryEnabled } from '../../../../../selectors/featureFlagController/mfaRecovery';
import { useMfa } from '../../../../../util/identity/mfa/useMfa';
import MfaRecoveryOptionsBottomSheet, {
  type MfaRecoveryOption,
} from './MfaRecoveryOptionsBottomSheet';
import PasswordPromptBottomSheet from './PasswordPromptBottomSheet';
import {
  getMfaRecoveryErrorCode,
  runMfaRecoveryCubistRecover,
  type MfaRecoveryRecoverResult,
  type MfaRecoveryRecoverStep,
  type RecoveryReadIdentifierType,
} from './runMfaRecoveryCubistRecover';
import {
  runMfaRecoveryFullRetrieval,
  type MfaRecoveryFullRetrievalIdentifierType,
  type MfaRecoveryFullRetrievalResult,
  type MfaRecoveryFullRetrievalStep,
} from './runMfaRecoveryFullRetrieval';
import {
  runResetPassword,
  type MfaRecoveryPasswordStep,
} from './runMfaRecoveryPasswords';

const STRINGS_PREFIX = 'app_settings.developer_options.mfa_recovery';
export const RECOVER_BUTTON_TEST_ID = 'mfa-recovery-dev-recover-secret-button';
export const RECOVER_SHEET_TEST_ID = 'mfa-recovery-dev-recover-sheet';
export const RECOVER_OPTION_TEST_ID_PREFIX = 'mfa-recovery-dev-recover-option';
export const FULL_RETRIEVAL_BUTTON_TEST_ID =
  'mfa-recovery-dev-full-retrieval-button';
export const FULL_RETRIEVAL_SHEET_TEST_ID =
  'mfa-recovery-dev-full-retrieval-sheet';
export const FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX =
  'mfa-recovery-dev-full-retrieval-option';
export const RESET_PASSWORD_BUTTON_TEST_ID =
  'mfa-recovery-dev-reset-password-button';
export const PASSWORD_PROMPT_SHEET_TEST_ID =
  'mfa-recovery-dev-password-prompt-sheet';
const AAL2_APPROVAL_OPERATION = 'qa.mfaRecoveryDevOptions';

const RECOVER_OPTIONS: readonly MfaRecoveryOption<RecoveryReadIdentifierType>[] =
  [
    { id: 'siwe', labelKey: `${STRINGS_PREFIX}.recover_secret_button_siwe` },
    {
      id: 'passkey',
      labelKey: `${STRINGS_PREFIX}.recover_secret_button_passkey`,
    },
    {
      id: 'social',
      labelKey: `${STRINGS_PREFIX}.recover_secret_button_social`,
    },
  ];

const FULL_RETRIEVAL_OPTIONS: readonly MfaRecoveryOption<MfaRecoveryFullRetrievalIdentifierType>[] =
  [
    { id: 'siwe', labelKey: `${STRINGS_PREFIX}.recover_secret_button_siwe` },
    {
      id: 'passkey',
      labelKey: `${STRINGS_PREFIX}.recover_secret_button_passkey`,
    },
  ];

type MfaRecoveryStep =
  | MfaRecoveryRecoverStep
  | MfaRecoveryFullRetrievalStep
  | MfaRecoveryPasswordStep;

type PasswordPrompt =
  | {
      kind: 'full_retrieval';
      identifierType: MfaRecoveryFullRetrievalIdentifierType;
    }
  | { kind: 'reset' };

/** A stable error code plus Auth's or the escrow's redacted message. */
function formatFailure(runError: unknown): string {
  const code = getMfaRecoveryErrorCode(runError);
  const message =
    runError instanceof Error && runError.message.trim().length > 0
      ? redactForDisplay(runError.message.trim())
      : undefined;
  return message === undefined ? code : `${code} (${message})`;
}

function formatRecoverResult({
  epoch,
  fingerprint,
}: MfaRecoveryRecoverResult): string {
  return strings(`${STRINGS_PREFIX}.recover_success`, { epoch, fingerprint });
}

function formatFullRetrievalResult(
  retrievalResult: MfaRecoveryFullRetrievalResult,
): string {
  return strings(`${STRINGS_PREFIX}.full_retrieval_success`, {
    expected: retrievalResult.expectedSrpCount,
    recovered: retrievalResult.recoveredSrpCount,
    matched: retrievalResult.matchedSrpCount,
    allRecovered: retrievalResult.allSrpsRecovered ? 'yes' : 'no',
  });
}

/**
 * Developer-only controls to try the passwordless recovery paths against the
 * live wallet: reading the Recovery Secret from Cubist, recovering the SRPs
 * from it, and resetting the global password afterwards.
 */
const MfaRecoveryDeveloperOptionsSection = () => {
  const isMfaRecoveryEnabled = useSelector(selectMfaRecoveryEnabled);
  const isMfaRecoveryAvailable = isMfaRecoveryConfigured();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const { verifyOrEnroll } = useMfa();
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState<MfaRecoveryStep | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasRecoveredVault, setHasRecoveredVault] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<PasswordPrompt | null>(
    null,
  );
  const [isRecoverSheetOpen, setIsRecoverSheetOpen] = useState(false);
  const [isFullRetrievalSheetOpen, setIsFullRetrievalSheetOpen] =
    useState(false);
  const [cubistIdentifiers, setCubistIdentifiers] =
    useState<RecoveryIdentifiers | null>(null);
  const [isCubistUnavailable, setIsCubistUnavailable] = useState(false);

  // requestMfaApproval with requireVerification needs a live verification
  // session, otherwise it throws aal2_required without calling the server.
  const verifyMfa = useCallback(async () => {
    await verifyOrEnroll({
      methods: ['passkey'],
      verifyWith: ['passkey'],
      reason: { operation: AAL2_APPROVAL_OPERATION },
    });
  }, [verifyOrEnroll]);

  const refreshCubistIdentifiers = useCallback(async () => {
    try {
      setCubistIdentifiers(
        await Engine.context.MfaRecoveryController.getIdentifiers(),
      );
      setIsCubistUnavailable(false);
    } catch {
      setCubistIdentifiers(null);
      setIsCubistUnavailable(true);
    }
  }, []);

  useEffect(() => {
    if (isMfaRecoveryAvailable) {
      refreshCubistIdentifiers().catch(() => undefined);
    }
  }, [isMfaRecoveryAvailable, refreshCubistIdentifiers]);

  const isCubistCheckPending =
    cubistIdentifiers === null && !isCubistUnavailable;
  const isCubistNotRegistered = cubistIdentifiers?.identifiers.length === 0;
  const isBlockedByCubist = isCubistCheckPending || isCubistNotRegistered;

  const isNotEnrolled = useCallback(
    (identifierType: string) =>
      cubistIdentifiers !== null &&
      !cubistIdentifiers.identifiers.some(
        (identifier) => identifier.type === identifierType,
      ),
    [cubistIdentifiers],
  );

  const recoverSheetOptions = RECOVER_OPTIONS.map((option) => ({
    ...option,
    isDisabled: isNotEnrolled(option.id),
  }));
  const fullRetrievalSheetOptions = FULL_RETRIEVAL_OPTIONS.map((option) => ({
    ...option,
    isDisabled: isNotEnrolled(option.id),
  }));

  const recoverSecretLabel = (() => {
    if (isCubistNotRegistered) {
      return strings(`${STRINGS_PREFIX}.recover_secret_button_not_registered`);
    }
    if (isCubistCheckPending && isMfaRecoveryAvailable) {
      return strings(`${STRINGS_PREFIX}.recover_secret_button_checking`);
    }
    return strings(`${STRINGS_PREFIX}.recover_secret_button`);
  })();

  const handleRun = useCallback(
    async <RunResult,>(
      runner: (
        service: MfaRecoveryService,
        onStep: (nextStep: MfaRecoveryStep) => void,
      ) => Promise<RunResult>,
      formatResult: (runResult: RunResult) => string,
    ): Promise<boolean> => {
      if (isRunning) {
        return false;
      }

      setIsRunning(true);
      setStep(null);
      setResult(null);
      setError(null);

      try {
        const runResult = await runner(
          createMfaRecoveryService({
            verifyMfa,
            approvalOperation: AAL2_APPROVAL_OPERATION,
          }),
          setStep,
        );
        setResult(formatResult(runResult));
        return true;
      } catch (runError) {
        setError(
          strings(`${STRINGS_PREFIX}.failure`, {
            code: formatFailure(runError),
          }),
        );
        return false;
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, verifyMfa],
  );

  const handleRecoverSecret = useCallback(
    (identifierType: RecoveryReadIdentifierType) => {
      setIsRecoverSheetOpen(false);
      handleRun(async (service, onStep) => {
        const socialIdentifier =
          identifierType === 'social'
            ? findSocialIdentifier(
                (await Engine.context.MfaRecoveryController.getIdentifiers())
                  .authIdentifiers,
                Engine.context.SeedlessOnboardingController.state,
              )
            : undefined;
        return await runMfaRecoveryCubistRecover(
          service,
          onStep,
          identifierType,
          socialIdentifier,
        );
      }, formatRecoverResult).catch(() => undefined);
    },
    [handleRun],
  );

  const handleFullRetrievalIdentifier = useCallback(
    (identifierType: MfaRecoveryFullRetrievalIdentifierType) => {
      setIsFullRetrievalSheetOpen(false);
      setPasswordPrompt({ kind: 'full_retrieval', identifierType });
    },
    [],
  );

  const handleFullRetrieval = useCallback(
    async (
      identifierType: MfaRecoveryFullRetrievalIdentifierType,
      localPassword: string,
    ) => {
      setPasswordPrompt(null);
      const succeeded = await handleRun(
        async (service, onStep) =>
          runMfaRecoveryFullRetrieval(
            service,
            {
              seedless: Engine.context.SeedlessOnboardingController,
              identifierType,
              localPassword,
            },
            onStep,
          ),
        formatFullRetrievalResult,
      );
      if (succeeded) {
        setHasRecoveredVault(true);
      }
    },
    [handleRun],
  );

  const handleResetPassword = useCallback(
    async (newPassword: string) => {
      setPasswordPrompt(null);
      const succeeded = await handleRun(
        async (_service, onStep) =>
          runResetPassword(
            Engine.context.SeedlessOnboardingController,
            newPassword,
            onStep,
          ),
        () => strings(`${STRINGS_PREFIX}.reset_password_success`),
      );
      if (succeeded) {
        setHasRecoveredVault(false);
      }
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
        {strings(`${STRINGS_PREFIX}.title`)}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings(`${STRINGS_PREFIX}.description`)}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings(`${STRINGS_PREFIX}.status`, {
          enabled: isMfaRecoveryEnabled ? 'yes' : 'no',
          configured: isMfaRecoveryAvailable ? 'yes' : 'no',
        })}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={() => setIsRecoverSheetOpen(true)}
        isDisabled={isRunning || !isMfaRecoveryAvailable || isBlockedByCubist}
        isFullWidth
        style={styles.accessory}
        testID={RECOVER_BUTTON_TEST_ID}
      >
        {recoverSecretLabel}
      </Button>
      {isRecoverSheetOpen && (
        <MfaRecoveryOptionsBottomSheet
          testID={RECOVER_SHEET_TEST_ID}
          optionTestIdPrefix={RECOVER_OPTION_TEST_ID_PREFIX}
          titleKey={`${STRINGS_PREFIX}.recover_secret_sheet_title`}
          options={recoverSheetOptions}
          onSelect={handleRecoverSecret}
          onClose={() => setIsRecoverSheetOpen(false)}
        />
      )}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={() => setIsFullRetrievalSheetOpen(true)}
        isDisabled={
          isRunning || !__DEV__ || !isMfaRecoveryAvailable || isBlockedByCubist
        }
        isFullWidth
        style={styles.accessory}
        testID={FULL_RETRIEVAL_BUTTON_TEST_ID}
      >
        {strings(`${STRINGS_PREFIX}.full_retrieval_button`)}
      </Button>
      {isFullRetrievalSheetOpen && (
        <MfaRecoveryOptionsBottomSheet
          testID={FULL_RETRIEVAL_SHEET_TEST_ID}
          optionTestIdPrefix={FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}
          titleKey={`${STRINGS_PREFIX}.full_retrieval_sheet_title`}
          options={fullRetrievalSheetOptions}
          onSelect={handleFullRetrievalIdentifier}
          onClose={() => setIsFullRetrievalSheetOpen(false)}
        />
      )}
      {hasRecoveredVault && (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={() => setPasswordPrompt({ kind: 'reset' })}
          isDisabled={isRunning || !__DEV__}
          isFullWidth
          style={styles.accessory}
          testID={RESET_PASSWORD_BUTTON_TEST_ID}
        >
          {strings(`${STRINGS_PREFIX}.reset_password_button`)}
        </Button>
      )}
      {passwordPrompt !== null && (
        <PasswordPromptBottomSheet
          testID={PASSWORD_PROMPT_SHEET_TEST_ID}
          titleKey={
            passwordPrompt.kind === 'full_retrieval'
              ? `${STRINGS_PREFIX}.set_local_password_prompt_title`
              : `${STRINGS_PREFIX}.reset_password_prompt_title`
          }
          onSubmit={(password) => {
            const submission =
              passwordPrompt.kind === 'full_retrieval'
                ? handleFullRetrieval(passwordPrompt.identifierType, password)
                : handleResetPassword(password);
            submission.catch(() => undefined);
          }}
          onClose={() => setPasswordPrompt(null)}
        />
      )}
      {(isRunning || error !== null) && step !== null && (
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {strings(`${STRINGS_PREFIX}.running`, {
            step: strings(`${STRINGS_PREFIX}.steps.${step}`),
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

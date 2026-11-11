import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Identifier,
  RecoveryIdentifiers,
} from '@metamask/mfa-recovery-controller';
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
  TextField,
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
import { authEnv } from '../../../../../core/apiEnv';
import { linkSocialLogin } from './linkSocialLogin';
import CubistIdentifiersBottomSheet from './CubistIdentifiersBottomSheet';
import MfaRecoveryOptionsBottomSheet, {
  type MfaRecoveryOption,
} from './MfaRecoveryOptionsBottomSheet';
import {
  findMissingCubistIdentifier,
  getCandidateIdentifiers,
  runAddCubistIdentifier,
  runRemoveCubistIdentifier,
  type CubistIdentifierChangeResult,
  type CubistIdentifierStep,
} from './manageCubistIdentifiers';
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
  runMfaRecoveryFullRetrieval,
  type MfaRecoveryFullRetrievalResult,
  type MfaRecoveryFullRetrievalStep,
} from './runMfaRecoveryFullRetrieval';
import {
  runResetPassword,
  runSetLocalPassword,
  type MfaRecoveryPasswordResult,
  type MfaRecoveryPasswordStep,
} from './runMfaRecoveryPasswords';
import PasswordPromptBottomSheet from './PasswordPromptBottomSheet';
import {
  runToprfRecoverySecretTest,
  type ToprfRecoverySecretTestResult,
  type ToprfRecoverySecretTestStep,
} from './runToprfRecoverySecretTest';
const RUN_BUTTON_TEST_ID = 'mfa-recovery-dev-run-cubist-test-button';
const RECOVER_BUTTON_TEST_ID = 'mfa-recovery-dev-recover-secret-button';
const RECOVER_SHEET_TEST_ID = 'mfa-recovery-dev-recover-sheet';
const RECOVER_OPTION_TEST_ID_PREFIX = 'mfa-recovery-dev-recover-option';
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
const SETUP_SHEET_TEST_ID = 'mfa-recovery-dev-setup-sheet';
const SETUP_OPTION_TEST_ID_PREFIX = 'mfa-recovery-dev-setup-option';
const SETUP_SHEET_OPTIONS: readonly MfaRecoveryOption<MfaRecoveryIdentifierCombination>[] =
  (
    Object.keys(SETUP_BUTTON_LABEL_KEYS) as MfaRecoveryIdentifierCombination[]
  ).map((id) => ({ id, labelKey: SETUP_BUTTON_LABEL_KEYS[id] }));
const TOPRF_TEST_BUTTON_TEST_ID =
  'mfa-recovery-dev-toprf-recovery-secret-button';
const FULL_RETRIEVAL_BUTTON_TEST_ID = 'mfa-recovery-dev-full-retrieval-button';
const SET_LOCAL_PASSWORD_BUTTON_TEST_ID =
  'mfa-recovery-dev-set-local-password-button';
const RESET_PASSWORD_BUTTON_TEST_ID = 'mfa-recovery-dev-reset-password-button';
const PASSWORD_PROMPT_SHEET_TEST_ID = 'mfa-recovery-dev-password-prompt-sheet';
const RESET_PENDING_BUTTON_TEST_ID = 'mfa-recovery-dev-reset-pending-button';
const CHECK_SOCIAL_LINK_BUTTON_TEST_ID =
  'mfa-recovery-dev-check-social-link-button';
const LINK_SOCIAL_LOGIN_BUTTON_TEST_ID =
  'mfa-recovery-dev-link-social-login-button';
const ADD_CUBIST_IDENTIFIER_BUTTON_TEST_ID =
  'mfa-recovery-dev-add-cubist-identifier-button';
const REMOVE_CUBIST_IDENTIFIER_BUTTON_TEST_ID =
  'mfa-recovery-dev-remove-cubist-identifier-button';
const RESUME_BUTTON_TEST_ID = 'mfa-recovery-dev-resume-button';
const ABORT_BUTTON_TEST_ID = 'mfa-recovery-dev-abort-button';
const AAL2_APPROVAL_OPERATION = 'mfaRecovery.devOptions';
const AAL2_APPROVAL_AUDIENCES = [TOPRF_AAL2_AUDIENCE];

type MfaRecoveryStep =
  | MfaRecoverySetupStep
  | ToprfRecoverySecretTestStep
  | MfaRecoveryFullRetrievalStep
  | CubistIdentifierStep
  | MfaRecoveryPasswordStep;
type MfaRecoveryRunResult =
  | MfaRecoveryTestResult
  | MfaRecoveryRecoverResult
  | MfaRecoverySetupResult
  | ToprfRecoverySecretTestResult
  | MfaRecoveryFullRetrievalResult
  | CubistIdentifierChangeResult
  | MfaRecoveryPasswordResult;
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
  return [code, detail, escrowFailure]
    .filter((part) => part !== undefined)
    .map((part, index) => (index === 0 ? part : `(${part})`))
    .join(' ');
}

function formatPasswordResult(recoveryResult: MfaRecoveryRunResult): string {
  if (!('action' in recoveryResult)) {
    throw new Error('Unexpected recovery result');
  }
  return strings(
    recoveryResult.action === 'set_local'
      ? 'app_settings.developer_options.mfa_recovery.set_local_password_success'
      : 'app_settings.developer_options.mfa_recovery.reset_password_success',
  );
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
  const [recoveredVaultStage, setRecoveredVaultStage] = useState<
    'none' | 'recovered' | 'local_password_set'
  >('none');
  const [passwordPrompt, setPasswordPrompt] = useState<
    'set_local' | 'reset' | null
  >(null);
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

  const [cubistIdentifiers, setCubistIdentifiers] =
    useState<RecoveryIdentifiers | null>(null);
  const [isCubistIdentifiersUnavailable, setIsCubistIdentifiersUnavailable] =
    useState(false);
  const [isIdentifierSheetOpen, setIsIdentifierSheetOpen] = useState(false);
  const [isSetupSheetOpen, setIsSetupSheetOpen] = useState(false);
  const [isRecoverSheetOpen, setIsRecoverSheetOpen] = useState(false);

  const refreshCubistIdentifiers = useCallback(async () => {
    try {
      setCubistIdentifiers(
        await Engine.context.MfaRecoveryController.getIdentifiers(),
      );
      setIsCubistIdentifiersUnavailable(false);
    } catch {
      setCubistIdentifiers(null);
      setIsCubistIdentifiersUnavailable(true);
    }
  }, []);

  useEffect(() => {
    if (isMfaRecoveryAvailable) {
      refreshCubistIdentifiers();
    }
  }, [isMfaRecoveryAvailable, refreshCubistIdentifiers]);

  const missingCubistIdentifier = useMemo(() => {
    if (cubistIdentifiers === null) {
      return undefined;
    }
    return findMissingCubistIdentifier(
      cubistIdentifiers.identifiers,
      getCandidateIdentifiers(
        cubistIdentifiers.authIdentifiers,
        Engine.context.KeyringController.state.keyrings[0]?.accounts?.[0] ?? '',
        Engine.context.SeedlessOnboardingController.state,
      ),
    );
  }, [cubistIdentifiers]);

  // getIdentifiers has no distinct "not registered" error, so a failed read
  // leaves setup available; only a read that returns identifiers blocks it.
  const isCubistCheckPending =
    cubistIdentifiers === null && !isCubistIdentifiersUnavailable;
  const isCubistRegistered = (cubistIdentifiers?.identifiers.length ?? 0) > 0;
  const isSetupBlockedByCubist = isCubistCheckPending || isCubistRegistered;

  const setupRecoveryLabel = (() => {
    const prefix = 'app_settings.developer_options.mfa_recovery';
    if (isCubistRegistered) {
      return strings(`${prefix}.setup_recovery_button_registered`);
    }
    if (isCubistCheckPending && isMfaRecoveryAvailable) {
      return strings(`${prefix}.setup_recovery_button_checking`);
    }
    return strings(`${prefix}.setup_recovery_button`);
  })();

  const isCubistNotRegistered =
    cubistIdentifiers !== null && cubistIdentifiers.identifiers.length === 0;
  const isRecoverBlockedByCubist =
    isCubistCheckPending || isCubistNotRegistered;

  const runCubistTestLabel = (() => {
    const prefix = 'app_settings.developer_options.mfa_recovery';
    if (isCubistNotRegistered) {
      return strings(`${prefix}.run_cubist_test_button_not_registered`);
    }
    if (isCubistCheckPending && isMfaRecoveryAvailable) {
      return strings(`${prefix}.run_cubist_test_button_checking`);
    }
    return strings(`${prefix}.run_cubist_test_button`);
  })();

  const recoverSecretLabel = (() => {
    const prefix = 'app_settings.developer_options.mfa_recovery';
    if (isCubistNotRegistered) {
      return strings(`${prefix}.recover_secret_button_not_registered`);
    }
    if (isCubistCheckPending && isMfaRecoveryAvailable) {
      return strings(`${prefix}.recover_secret_button_checking`);
    }
    return strings(`${prefix}.recover_secret_button`);
  })();

  const recoverSheetOptions: readonly MfaRecoveryOption<RecoveryReadIdentifierType>[] =
    RECOVER_BUTTONS.map(({ identifierType, labelKey }) => ({
      id: identifierType,
      labelKey,
      isDisabled:
        cubistIdentifiers !== null &&
        !cubistIdentifiers.identifiers.some(
          (identifier) => identifier.type === identifierType,
        ),
    }));

  const addCubistIdentifierLabel = (() => {
    const prefix = 'app_settings.developer_options.mfa_recovery';
    if (isCubistIdentifiersUnavailable) {
      return strings(`${prefix}.add_cubist_identifier_button_unavailable`);
    }
    if (cubistIdentifiers === null) {
      return strings(`${prefix}.add_cubist_identifier_button_checking`);
    }
    if (missingCubistIdentifier === undefined) {
      return strings(`${prefix}.add_cubist_identifier_button_all_added`);
    }
    return strings(`${prefix}.add_cubist_identifier_button`, {
      type: missingCubistIdentifier.type,
    });
  })();

  const handleRun = useCallback(
    async (
      runner: MfaRecoveryRunner,
      formatResult: MfaRecoveryResultFormatter,
    ) => {
      if (isRunning) {
        return false;
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
        return true;
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
        return false;
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

  const formatCubistIdentifierChange = useCallback(
    (changeResult: MfaRecoveryRunResult) => {
      if (!('identifierType' in changeResult)) {
        throw new Error('Unexpected recovery result');
      }
      return strings(
        `app_settings.developer_options.mfa_recovery.cubist_identifier_${changeResult.change}`,
        { type: changeResult.identifierType, epoch: changeResult.epoch },
      );
    },
    [],
  );

  const handleAddCubistIdentifier = useCallback(async () => {
    await handleRun(
      (dependencies, onStep) => runAddCubistIdentifier(dependencies, onStep),
      formatCubistIdentifierChange,
    );
    await refreshCubistIdentifiers();
  }, [formatCubistIdentifierChange, handleRun, refreshCubistIdentifiers]);

  const handleRemoveCubistIdentifier = useCallback(
    async (identifier: Identifier) => {
      setIsIdentifierSheetOpen(false);
      await handleRun(
        (dependencies, onStep) =>
          runRemoveCubistIdentifier(dependencies, identifier, onStep),
        formatCubistIdentifierChange,
      );
      await refreshCubistIdentifiers();
    },
    [formatCubistIdentifierChange, handleRun, refreshCubistIdentifiers],
  );

  const handleResetPendingOperation = useCallback(async () => {
    setError(null);
    clearPendingOperationForDev(Engine.context.MfaRecoveryController);
    await refreshPhase();
  }, [refreshPhase]);

  // TEMPORARY DIAGNOSTIC: logs whether the social login is paired to this
  // wallet's Auth profile, never the token or profile IDs.
  const handleCheckSocialLink = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    const { AuthenticationController } = Engine.context;
    const localPairedIdentifierTypes = Object.values(
      AuthenticationController.state.srpSessionData ?? {},
    ).map(
      (session) =>
        session.profile.pairedIdentifierIds?.map(({ type }) => type) ?? null,
    );
    let status: string;
    try {
      const [{ profile }, canonicalProfileId] = await Promise.all([
        AuthenticationController.exchangeSocialAccessToken(),
        AuthenticationController.refreshCanonicalProfileId(),
      ]);
      status =
        profile.canonicalProfileId === canonicalProfileId
          ? 'linked_to_this_profile'
          : 'linked_to_other_profile';
    } catch (checkError) {
      const errorName = checkError instanceof Error ? checkError.name : '';
      const errorMessage =
        checkError instanceof Error ? checkError.message : String(checkError);
      if (errorName === 'SocialIdentifierNotPairedError') {
        status = 'not_linked';
      } else if (errorMessage.startsWith('exchangeSocialAccessToken -')) {
        status = `no_social_login (${errorMessage})`;
      } else {
        status = `check_failed (${errorName}: ${errorMessage})`;
      }
    }
    console.warn(
      `MFA social link check ${JSON.stringify({
        status,
        localPairedIdentifierTypes,
      })}`,
    );
    setResult(
      strings(
        'app_settings.developer_options.mfa_recovery.check_social_link_result',
        { status },
      ),
    );
    setIsRunning(false);
  }, []);

  // TEMPORARY DIAGNOSTIC: logs the outcome and identifier types only, never
  // the tokens, email, or identifier IDs.
  const handleLinkSocialLogin = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    const { AuthenticationController, SeedlessOnboardingController } =
      Engine.context;
    let status: string;
    try {
      // Auth requires an aal:2 token to attach an identifier once the profile
      // has an MFA factor; the verification session holds that token.
      await verifyMfa();
      const aal2AccessToken =
        AuthenticationController.getVerificationToken()?.accessToken;
      if (!aal2AccessToken) {
        throw new Error('no MFA verification token after verification');
      }
      const linkResult = await linkSocialLogin({
        env: authEnv(),
        seedlessState: SeedlessOnboardingController.state,
        getSocialAccessToken: () =>
          SeedlessOnboardingController.getAccessToken(),
        getBearerToken: async () => aal2AccessToken,
      });
      console.warn(`MFA social link ${JSON.stringify(linkResult)}`);
      status = [
        linkResult.status,
        linkResult.httpStatus,
        linkResult.pairedIdentifierTypes?.join(','),
      ]
        .filter((part) => part !== undefined && part !== '')
        .join(' ');
    } catch (linkError) {
      const errorMessage =
        linkError instanceof Error ? linkError.message : String(linkError);
      console.warn(
        `MFA social link ${JSON.stringify({ error: errorMessage })}`,
      );
      status = `failed (${errorMessage})`;
    }
    setResult(
      strings(
        'app_settings.developer_options.mfa_recovery.link_social_login_result',
        { status },
      ),
    );
    setIsRunning(false);
  }, [verifyMfa]);

  const handleEnableFlagOverride = useCallback(() => {
    Engine.context.RemoteFeatureFlagController.setFlagOverride('mfaRecovery', {
      enabled: true,
      minimumVersion: '0.0.0',
    });
  }, []);

  const handleRunCubistTest = useCallback(async () => {
    await handleRun(runMfaRecoveryCubistTest, (recoveryResult) => {
      if (
        'fingerprint' in recoveryResult ||
        'after' in recoveryResult ||
        'allSrpsRecovered' in recoveryResult ||
        'identifierType' in recoveryResult ||
        'action' in recoveryResult
      ) {
        throw new Error('Unexpected recovery result');
      }
      return strings('app_settings.developer_options.mfa_recovery.success', {
        epoch: recoveryResult.epoch,
        matches: recoveryResult.matches ? 'yes' : 'no',
      });
    });
    await refreshCubistIdentifiers();
  }, [handleRun, refreshCubistIdentifiers]);

  const handleSetupRecovery = useCallback(
    async (combination: MfaRecoveryIdentifierCombination) => {
      setIsSetupSheetOpen(false);
      await handleRun(
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
      await refreshCubistIdentifiers();
    },
    [handleRun, refreshCubistIdentifiers],
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

  const handleFullRetrieval = useCallback(async () => {
    const succeeded = await handleRun(
      (dependencies, onStep) =>
        runMfaRecoveryFullRetrieval(
          {
            ...dependencies,
            seedless: Engine.context.SeedlessOnboardingController,
          },
          onStep,
        ),
      (recoveryResult) => {
        if (!('allSrpsRecovered' in recoveryResult)) {
          throw new Error('Unexpected recovery result');
        }
        return strings(
          'app_settings.developer_options.mfa_recovery.full_retrieval_success',
          {
            expected: recoveryResult.expectedSrpCount,
            recovered: recoveryResult.recoveredSrpCount,
            matched: recoveryResult.matchedSrpCount,
            allRecovered: recoveryResult.allSrpsRecovered ? 'yes' : 'no',
          },
        );
      },
    );
    if (succeeded) {
      setRecoveredVaultStage('recovered');
    }
  }, [handleRun]);

  const handleSetLocalPassword = useCallback(
    async (password: string) => {
      setPasswordPrompt(null);
      const succeeded = await handleRun(
        (_dependencies, onStep) =>
          runSetLocalPassword(
            Engine.context.SeedlessOnboardingController,
            password,
            onStep,
          ),
        formatPasswordResult,
      );
      if (succeeded) {
        setRecoveredVaultStage('local_password_set');
      }
    },
    [handleRun],
  );

  const handleResetPassword = useCallback(
    async (newPassword: string) => {
      setPasswordPrompt(null);
      const succeeded = await handleRun(
        (_dependencies, onStep) =>
          runResetPassword(
            Engine.context.SeedlessOnboardingController,
            newPassword,
            onStep,
          ),
        formatPasswordResult,
      );
      if (succeeded) {
        setRecoveredVaultStage('none');
      }
    },
    [handleRun],
  );

  const handleRecoverSecret = useCallback(
    (identifierType: RecoveryReadIdentifierType) => {
      setIsRecoverSheetOpen(false);
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
        isDisabled={
          isRunning || !isMfaRecoveryAvailable || isRecoverBlockedByCubist
        }
        isFullWidth
        style={styles.accessory}
        testID={RUN_BUTTON_TEST_ID}
      >
        {runCubistTestLabel}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={() => setIsRecoverSheetOpen(true)}
        isDisabled={
          isRunning || !isMfaRecoveryAvailable || isRecoverBlockedByCubist
        }
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
          titleKey="app_settings.developer_options.mfa_recovery.recover_secret_sheet_title"
          options={recoverSheetOptions}
          onSelect={handleRecoverSecret}
          onClose={() => setIsRecoverSheetOpen(false)}
        />
      )}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={() => setIsSetupSheetOpen(true)}
        isDisabled={
          isRunning || !isMfaRecoveryAvailable || isSetupBlockedByCubist
        }
        isFullWidth
        style={styles.accessory}
        testID={SETUP_BUTTON_TEST_ID}
      >
        {setupRecoveryLabel}
      </Button>
      {isSetupSheetOpen && (
        <MfaRecoveryOptionsBottomSheet
          testID={SETUP_SHEET_TEST_ID}
          optionTestIdPrefix={SETUP_OPTION_TEST_ID_PREFIX}
          titleKey="app_settings.developer_options.mfa_recovery.setup_recovery_sheet_title"
          options={SETUP_SHEET_OPTIONS}
          onSelect={handleSetupRecovery}
          onClose={() => setIsSetupSheetOpen(false)}
        />
      )}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleAddCubistIdentifier}
        isDisabled={
          isRunning ||
          !isMfaRecoveryAvailable ||
          missingCubistIdentifier?.identifier === undefined
        }
        isFullWidth
        style={styles.accessory}
        testID={ADD_CUBIST_IDENTIFIER_BUTTON_TEST_ID}
      >
        {addCubistIdentifierLabel}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={() => setIsIdentifierSheetOpen(true)}
        isDisabled={
          isRunning || !isMfaRecoveryAvailable || cubistIdentifiers === null
        }
        isFullWidth
        style={styles.accessory}
        testID={REMOVE_CUBIST_IDENTIFIER_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.mfa_recovery.remove_cubist_identifier_button',
        )}
      </Button>
      {isIdentifierSheetOpen && cubistIdentifiers !== null && (
        <CubistIdentifiersBottomSheet
          identifiers={cubistIdentifiers.identifiers}
          onRemove={handleRemoveCubistIdentifier}
          onClose={() => setIsIdentifierSheetOpen(false)}
        />
      )}
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
        onPress={handleFullRetrieval}
        isDisabled={isRunning || !__DEV__ || !isMfaRecoveryAvailable}
        isFullWidth
        style={styles.accessory}
        testID={FULL_RETRIEVAL_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.mfa_recovery.full_retrieval_button',
        )}
      </Button>
      {recoveredVaultStage !== 'none' && (
        <>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={() => setPasswordPrompt('set_local')}
            isDisabled={
              isRunning || !__DEV__ || recoveredVaultStage !== 'recovered'
            }
            isFullWidth
            style={styles.accessory}
            testID={SET_LOCAL_PASSWORD_BUTTON_TEST_ID}
          >
            {strings(
              'app_settings.developer_options.mfa_recovery.set_local_password_button',
            )}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={() => setPasswordPrompt('reset')}
            isDisabled={
              isRunning ||
              !__DEV__ ||
              recoveredVaultStage !== 'local_password_set'
            }
            isFullWidth
            style={styles.accessory}
            testID={RESET_PASSWORD_BUTTON_TEST_ID}
          >
            {strings(
              'app_settings.developer_options.mfa_recovery.reset_password_button',
            )}
          </Button>
        </>
      )}
      {passwordPrompt !== null && (
        <PasswordPromptBottomSheet
          testID={PASSWORD_PROMPT_SHEET_TEST_ID}
          titleKey={
            passwordPrompt === 'set_local'
              ? 'app_settings.developer_options.mfa_recovery.set_local_password_prompt_title'
              : 'app_settings.developer_options.mfa_recovery.reset_password_prompt_title'
          }
          onSubmit={
            passwordPrompt === 'set_local'
              ? handleSetLocalPassword
              : handleResetPassword
          }
          onClose={() => setPasswordPrompt(null)}
        />
      )}
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
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleCheckSocialLink}
        isDisabled={isRunning || !__DEV__}
        isFullWidth
        style={styles.accessory}
        testID={CHECK_SOCIAL_LINK_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.mfa_recovery.check_social_link_button',
        )}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleLinkSocialLogin}
        isDisabled={isRunning || !__DEV__}
        isFullWidth
        style={styles.accessory}
        testID={LINK_SOCIAL_LOGIN_BUTTON_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.mfa_recovery.link_social_login_button',
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

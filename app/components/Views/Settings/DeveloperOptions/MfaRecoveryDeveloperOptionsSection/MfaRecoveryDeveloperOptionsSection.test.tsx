import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { isMfaRecoveryConfigured } from '../../../../../core/Engine/controllers/mfa-recovery-controller/config';
import { selectMfaRecoveryEnabled } from '../../../../../selectors/featureFlagController/mfaRecovery';
import { LinkSocialLoginError } from '../../../../../core/Engine/controllers/mfa-recovery-controller/social-login/link-social-login';
import { SOCIAL_LINK_EMAIL_TEST_IDS } from '../../../shared/SocialLinkEmailBottomSheet';
import MfaRecoveryDeveloperOptionsSection from './MfaRecoveryDeveloperOptionsSection';

const mockRunMfaRecoveryCubistTest = jest.fn();
const mockRunMfaRecoveryCubistRecover = jest.fn();
const mockRunMfaRecoverySetup = jest.fn();
const mockPrepareRun = jest.fn();
const mockRunToprfRecoverySecretTest = jest.fn();
const mockRunMfaRecoveryFullRetrieval = jest.fn();
const mockVerifyOrEnroll = jest.fn();
const mockRequestMfaApproval = jest.fn();
const mockGetMfaRecoveryErrorCode = jest.fn();
const mockExchangeSocialAccessToken = jest.fn();
const mockRefreshCanonicalProfileId = jest.fn();
const mockLinkSocialLogin = jest.fn();
const mockGetIdentifiers = jest.fn();
const mockGetPhase = jest.fn();
const mockResume = jest.fn();
const mockAbort = jest.fn();
const mockClearPendingOperationForDev = jest.fn();
const mockSetFlagOverride = jest.fn();
const mockAuthenticateForRecovery = jest.fn();
const mockSetLocalPassword = jest.fn();
const mockResetPasswordWithVaultKeys = jest.fn();
const mockRunAddCubistIdentifier = jest.fn();
const mockRunRemoveCubistIdentifier = jest.fn();
const mockToprfConfig = {
  aal2Audience: 'toprf-aal2-audience',
  authConnectionId: 'toprf-auth-connection',
  groupedAuthConnectionId: 'toprf-grouped-auth-connection',
};

jest.mock(
  '../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service',
  () => {
    const actual = jest.requireActual<
      typeof import('../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service')
    >(
      '../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service',
    );
    class MockMfaRecoveryService extends actual.MfaRecoveryService {
      setUp = (identifiers: unknown) =>
        mockRunMfaRecoverySetup(this, identifiers);
      prepareRun = () => mockPrepareRun();
      addIdentifier = (identifier: unknown) =>
        mockRunAddCubistIdentifier(this, identifier);
      removeIdentifier = (identifier: unknown) =>
        mockRunRemoveCubistIdentifier(this, identifier);
    }
    return { ...actual, MfaRecoveryService: MockMfaRecoveryService };
  },
);

jest.mock('../../../../../core/MfaRecovery/engineBindings', () => ({
  createMfaRecoveryService: (options: object) => {
    const { MfaRecoveryService } = jest.requireMock<
      typeof import('../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service')
    >(
      '../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service',
    );
    const { createMfaRecoveryServiceTestMessenger } = jest.requireActual<
      typeof import('../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service-test-messenger')
    >(
      '../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service-test-messenger',
    );
    const { default: MockEngine } = jest.requireMock<{
      default: { context: Record<string, unknown> };
    }>('../../../../../core/Engine');
    return new MfaRecoveryService({
      verifyMfa: () => Promise.resolve(),
      approvalOperation: 'test',
      ...options,
      messenger: createMfaRecoveryServiceTestMessenger(
        () => MockEngine.context,
      ),
    });
  },
}));

jest.mock(
  '../../../../../core/Engine/controllers/mfa-recovery-controller/social-login/link-social-login',
  () => ({
    ...jest.requireActual(
      '../../../../../core/Engine/controllers/mfa-recovery-controller/social-login/link-social-login',
    ),
    linkSocialLogin: (dependencies: unknown) =>
      mockLinkSocialLogin(dependencies),
  }),
);

jest.mock('../../../../../core/apiEnv', () => ({
  authEnv: () => 'test-env',
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        state: { keyrings: [{ accounts: ['0xabc'] }] },
        signPersonalMessage: jest.fn(),
      },
      AuthenticationController: {
        state: { srpSessionData: {} },
        requestMfaApproval: (request: unknown) =>
          mockRequestMfaApproval(request),
        exchangeSocialAccessToken: () => mockExchangeSocialAccessToken(),
        refreshCanonicalProfileId: () => mockRefreshCanonicalProfileId(),
        getVerificationToken: () => ({ accessToken: 'aal2-access-token' }),
      },
      MfaRecoveryController: {
        getIdentifiers: () => mockGetIdentifiers(),
        getPhase: () => mockGetPhase(),
        resume: () => mockResume(),
        abort: () => mockAbort(),
      },
      RemoteFeatureFlagController: {
        setFlagOverride: (name: string, value: unknown) =>
          mockSetFlagOverride(name, value),
      },
      SeedlessOnboardingController: {
        state: { authConnection: 'google', userId: 'google-user' },
        getAccessToken: jest.fn(),
        authenticateForRecovery: (args: unknown) =>
          mockAuthenticateForRecovery(args),
        setLocalPassword: (args: unknown) => mockSetLocalPassword(args),
        resetPasswordWithVaultKeys: (args: unknown) =>
          mockResetPasswordWithVaultKeys(args),
      },
    },
  },
}));

jest.mock(
  '../../../../../core/Engine/controllers/mfa-recovery-controller/config',
  () => ({
    isMfaRecoveryConfigured: jest.fn(() => true),
    getToprfRecoveryConfig: () => mockToprfConfig,
    getCubistConfig: () => ({ authAudience: 'cubist-auth-audience' }),
  }),
);

jest.mock('./clearPendingOperation', () => ({
  clearPendingOperationForDev: (controller: unknown) =>
    mockClearPendingOperationForDev(controller),
}));

jest.mock('../../../../../util/identity/mfa/useMfa', () => ({
  useMfa: () => ({
    credentials: [],
    verifyOrEnroll: (options: unknown) => mockVerifyOrEnroll(options),
    enroll: jest.fn(),
  }),
}));

jest.mock('../../../../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: jest.fn(() => true),
}));

jest.mock('./runMfaRecoveryCubistTest', () => ({
  getMfaRecoveryErrorCode: (error: unknown) =>
    mockGetMfaRecoveryErrorCode(error),
  getMfaRecoveryErrorDetail: (error: unknown) =>
    error instanceof Error ? error.message : undefined,
  runMfaRecoveryCubistTest: (
    dependencies: unknown,
    onStep: (step: string) => void,
  ) => mockRunMfaRecoveryCubistTest(dependencies, onStep),
  runMfaRecoveryCubistRecover: (
    dependencies: unknown,
    onStep: (step: string) => void,
    identifierType: string,
    socialIdentifier: unknown,
  ) =>
    mockRunMfaRecoveryCubistRecover(
      dependencies,
      onStep,
      identifierType,
      socialIdentifier,
    ),
}));

jest.mock('./runToprfRecoverySecretTest', () => ({
  runToprfRecoverySecretTest: (
    dependencies: unknown,
    onStep: (step: string) => void,
  ) => mockRunToprfRecoverySecretTest(dependencies, onStep),
}));

jest.mock('./runMfaRecoveryFullRetrieval', () => ({
  runMfaRecoveryFullRetrieval: (
    _service: unknown,
    dependencies: unknown,
    onStep: (step: string) => void,
  ) => mockRunMfaRecoveryFullRetrieval(dependencies, onStep),
}));

const FULL_RETRIEVAL_BUTTON_TEST_ID = 'mfa-recovery-dev-full-retrieval-button';
const FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX =
  'mfa-recovery-dev-full-retrieval-option';
const SET_LOCAL_PASSWORD_BUTTON_TEST_ID =
  'mfa-recovery-dev-set-local-password-button';
const RESET_PASSWORD_BUTTON_TEST_ID = 'mfa-recovery-dev-reset-password-button';
const PASSWORD_PROMPT_INPUT_TEST_ID = 'mfa-recovery-dev-password-prompt-input';
const PASSWORD_PROMPT_CONFIRM_TEST_ID =
  'mfa-recovery-dev-password-prompt-confirm';
const RUN_BUTTON_TEST_ID = 'mfa-recovery-dev-run-cubist-test-button';
const RECOVER_BUTTON_TEST_ID = 'mfa-recovery-dev-recover-secret-button';
const RECOVER_OPTION_TEST_ID_PREFIX = 'mfa-recovery-dev-recover-option';
const SETUP_BUTTON_TEST_ID = 'mfa-recovery-dev-setup-recovery-button';
const SETUP_OPTION_TEST_ID_PREFIX = 'mfa-recovery-dev-setup-option';
const ADD_CUBIST_IDENTIFIER_BUTTON_TEST_ID =
  'mfa-recovery-dev-add-cubist-identifier-button';
const REMOVE_CUBIST_IDENTIFIER_BUTTON_TEST_ID =
  'mfa-recovery-dev-remove-cubist-identifier-button';
const CUBIST_IDENTIFIER_ROW_TEST_ID = 'mfa-recovery-dev-cubist-identifier-row';
const LINK_SOCIAL_LOGIN_BUTTON_TEST_ID =
  'mfa-recovery-dev-link-social-login-button';
const CHECK_SOCIAL_LINK_BUTTON_TEST_ID =
  'mfa-recovery-dev-check-social-link-button';
const TOPRF_TEST_BUTTON_TEST_ID =
  'mfa-recovery-dev-toprf-recovery-secret-button';
const RESET_PENDING_BUTTON_TEST_ID = 'mfa-recovery-dev-reset-pending-button';
const RESUME_BUTTON_TEST_ID = 'mfa-recovery-dev-resume-button';
const ABORT_BUTTON_TEST_ID = 'mfa-recovery-dev-abort-button';
const SETUP_PASSKEY = {
  type: 'passkey',
  namespace: 'auth.example',
  value: 'credential',
};

type GetByTestId = (testId: string) => unknown;

async function pressRunButton(getByTestId: GetByTestId) {
  await waitFor(() => {
    expect(getByTestId(RUN_BUTTON_TEST_ID)).not.toBeDisabled();
  });
  fireEvent.press(getByTestId(RUN_BUTTON_TEST_ID) as never);
}

async function chooseRecoverOption(
  getByTestId: GetByTestId,
  identifierType = 'siwe',
) {
  await waitFor(() => {
    expect(getByTestId(RECOVER_BUTTON_TEST_ID)).not.toBeDisabled();
  });
  fireEvent.press(getByTestId(RECOVER_BUTTON_TEST_ID) as never);
  fireEvent.press(
    getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-${identifierType}`) as never,
  );
}

async function chooseSetupOption(
  getByTestId: GetByTestId,
  option = 'siwe_social',
) {
  await waitFor(() => {
    expect(getByTestId(SETUP_BUTTON_TEST_ID)).not.toBeDisabled();
  });
  fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID) as never);
  fireEvent.press(
    getByTestId(`${SETUP_OPTION_TEST_ID_PREFIX}-${option}`) as never,
  );
}

describe('MfaRecoveryDeveloperOptionsSection', () => {
  const globalWithDev = global as typeof global & { __DEV__: boolean };
  const originalDev = globalWithDev.__DEV__;

  afterAll(() => {
    globalWithDev.__DEV__ = originalDev;
  });

  beforeEach(() => {
    globalWithDev.__DEV__ = true;
    jest.clearAllMocks();
    mockRunToprfRecoverySecretTest.mockResolvedValue({
      before: 'NotEnabled',
      after: 'Enabled',
      shareExisted: false,
      fingerprint: 'cafebabe',
    });
    mockRunMfaRecoveryCubistTest.mockResolvedValue({ epoch: 1, matches: true });
    mockRunMfaRecoveryCubistRecover.mockResolvedValue({
      epoch: 1,
      matches: undefined,
      fingerprint: 'deadbeef',
    });
    mockRunMfaRecoverySetup.mockResolvedValue('enabled');
    mockVerifyOrEnroll.mockResolvedValue({
      credentials: [],
      token: { accessToken: 'verification-token' },
    });
    mockRequestMfaApproval.mockResolvedValue({
      approval: 'aal2-token',
      expiresIn: 300,
    });
    mockGetMfaRecoveryErrorCode.mockReturnValue('unknown_error');
    mockGetIdentifiers.mockRejectedValue(new Error('not registered'));
    mockGetPhase.mockResolvedValue('idle');
  });

  afterEach(() => {
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(true);
    jest.mocked(selectMfaRecoveryEnabled).mockReturnValue(true);
  });

  it('renders the recovery test controls and status', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    expect(getByText('MFA recovery')).toBeOnTheScreen();
    expect(getByTestId(RUN_BUTTON_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(RECOVER_BUTTON_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(SETUP_BUTTON_TEST_ID)).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        getByText(
          'Feature flag enabled: yes; service configured: yes; controller phase: idle.',
        ),
      ).toBeOnTheScreen();
    });
  });

  it('disables the Cubist controls when recovery is not configured', () => {
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    expect(getByTestId(RUN_BUTTON_TEST_ID)).toBeDisabled();
    expect(getByTestId(RECOVER_BUTTON_TEST_ID)).toBeDisabled();
    expect(getByTestId(SETUP_BUTTON_TEST_ID)).toBeDisabled();
    expect(getByTestId(TOPRF_TEST_BUTTON_TEST_ID)).toBeDisabled();
    expect(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID)).toBeDisabled();
    expect(mockGetIdentifiers).not.toHaveBeenCalled();
  });

  it('enables the mfaRecovery flag override when the flag is off', () => {
    jest.mocked(selectMfaRecoveryEnabled).mockReturnValue(false);
    const { getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByText('Enable mfaRecovery flag override (dev)'));

    expect(mockSetFlagOverride).toHaveBeenCalledWith('mfaRecovery', {
      enabled: true,
      minimumVersion: '0.0.0',
    });
  });

  it.each([
    ['siwe_social', 'Set up recovery: SIWE + social', undefined],
    [
      'siwe_social_passkey',
      'Set up recovery: SIWE + social + passkey',
      [SETUP_PASSKEY],
    ],
  ])(
    'runs recovery setup with the %s identifiers',
    async (option, label, identifiers) => {
      mockPrepareRun.mockResolvedValue({ passkeyIdentifier: SETUP_PASSKEY });
      const { getByTestId, getByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await waitFor(() => {
        expect(getByTestId(SETUP_BUTTON_TEST_ID)).not.toBeDisabled();
      });
      fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID));
      expect(getByText(label)).toBeOnTheScreen();

      fireEvent.press(getByTestId(`${SETUP_OPTION_TEST_ID_PREFIX}-${option}`));

      await waitFor(() => {
        expect(mockRunMfaRecoverySetup).toHaveBeenCalledWith(
          expect.any(Object),
          identifiers,
        );
      });
    },
  );

  it('disables setup once Cubist has identifiers registered', async () => {
    mockGetIdentifiers.mockResolvedValue({
      identifiers: [
        { type: 'siwe', namespace: 'metamask.io:1', value: '0xabc' },
      ],
      epoch: 1,
      authIdentifiers: [],
    });
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await waitFor(() => {
      expect(
        getByText('Set up recovery (already registered in Cubist)'),
      ).toBeOnTheScreen();
    });
    expect(getByTestId(SETUP_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('enables setup when Cubist returns no identifiers', async () => {
    mockGetIdentifiers.mockResolvedValue({
      identifiers: [],
      epoch: 0,
      authIdentifiers: [],
    });
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await waitFor(() => {
      expect(getByTestId(SETUP_BUTTON_TEST_ID)).not.toBeDisabled();
    });
    expect(getByText('Set up recovery (dev)')).toBeOnTheScreen();
  });

  it('runs recovery setup and displays its result', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await chooseSetupOption(getByTestId);

    await waitFor(() => {
      expect(mockRunMfaRecoverySetup).toHaveBeenCalledTimes(1);
      expect(getByText('Recovery setup result: enabled.')).toBeOnTheScreen();
    });
  });

  it('gives the recovery setup a separate verification and approval minting step', async () => {
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await chooseSetupOption(getByTestId);

    await waitFor(() => {
      expect(mockRunMfaRecoverySetup).toHaveBeenCalledTimes(1);
    });
    const [service] = mockRunMfaRecoverySetup.mock.calls[0];
    await service.verifyMfa();
    expect(mockVerifyOrEnroll).toHaveBeenCalledTimes(1);
    expect(mockRequestMfaApproval).not.toHaveBeenCalled();

    await expect(service.mintAal2Token()).resolves.toBe('aal2-token');
    expect(mockVerifyOrEnroll).toHaveBeenCalledTimes(1);
    expect(mockRequestMfaApproval).toHaveBeenCalledTimes(1);
  });

  it('displays the controller error code when recovery setup fails', async () => {
    mockRunMfaRecoverySetup.mockRejectedValueOnce(new Error('already set'));
    mockGetMfaRecoveryErrorCode.mockReturnValue('recovery_secret_already_set');

    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await chooseSetupOption(getByTestId);

    await waitFor(() => {
      expect(
        getByText(
          /Recovery test failed: recovery_secret_already_set \(already set\)/,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('runs the recovery flow and displays the result', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressRunButton(getByTestId);

    await waitFor(() => {
      expect(mockRunMfaRecoveryCubistTest).toHaveBeenCalledTimes(1);
      expect(
        getByText('Recovery test passed (epoch: 1, secret matches: yes).'),
      ).toBeOnTheScreen();
    });
  });

  it('shows the step the flow failed at', async () => {
    mockRunMfaRecoveryCubistTest.mockImplementationOnce(
      async (_service: unknown, onStep: (step: string) => void) => {
        onStep('updating_recovery_secret');
        throw new Error('escrow failed');
      },
    );
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressRunButton(getByTestId);

    await waitFor(() => {
      expect(
        getByText('Running: Updating the recovery secret'),
      ).toBeOnTheScreen();
    });
  });

  it.each(['siwe', 'passkey'] as const)(
    'runs getRecoverySecret with the %s identifier',
    async (identifierType) => {
      const { getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      await chooseRecoverOption(getByTestId, identifierType);

      await waitFor(() => {
        expect(mockRunMfaRecoveryCubistRecover).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Function),
          identifierType,
          undefined,
        );
      });
    },
  );

  it('runs getRecoverySecret with the social identifier', async () => {
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await chooseRecoverOption(getByTestId, 'social');

    await waitFor(() => {
      expect(mockRunMfaRecoveryCubistRecover).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function),
        'social',
        expect.objectContaining({ type: 'social' }),
      );
    });
  });

  it('runs getRecoverySecret and displays the recovered secret fingerprint', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await chooseRecoverOption(getByTestId);

    await waitFor(() => {
      expect(mockRunMfaRecoveryCubistRecover).toHaveBeenCalledTimes(1);
      expect(
        getByText(/Recovery succeeded .*fingerprint: deadbeef/),
      ).toBeOnTheScreen();
    });
  });

  it('displays whether the recovered secret matches the last registration', async () => {
    mockRunMfaRecoveryCubistRecover.mockResolvedValueOnce({
      epoch: 2,
      matches: true,
      fingerprint: 'deadbeef',
    });

    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await chooseRecoverOption(getByTestId);

    await waitFor(() => {
      expect(
        getByText(/secret matches last registration: yes/),
      ).toBeOnTheScreen();
    });
  });

  it('disables the run button when Cubist has no identifiers registered', async () => {
    mockGetIdentifiers.mockResolvedValue({
      identifiers: [],
      epoch: 0,
      authIdentifiers: [],
    });
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await waitFor(() => {
      expect(
        getByText('Run Cubist recovery test (not registered in Cubist)'),
      ).toBeOnTheScreen();
    });
    expect(getByTestId(RUN_BUTTON_TEST_ID)).toBeDisabled();
    expect(mockRunMfaRecoveryCubistTest).not.toHaveBeenCalled();
  });

  it('disables the recover button when Cubist has no identifiers registered', async () => {
    mockGetIdentifiers.mockResolvedValue({
      identifiers: [],
      epoch: 0,
      authIdentifiers: [],
    });
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await waitFor(() => {
      expect(
        getByText('Recover secret (not registered in Cubist)'),
      ).toBeOnTheScreen();
    });
    expect(getByTestId(RECOVER_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('disables recover options for identifier types that are not enrolled', async () => {
    mockGetIdentifiers.mockResolvedValue({
      identifiers: [
        { type: 'siwe', namespace: 'metamask.io:1', value: '0xabc' },
      ],
      epoch: 1,
      authIdentifiers: [],
    });
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await waitFor(() => {
      expect(getByText('Recover secret (dev)')).toBeOnTheScreen();
    });
    fireEvent.press(getByTestId(RECOVER_BUTTON_TEST_ID) as never);

    expect(
      getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-siwe`),
    ).not.toBeDisabled();
    expect(
      getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-passkey`),
    ).toBeDisabled();
    expect(
      getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-social`),
    ).toBeDisabled();
  });

  it('disables both recovery buttons while a flow is running', async () => {
    mockRunMfaRecoveryCubistTest.mockReturnValue(new Promise(() => undefined));

    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressRunButton(getByTestId);

    await waitFor(() => {
      expect(getByTestId(RUN_BUTTON_TEST_ID)).toBeDisabled();
      expect(getByTestId(RECOVER_BUTTON_TEST_ID)).toBeDisabled();
    });
  });

  it('opens the TOPRF recovery session with an MFA approval after a passkey verification', async () => {
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(TOPRF_TEST_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockRunToprfRecoverySecretTest).toHaveBeenCalledTimes(1);
    });
    const [dependencies] = mockRunToprfRecoverySecretTest.mock.calls[0];
    await dependencies.openRecoverySession();
    expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
      methods: ['passkey', 'totp'],
      verifyWith: ['passkey', 'totp'],
      reason: { operation: 'qa.mfaRecoveryDevOptions' },
    });
    expect(mockRequestMfaApproval).toHaveBeenCalledWith({
      requestHash: expect.stringMatching(/^0x[0-9a-f]{64}$/u),
      audiences: [mockToprfConfig.aal2Audience],
      requireVerification: true,
      includeIdentifiers: false,
      reason: { operation: 'qa.mfaRecoveryDevOptions' },
    });
    expect(mockAuthenticateForRecovery).toHaveBeenCalledWith({
      aal2Token: 'aal2-token',
      authConnectionId: mockToprfConfig.authConnectionId,
      groupedAuthConnectionId: mockToprfConfig.groupedAuthConnectionId,
    });
  });

  it('runs the TOPRF recovery secret test with the seedless controller and account address', async () => {
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(TOPRF_TEST_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockRunToprfRecoverySecretTest).toHaveBeenCalledTimes(1);
    });
    const [dependencies] = mockRunToprfRecoverySecretTest.mock.calls[0];
    expect(dependencies.seedless).toBe(
      Engine.context.SeedlessOnboardingController,
    );
    expect(dependencies.address).toBe('0xabc');
  });

  it('displays the full TOPRF recovery secret test result', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(TOPRF_TEST_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(
        getByText(
          'TOPRF recovery secret test passed (status before: NotEnabled, after: Enabled; share existed: no; secret fingerprint: cafebabe).',
        ),
      ).toBeOnTheScreen();
    });
  });

  it('displays the error code when the TOPRF recovery secret test fails', async () => {
    mockRunToprfRecoverySecretTest.mockRejectedValueOnce(
      new Error('toprf node unreachable'),
    );
    mockGetMfaRecoveryErrorCode.mockReturnValue('toprf_request_failed');

    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(TOPRF_TEST_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(
        getByText(
          /Recovery test failed: toprf_request_failed \(toprf node unreachable\)/,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('displays the controller error code when the flow fails', async () => {
    mockRunMfaRecoveryCubistTest.mockRejectedValueOnce(
      new Error('escrow failed'),
    );
    mockGetMfaRecoveryErrorCode.mockReturnValue('escrow_request_failed');

    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressRunButton(getByTestId);

    await waitFor(() => {
      expect(
        getByText(
          /Recovery test failed: escrow_request_failed \(escrow failed\)/,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('pending operation', () => {
    it('hides resume and abort while the controller is idle', async () => {
      const { queryByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      await waitFor(() => {
        expect(mockGetPhase).toHaveBeenCalled();
      });
      expect(queryByTestId(RESUME_BUTTON_TEST_ID)).toBeNull();
      expect(queryByTestId(ABORT_BUTTON_TEST_ID)).toBeNull();
    });

    it.each([
      ['resume', RESUME_BUTTON_TEST_ID, mockResume],
      ['abort', ABORT_BUTTON_TEST_ID, mockAbort],
    ])(
      'runs %s on the pending operation and refreshes the phase',
      async (_action, testId, controllerMethod) => {
        mockGetPhase.mockResolvedValue('authorizing');
        const { findByTestId } = renderWithProvider(
          <MfaRecoveryDeveloperOptionsSection />,
        );

        fireEvent.press(await findByTestId(testId));

        await waitFor(() => {
          expect(controllerMethod).toHaveBeenCalledTimes(1);
          expect(mockGetPhase).toHaveBeenCalledTimes(2);
        });
      },
    );

    it('shows the error code when resuming fails', async () => {
      mockGetPhase.mockResolvedValue('authorizing');
      mockResume.mockRejectedValueOnce(new Error('resume failed'));
      mockGetMfaRecoveryErrorCode.mockReturnValue('incomplete_mutation');
      const { findByTestId, findByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(await findByTestId(RESUME_BUTTON_TEST_ID));

      expect(
        await findByText(
          'Recovery test failed: incomplete_mutation (resume failed)',
        ),
      ).toBeOnTheScreen();
    });

    it('clears a stale pending operation', async () => {
      const { getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(RESET_PENDING_BUTTON_TEST_ID));

      await waitFor(() => {
        expect(mockClearPendingOperationForDev).toHaveBeenCalledWith(
          Engine.context.MfaRecoveryController,
        );
      });
    });
  });

  describe('passwordless full retrieval and local password', () => {
    const SUCCESSFUL_RETRIEVAL = {
      expectedSrpCount: 2,
      recoveredSrpCount: 2,
      matchedSrpCount: 2,
      allSrpsRecovered: true,
    };

    const runFullRetrieval = async (
      getByTestId: GetByTestId,
      identifierType = 'siwe',
    ) => {
      fireEvent.press(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID) as never);
      fireEvent.press(
        getByTestId(
          `${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-${identifierType}`,
        ) as never,
      );
      await waitFor(() => {
        expect(mockRunMfaRecoveryFullRetrieval).toHaveBeenCalledTimes(1);
      });
    };

    const setLocalPassword = async (getByTestId: GetByTestId) => {
      await waitFor(() => {
        expect(
          getByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID),
        ).not.toBeDisabled();
      });
      fireEvent.press(getByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID) as never);
      fireEvent.changeText(
        getByTestId(PASSWORD_PROMPT_INPUT_TEST_ID) as never,
        'local-pw',
      );
      fireEvent.press(getByTestId(PASSWORD_PROMPT_CONFIRM_TEST_ID) as never);
    };

    it('runs the full retrieval without a password and shows the SRP check', async () => {
      mockRunMfaRecoveryFullRetrieval.mockResolvedValue(SUCCESSFUL_RETRIEVAL);
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      expect(queryByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID)).toBeNull();
      await runFullRetrieval(getByTestId);

      const [dependencies] = mockRunMfaRecoveryFullRetrieval.mock.calls[0];
      expect(dependencies).toStrictEqual({
        seedless: Engine.context.SeedlessOnboardingController,
        identifierType: 'siwe',
      });
      await waitFor(() => {
        expect(
          getByText(
            'Full retrieval finished: SRPs before 2, recovered 2, matched 2; all recovered: yes.',
          ),
        ).toBeOnTheScreen();
      });
    });

    it('continues the retrieval with passkey when the user picks passkey', async () => {
      mockRunMfaRecoveryFullRetrieval.mockResolvedValue(SUCCESSFUL_RETRIEVAL);
      const { getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      await runFullRetrieval(getByTestId, 'passkey');

      expect(mockRunMfaRecoveryFullRetrieval.mock.calls[0][0]).toMatchObject({
        identifierType: 'passkey',
      });
    });

    it('runs nothing before the user picks an identifier', () => {
      const { getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID) as never);

      expect(
        getByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-siwe`),
      ).toBeOnTheScreen();
      expect(mockRunMfaRecoveryFullRetrieval).not.toHaveBeenCalled();
    });

    it('keeps the passkey row disabled when Cubist has no passkey', async () => {
      mockGetIdentifiers.mockResolvedValue({
        identifiers: [
          { type: 'siwe', namespace: 'metamask.io:1', value: '0xabc' },
        ],
        epoch: 1,
        authIdentifiers: [],
      });
      const { getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await waitFor(() => {
        expect(mockGetIdentifiers).toHaveBeenCalled();
      });

      fireEvent.press(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID) as never);

      await waitFor(() => {
        expect(
          getByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-passkey`),
        ).toBeDisabled();
      });
      expect(
        getByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-siwe`),
      ).not.toBeDisabled();
    });

    it('hides the password buttons when the retrieval fails', async () => {
      mockRunMfaRecoveryFullRetrieval.mockRejectedValue(new Error('failed'));
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      await runFullRetrieval(getByTestId);

      await waitFor(() => {
        expect(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID)).not.toBeDisabled();
      });
      expect(queryByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID)).toBeNull();
    });

    it('shows set and reset password buttons after a successful retrieval', async () => {
      mockRunMfaRecoveryFullRetrieval.mockResolvedValue(SUCCESSFUL_RETRIEVAL);
      const { getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      await runFullRetrieval(getByTestId);

      await waitFor(() => {
        expect(
          getByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID),
        ).not.toBeDisabled();
      });
      expect(getByTestId(RESET_PASSWORD_BUTTON_TEST_ID)).toBeDisabled();
    });

    it('sets the local password from the prompt and then enables reset', async () => {
      mockRunMfaRecoveryFullRetrieval.mockResolvedValue(SUCCESSFUL_RETRIEVAL);
      mockSetLocalPassword.mockResolvedValue(undefined);
      const { getByTestId, getByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await runFullRetrieval(getByTestId);

      await setLocalPassword(getByTestId);

      await waitFor(() => {
        expect(mockSetLocalPassword).toHaveBeenCalledWith({
          password: 'local-pw',
        });
        expect(
          getByText(
            'Local password set; the recovered vault is now on this device.',
          ),
        ).toBeOnTheScreen();
        expect(getByTestId(RESET_PASSWORD_BUTTON_TEST_ID)).not.toBeDisabled();
      });
      expect(getByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID)).toBeDisabled();
    });

    it('resets the global password after the local password is set', async () => {
      mockRunMfaRecoveryFullRetrieval.mockResolvedValue(SUCCESSFUL_RETRIEVAL);
      mockSetLocalPassword.mockResolvedValue(undefined);
      mockResetPasswordWithVaultKeys.mockResolvedValue(undefined);
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await runFullRetrieval(getByTestId);
      await setLocalPassword(getByTestId);
      await waitFor(() => {
        expect(getByTestId(RESET_PASSWORD_BUTTON_TEST_ID)).not.toBeDisabled();
      });

      fireEvent.press(getByTestId(RESET_PASSWORD_BUTTON_TEST_ID) as never);
      fireEvent.changeText(
        getByTestId(PASSWORD_PROMPT_INPUT_TEST_ID) as never,
        'global-pw',
      );
      fireEvent.press(getByTestId(PASSWORD_PROMPT_CONFIRM_TEST_ID) as never);

      await waitFor(() => {
        expect(mockResetPasswordWithVaultKeys).toHaveBeenCalledWith({
          newPassword: 'global-pw',
        });
        expect(getByText('Global password reset.')).toBeOnTheScreen();
        expect(queryByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID)).toBeNull();
      });
    });

    it('shows the error code when setting the local password fails', async () => {
      mockRunMfaRecoveryFullRetrieval.mockResolvedValue(SUCCESSFUL_RETRIEVAL);
      mockSetLocalPassword.mockRejectedValueOnce(new Error('no recovery'));
      mockGetMfaRecoveryErrorCode.mockReturnValue('recovery_required');
      const { getByTestId, getByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await runFullRetrieval(getByTestId);

      await setLocalPassword(getByTestId);

      await waitFor(() => {
        expect(
          getByText(/Recovery test failed: recovery_required/),
        ).toBeOnTheScreen();
      });
      expect(getByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID)).not.toBeDisabled();
    });
  });

  describe('social login link', () => {
    it('shows that the social login is linked when the exchanged profile matches this wallet', async () => {
      mockExchangeSocialAccessToken.mockResolvedValue({
        profile: { canonicalProfileId: 'profile-1' },
      });
      mockRefreshCanonicalProfileId.mockResolvedValue('profile-1');
      const { getByTestId, findByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(CHECK_SOCIAL_LINK_BUTTON_TEST_ID));

      expect(
        await findByText('Social login link: linked_to_this_profile'),
      ).toBeOnTheScreen();
    });

    it('shows that the social login is linked to another profile', async () => {
      mockExchangeSocialAccessToken.mockResolvedValue({
        profile: { canonicalProfileId: 'profile-2' },
      });
      mockRefreshCanonicalProfileId.mockResolvedValue('profile-1');
      const { getByTestId, findByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(CHECK_SOCIAL_LINK_BUTTON_TEST_ID));

      expect(
        await findByText('Social login link: linked_to_other_profile'),
      ).toBeOnTheScreen();
    });

    it('shows that the social login is not linked when Auth reports it unpaired', async () => {
      const notPairedError = new Error('not paired');
      notPairedError.name = 'SocialIdentifierNotPairedError';
      mockExchangeSocialAccessToken.mockRejectedValue(notPairedError);
      mockRefreshCanonicalProfileId.mockResolvedValue('profile-1');
      const { getByTestId, findByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(CHECK_SOCIAL_LINK_BUTTON_TEST_ID));

      expect(
        await findByText('Social login link: not_linked'),
      ).toBeOnTheScreen();
    });

    it('redacts emails from a failed link check', async () => {
      mockExchangeSocialAccessToken.mockRejectedValue(
        new Error('rejected user@example.com'),
      );
      mockRefreshCanonicalProfileId.mockResolvedValue('profile-1');
      const { getByTestId, findByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(CHECK_SOCIAL_LINK_BUTTON_TEST_ID));

      expect(
        await findByText(
          'Social login link: check_failed (Error: rejected <email>)',
        ),
      ).toBeOnTheScreen();
    });

    it('links the social login with the verified aal:2 token', async () => {
      mockLinkSocialLogin.mockResolvedValue(undefined);
      const { getByTestId, findByText, findByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(LINK_SOCIAL_LOGIN_BUTTON_TEST_ID));
      fireEvent.changeText(
        await findByTestId(SOCIAL_LINK_EMAIL_TEST_IDS.INPUT),
        'dev@example.com',
      );
      fireEvent.press(getByTestId(SOCIAL_LINK_EMAIL_TEST_IDS.CONFIRM));

      expect(await findByText('Link social login: linked')).toBeOnTheScreen();
      expect(mockVerifyOrEnroll).toHaveBeenCalledWith(
        expect.objectContaining({
          methods: ['passkey', 'totp'],
          verifyWith: ['passkey', 'totp'],
        }),
      );
      const dependencies = mockLinkSocialLogin.mock.calls[0][0] as {
        env: string;
        seedlessState: unknown;
        getVerifiedAccessToken: () => string | undefined;
        verifierId?: string;
      };
      expect(dependencies.verifierId).toBe('dev@example.com');
      expect(dependencies.env).toBe('test-env');
      expect(dependencies.seedlessState).toBe(
        Engine.context.SeedlessOnboardingController.state,
      );
      expect(dependencies.getVerifiedAccessToken()).toBe('aal2-access-token');
    });

    it('shows the link failure code and detail', async () => {
      mockLinkSocialLogin.mockRejectedValue(
        new LinkSocialLoginError('social_link_http_400', 'bad request'),
      );
      const { getByTestId, findByText, findByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(LINK_SOCIAL_LOGIN_BUTTON_TEST_ID));
      fireEvent.changeText(
        await findByTestId(SOCIAL_LINK_EMAIL_TEST_IDS.INPUT),
        'dev@example.com',
      );
      fireEvent.press(getByTestId(SOCIAL_LINK_EMAIL_TEST_IDS.CONFIRM));

      expect(
        await findByText(
          'Link social login: failed (social_link_http_400: bad request)',
        ),
      ).toBeOnTheScreen();
    });

    it('does not link when the verification fails', async () => {
      mockVerifyOrEnroll.mockRejectedValueOnce(new Error('cancelled'));
      mockGetMfaRecoveryErrorCode.mockReturnValue('flow_cancelled');
      const { getByTestId, findByText, findByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(LINK_SOCIAL_LOGIN_BUTTON_TEST_ID));
      fireEvent.changeText(
        await findByTestId(SOCIAL_LINK_EMAIL_TEST_IDS.INPUT),
        'dev@example.com',
      );
      fireEvent.press(getByTestId(SOCIAL_LINK_EMAIL_TEST_IDS.CONFIRM));

      expect(
        await findByText('Link social login: failed (flow_cancelled)'),
      ).toBeOnTheScreen();
      expect(mockLinkSocialLogin).not.toHaveBeenCalled();
    });
  });

  describe('Cubist identifiers', () => {
    const SIWE = {
      type: 'siwe',
      namespace: 'metamask.io:1',
      value: '0xabc',
    };
    const PASSKEY = {
      type: 'passkey',
      namespace: 'auth.example',
      value: 'credential',
    };
    const SOCIAL = {
      type: 'social',
      namespace: 'https://accounts.google.com',
      value: 'google-user',
    };

    it('names the missing identifier type on the add button', async () => {
      mockGetIdentifiers.mockResolvedValue({
        identifiers: [SIWE, SOCIAL],
        epoch: 2,
        authIdentifiers: [PASSKEY],
      });
      const { findByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      expect(
        await findByText('Add Cubist identifier: passkey'),
      ).toBeOnTheScreen();
    });

    it('shows that Cubist is unavailable when the identifiers cannot be read', async () => {
      const { findByText, getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      expect(
        await findByText('Add Cubist identifier (Cubist unavailable)'),
      ).toBeOnTheScreen();
      expect(getByTestId(ADD_CUBIST_IDENTIFIER_BUTTON_TEST_ID)).toBeDisabled();
      expect(
        getByTestId(REMOVE_CUBIST_IDENTIFIER_BUTTON_TEST_ID),
      ).toBeDisabled();
    });

    it('disables the add button once every identifier type is enrolled', async () => {
      mockGetIdentifiers.mockResolvedValue({
        identifiers: [SIWE, PASSKEY, SOCIAL],
        epoch: 2,
        authIdentifiers: [PASSKEY],
      });
      const { findByText, getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      expect(
        await findByText('Add Cubist identifier (all added)'),
      ).toBeOnTheScreen();
      expect(getByTestId(ADD_CUBIST_IDENTIFIER_BUTTON_TEST_ID)).toBeDisabled();
    });

    it('adds the missing identifier and shows the new epoch', async () => {
      mockGetIdentifiers.mockResolvedValue({
        identifiers: [SIWE, SOCIAL],
        epoch: 2,
        authIdentifiers: [PASSKEY],
      });
      mockRunAddCubistIdentifier.mockResolvedValue({
        identifierType: 'passkey',
        change: 'added',
        epoch: 3,
      });
      const { findByText, getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await findByText('Add Cubist identifier: passkey');

      fireEvent.press(getByTestId(ADD_CUBIST_IDENTIFIER_BUTTON_TEST_ID));

      expect(
        await findByText('Added passkey to Cubist (epoch 3).'),
      ).toBeOnTheScreen();
      expect(mockRunAddCubistIdentifier).toHaveBeenCalledWith(
        expect.anything(),
        PASSKEY,
      );
    });

    it('lists the enrolled identifiers in a sheet and removes the pressed one', async () => {
      mockGetIdentifiers.mockResolvedValue({
        identifiers: [SIWE, PASSKEY, SOCIAL],
        epoch: 2,
        authIdentifiers: [PASSKEY],
      });
      mockRunRemoveCubistIdentifier.mockResolvedValue({
        identifierType: 'social',
        change: 'removed',
        epoch: 3,
      });
      const { getByText, getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await waitFor(() => {
        expect(
          getByTestId(REMOVE_CUBIST_IDENTIFIER_BUTTON_TEST_ID),
        ).not.toBeDisabled();
      });

      fireEvent.press(getByTestId(REMOVE_CUBIST_IDENTIFIER_BUTTON_TEST_ID));
      fireEvent.press(getByTestId(`${CUBIST_IDENTIFIER_ROW_TEST_ID}-social`));

      await waitFor(() => {
        expect(mockRunRemoveCubistIdentifier).toHaveBeenCalledWith(
          expect.anything(),
          SOCIAL,
        );
        expect(
          getByText('Removed social from Cubist (epoch 3).'),
        ).toBeOnTheScreen();
      });
    });

    it('disables removal when Cubist holds only the minimum identifiers', async () => {
      mockGetIdentifiers.mockResolvedValue({
        identifiers: [SIWE, SOCIAL],
        epoch: 2,
        authIdentifiers: [],
      });
      const { getByText, getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await waitFor(() => {
        expect(
          getByTestId(REMOVE_CUBIST_IDENTIFIER_BUTTON_TEST_ID),
        ).not.toBeDisabled();
      });

      fireEvent.press(getByTestId(REMOVE_CUBIST_IDENTIFIER_BUTTON_TEST_ID));

      expect(
        getByText(
          'Cubist keeps at least 2 identifiers, so none can be removed.',
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${CUBIST_IDENTIFIER_ROW_TEST_ID}-siwe`),
      ).toBeDisabled();
    });
  });
});

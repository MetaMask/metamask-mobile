import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { isMfaRecoveryConfigured } from '../../../../../core/Engine/controllers/mfa-recovery-controller';
import { TOPRF_AAL2_AUDIENCE } from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import MfaRecoveryDeveloperOptionsSection from './MfaRecoveryDeveloperOptionsSection';

const mockRunMfaRecoveryCubistTest = jest.fn();
const mockRunMfaRecoveryCubistRecover = jest.fn();
const mockRunMfaRecoverySetup = jest.fn();
const mockRunToprfRecoverySecretTest = jest.fn();
const mockVerifyOrEnroll = jest.fn();
const mockRequestMfaApproval = jest.fn();
const mockGetMfaRecoveryErrorCode = jest.fn();
const mockExchangeSocialAccessToken = jest.fn();
const mockRefreshCanonicalProfileId = jest.fn();
const mockLinkSocialLogin = jest.fn();
const mockGetIdentifiers = jest.fn();
const mockSetLocalPassword = jest.fn();
const mockResetPasswordWithVaultKeys = jest.fn();
const mockRunAddCubistIdentifier = jest.fn();
const mockRunRemoveCubistIdentifier = jest.fn();

jest.mock('./manageCubistIdentifiers', () => ({
  ...jest.requireActual('./manageCubistIdentifiers'),
  runAddCubistIdentifier: (dependencies: unknown, onStep: unknown) =>
    mockRunAddCubistIdentifier(dependencies, onStep),
  runRemoveCubistIdentifier: (
    dependencies: unknown,
    identifier: unknown,
    onStep: unknown,
  ) => mockRunRemoveCubistIdentifier(dependencies, identifier, onStep),
}));

jest.mock('./linkSocialLogin', () => ({
  linkSocialLogin: (dependencies: unknown) => mockLinkSocialLogin(dependencies),
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
      },
      SeedlessOnboardingController: {
        state: { authConnection: 'google', userId: 'google-user' },
        setLocalPassword: (args: unknown) => mockSetLocalPassword(args),
        resetPasswordWithVaultKeys: (args: unknown) =>
          mockResetPasswordWithVaultKeys(args),
      },
    },
  },
}));

jest.mock(
  '../../../../../core/Engine/controllers/mfa-recovery-controller',
  () => ({
    getMfaRecoveryIdentifierRouter: jest.fn(() => ({})),
    isMfaRecoveryConfigured: jest.fn(() => true),
  }),
);

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

jest.mock('./runMfaRecoverySetup', () => ({
  runMfaRecoverySetup: (
    dependencies: unknown,
    onStep: (step: string) => void,
    combination: string,
  ) => mockRunMfaRecoverySetup(dependencies, onStep, combination),
}));

jest.mock('./runToprfRecoverySecretTest', () => ({
  runToprfRecoverySecretTest: (
    dependencies: unknown,
    onStep: (step: string) => void,
  ) => mockRunToprfRecoverySecretTest(dependencies, onStep),
}));

const mockRunMfaRecoveryFullRetrieval = jest.fn();
const mockLoginForRecovery = jest.fn();
const mockAuthenticateSeedlessForRecovery = jest.fn();

jest.mock('../../../../../core/OAuthService/OAuthService', () => ({
  __esModule: true,
  default: {
    loginForRecovery: () => mockLoginForRecovery(),
    authenticateSeedlessForRecovery: (login: unknown) =>
      mockAuthenticateSeedlessForRecovery(login),
  },
}));

const SOCIAL_LOGIN = {
  authConnection: 'google',
  clientId: 'client-id',
  data: {},
  userId: 'google-user',
};

jest.mock('./runMfaRecoveryFullRetrieval', () => ({
  runMfaRecoveryFullRetrieval: (
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

async function pressRunButton(getByTestId: (testId: string) => unknown) {
  await waitFor(() => {
    expect(getByTestId(RUN_BUTTON_TEST_ID)).not.toBeDisabled();
  });
  fireEvent.press(getByTestId(RUN_BUTTON_TEST_ID) as never);
}

async function chooseRecoverOption(
  getByTestId: (testId: string) => unknown,
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
  getByTestId: (testId: string) => unknown,
  combination = 'siwe_passkey',
) {
  await waitFor(() => {
    expect(getByTestId(SETUP_BUTTON_TEST_ID)).not.toBeDisabled();
  });
  fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID) as never);
  fireEvent.press(
    getByTestId(`${SETUP_OPTION_TEST_ID_PREFIX}-${combination}`) as never,
  );
}
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
    mockRunMfaRecoveryCubistTest.mockResolvedValue({
      ensureUserStatus: 'created',
      epoch: 1,
      matches: true,
    });
    mockRunMfaRecoveryCubistRecover.mockResolvedValue({
      epoch: 1,
      matches: undefined,
      fingerprint: 'deadbeef',
    });
    mockRunMfaRecoverySetup.mockResolvedValue({
      before: 'NotEnabled',
      after: 'Enabled',
    });
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
  });

  afterEach(() => {
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(true);
  });

  it('renders the recovery test controls', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    expect(getByText('MFA recovery')).toBeOnTheScreen();
    expect(getByTestId(RUN_BUTTON_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(RECOVER_BUTTON_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(SETUP_BUTTON_TEST_ID)).toBeOnTheScreen();
  });

  it.each([
    ['siwe_passkey', 'Set up recovery: SIWE + passkey'],
    ['siwe_social', 'Set up recovery: SIWE + social'],
    ['passkey_social', 'Set up recovery: passkey + social'],
  ])(
    'runs recovery setup with the %s identifiers',
    async (combination, label) => {
      const { getByTestId, getByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await waitFor(() => {
        expect(getByTestId(SETUP_BUTTON_TEST_ID)).not.toBeDisabled();
      });
      fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID));
      expect(getByText(label)).toBeOnTheScreen();

      fireEvent.press(
        getByTestId(`${SETUP_OPTION_TEST_ID_PREFIX}-${combination}`),
      );

      await waitFor(() => {
        expect(mockRunMfaRecoverySetup).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Function),
          combination,
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

  it('runs recovery setup and displays the status before and after', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await chooseSetupOption(getByTestId);

    await waitFor(() => {
      expect(mockRunMfaRecoverySetup).toHaveBeenCalledTimes(1);
      expect(
        getByText(
          'Recovery set up (status before: NotEnabled, after: Enabled).',
        ),
      ).toBeOnTheScreen();
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
    const [dependencies] = mockRunMfaRecoverySetup.mock.calls[0];
    expect(dependencies.seedless).toBe(
      Engine.context.SeedlessOnboardingController,
    );
    await dependencies.verifyMfa();
    expect(mockVerifyOrEnroll).toHaveBeenCalledTimes(1);
    expect(mockRequestMfaApproval).not.toHaveBeenCalled();

    await expect(dependencies.mintAal2Token()).resolves.toBe('aal2-token');
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
      expect(getByText(/Recovery test passed/)).toBeOnTheScreen();
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
      expect(
        getByTestId(RUN_BUTTON_TEST_ID).props.accessibilityState?.disabled,
      ).toBe(true);
      expect(
        getByTestId(RECOVER_BUTTON_TEST_ID).props.accessibilityState?.disabled,
      ).toBe(true);
    });
  });

  it('mints the TOPRF aal2 token as an MFA approval after an authenticator app verification', async () => {
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(TOPRF_TEST_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockRunToprfRecoverySecretTest).toHaveBeenCalledTimes(1);
    });
    const [dependencies] = mockRunToprfRecoverySecretTest.mock.calls[0];
    await expect(dependencies.mintAal2Token()).resolves.toBe('aal2-token');
    expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
      methods: ['totp'],
      verifyWith: 'totp',
      reason: { operation: 'mfaRecovery.devOptions' },
    });
    expect(mockRequestMfaApproval).toHaveBeenCalledWith({
      requestHash: expect.stringMatching(/^0x[0-9a-f]{64}$/u),
      audiences: [TOPRF_AAL2_AUDIENCE],
      requireVerification: true,
      includeIdentifiers: false,
      reason: { operation: 'mfaRecovery.devOptions' },
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

  describe('passwordless full retrieval and local password', () => {
    const SUCCESSFUL_RETRIEVAL = {
      expectedSrpCount: 2,
      recoveredSrpCount: 2,
      matchedSrpCount: 2,
      allSrpsRecovered: true,
    };

    beforeEach(() => {
      mockLoginForRecovery.mockResolvedValue(SOCIAL_LOGIN);
      mockAuthenticateSeedlessForRecovery.mockResolvedValue(undefined);
    });

    // Social login first, then the sheet picks SIWE or passkey to run the retrieval.
    const runFullRetrieval = async (
      getByTestId: (id: string) => unknown,
      identifierType = 'siwe',
    ) => {
      fireEvent.press(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID) as never);
      await waitFor(() => {
        expect(
          getByTestId(
            `${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-${identifierType}`,
          ),
        ).toBeTruthy();
      });
      fireEvent.press(
        getByTestId(
          `${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-${identifierType}`,
        ) as never,
      );
      await waitFor(() => {
        expect(mockRunMfaRecoveryFullRetrieval).toHaveBeenCalledTimes(1);
      });
    };

    it('runs the full retrieval without a password and shows the SRP check', async () => {
      mockRunMfaRecoveryFullRetrieval.mockResolvedValue(SUCCESSFUL_RETRIEVAL);
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      expect(queryByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID)).toBeNull();
      await runFullRetrieval(getByTestId);

      expect(mockLoginForRecovery).toHaveBeenCalledTimes(1);
      expect(mockRunMfaRecoveryFullRetrieval.mock.calls[0][0]).toMatchObject({
        identifierType: 'siwe',
      });
      expect(
        mockRunMfaRecoveryFullRetrieval.mock.calls[0][0],
      ).not.toHaveProperty('password');
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

    it('runs nothing before the user picks an identifier', async () => {
      const { getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID) as never);
      await waitFor(() => {
        expect(mockLoginForRecovery).toHaveBeenCalledTimes(1);
      });

      expect(mockRunMfaRecoveryFullRetrieval).not.toHaveBeenCalled();
    });

    it('does not open the sheet when the social login fails', async () => {
      mockLoginForRecovery.mockRejectedValueOnce(new Error('cancelled'));
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      fireEvent.press(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID) as never);
      await waitFor(() => {
        expect(mockLoginForRecovery).toHaveBeenCalledTimes(1);
      });

      expect(
        queryByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-siwe`),
      ).toBeNull();
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
        expect(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID)).not.toBeDisabled();
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
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await runFullRetrieval(getByTestId);
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

      await waitFor(() => {
        expect(
          getByText(/Recovery test failed: recovery_required/),
        ).toBeOnTheScreen();
      });
      expect(getByTestId(SET_LOCAL_PASSWORD_BUTTON_TEST_ID)).not.toBeDisabled();
    });
  });

  it('shows that the social login is linked when the exchanged profile matches this wallet', async () => {
    mockExchangeSocialAccessToken.mockResolvedValue({
      profile: { canonicalProfileId: 'profile-1' },
    });
    mockRefreshCanonicalProfileId.mockResolvedValue('profile-1');
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(CHECK_SOCIAL_LINK_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(
        getByText('Social login link: linked_to_this_profile'),
      ).toBeOnTheScreen();
    });
  });

  it('links the social login and displays the paired identifier types', async () => {
    mockLinkSocialLogin.mockResolvedValue({
      status: 'linked',
      httpStatus: 200,
      pairedIdentifierTypes: ['SRP', 'GOOGLE'],
    });
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(LINK_SOCIAL_LOGIN_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(
        getByText('Link social login: linked 200 SRP,GOOGLE'),
      ).toBeOnTheScreen();
    });
  });

  it('links the social login with the aal:2 token from an authenticator app verification', async () => {
    mockLinkSocialLogin.mockResolvedValue({ status: 'linked' });
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(LINK_SOCIAL_LOGIN_BUTTON_TEST_ID));

    await waitFor(() => expect(mockLinkSocialLogin).toHaveBeenCalled());
    expect(mockVerifyOrEnroll).toHaveBeenCalledWith(
      expect.objectContaining({ methods: ['totp'], verifyWith: 'totp' }),
    );
    const { getBearerToken } = mockLinkSocialLogin.mock.calls[0][0] as {
      getBearerToken: () => Promise<string>;
    };
    expect(await getBearerToken()).toBe('aal2-access-token');
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
      const { getByText } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      await waitFor(() => {
        expect(getByText('Add Cubist identifier: passkey')).toBeOnTheScreen();
      });
    });

    it('disables the add button once every identifier type is enrolled', async () => {
      mockGetIdentifiers.mockResolvedValue({
        identifiers: [SIWE, PASSKEY, SOCIAL],
        epoch: 2,
        authIdentifiers: [PASSKEY],
      });
      const { getByText, getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );

      await waitFor(() => {
        expect(
          getByText('Add Cubist identifier (all added)'),
        ).toBeOnTheScreen();
      });
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
      const { getByText, getByTestId } = renderWithProvider(
        <MfaRecoveryDeveloperOptionsSection />,
      );
      await waitFor(() => {
        expect(getByText('Add Cubist identifier: passkey')).toBeOnTheScreen();
      });

      fireEvent.press(getByTestId(ADD_CUBIST_IDENTIFIER_BUTTON_TEST_ID));

      await waitFor(() => {
        expect(
          getByText('Added passkey to Cubist (epoch 3).'),
        ).toBeOnTheScreen();
      });
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
          expect.any(Function),
        );
        expect(
          getByText('Removed social from Cubist (epoch 3).'),
        ).toBeOnTheScreen();
      });
    });
  });

  it('shows that the social login is not linked when Auth reports it unpaired', async () => {
    const notPairedError = new Error('not paired');
    notPairedError.name = 'SocialIdentifierNotPairedError';
    mockExchangeSocialAccessToken.mockRejectedValue(notPairedError);
    mockRefreshCanonicalProfileId.mockResolvedValue('profile-1');
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(CHECK_SOCIAL_LINK_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(getByText('Social login link: not_linked')).toBeOnTheScreen();
    });
  });
});

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { isMfaRecoveryConfigured } from '../../../../../core/Engine/controllers/mfa-recovery-controller/config';
import MfaRecoveryDeveloperOptionsSection, {
  FULL_RETRIEVAL_BUTTON_TEST_ID,
  FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX,
  PASSWORD_PROMPT_SHEET_TEST_ID,
  RECOVER_BUTTON_TEST_ID,
  RECOVER_OPTION_TEST_ID_PREFIX,
  RESET_PASSWORD_BUTTON_TEST_ID,
} from './MfaRecoveryDeveloperOptionsSection';
import {
  PASSWORD_PROMPT_CONFIRM_TEST_ID,
  PASSWORD_PROMPT_INPUT_TEST_ID,
} from './PasswordPromptBottomSheet';

const SOCIAL_IDENTIFIER = { type: 'social', value: 'auth-social' };
const mockService = { kind: 'service' };
const mockGetIdentifiers = jest.fn();
const mockVerifyOrEnroll = jest.fn();
const mockRunCubistRecover = jest.fn();
const mockRunFullRetrieval = jest.fn();
const mockRunResetPassword = jest.fn();
const mockFindSocialIdentifier = jest.fn();
const mockCreateService = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MfaRecoveryController: {
        getIdentifiers: () => mockGetIdentifiers(),
      },
      SeedlessOnboardingController: {
        state: { authConnection: 'google', userId: 'google-user' },
      },
    },
  },
}));

jest.mock(
  '../../../../../core/Engine/controllers/mfa-recovery-controller/config',
  () => ({
    isMfaRecoveryConfigured: jest.fn(() => true),
  }),
);

jest.mock('../../../../../core/MfaRecovery/engineBindings', () => ({
  createMfaRecoveryService: (options: unknown) => mockCreateService(options),
}));

jest.mock('../../../../../core/MfaRecovery/services/recovery-setup', () => ({
  findSocialIdentifier: (...args: unknown[]) =>
    mockFindSocialIdentifier(...args),
}));

jest.mock('../../../../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: jest.fn(() => true),
}));

jest.mock('../../../../../util/identity/mfa/useMfa', () => ({
  useMfa: () => ({
    verifyOrEnroll: (options: unknown) => mockVerifyOrEnroll(options),
  }),
}));

jest.mock('./runMfaRecoveryCubistRecover', () => ({
  getMfaRecoveryErrorCode: (error: unknown) =>
    (error as { code?: string }).code ?? 'unknown',
  runMfaRecoveryCubistRecover: (...args: unknown[]) =>
    mockRunCubistRecover(...args),
}));

jest.mock('./runMfaRecoveryFullRetrieval', () => ({
  runMfaRecoveryFullRetrieval: (...args: unknown[]) =>
    mockRunFullRetrieval(...args),
}));

jest.mock('./runMfaRecoveryPasswords', () => ({
  runResetPassword: (...args: unknown[]) => mockRunResetPassword(...args),
}));

const FULL_RETRIEVAL_RESULT = {
  expectedSrpCount: 2,
  recoveredSrpCount: 2,
  matchedSrpCount: 2,
  allSrpsRecovered: true,
};

type GetByTestId = (testId: string) => Parameters<typeof fireEvent.press>[0];

async function pressWhenEnabled(getByTestId: GetByTestId, testId: string) {
  await waitFor(() => {
    expect(getByTestId(testId)).not.toBeDisabled();
  });
  fireEvent.press(getByTestId(testId));
}

async function submitPassword(getByTestId: GetByTestId, password: string) {
  fireEvent.changeText(getByTestId(PASSWORD_PROMPT_INPUT_TEST_ID), password);
  fireEvent.press(getByTestId(PASSWORD_PROMPT_CONFIRM_TEST_ID));
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
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(true);
    mockCreateService.mockReturnValue(mockService);
    mockVerifyOrEnroll.mockResolvedValue(undefined);
    mockGetIdentifiers.mockResolvedValue({
      identifiers: [{ type: 'siwe' }, { type: 'passkey' }, { type: 'social' }],
      authIdentifiers: [SOCIAL_IDENTIFIER],
      epoch: 1,
    });
    mockFindSocialIdentifier.mockReturnValue(SOCIAL_IDENTIFIER);
    mockRunCubistRecover.mockResolvedValue({
      epoch: 1,
      fingerprint: 'abcd1234',
    });
    mockRunFullRetrieval.mockResolvedValue(FULL_RETRIEVAL_RESULT);
    mockRunResetPassword.mockResolvedValue(undefined);
  });

  it('disables the actions when recovery is not configured', async () => {
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    expect(getByTestId(RECOVER_BUTTON_TEST_ID)).toBeDisabled();
    expect(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID)).toBeDisabled();
    expect(mockGetIdentifiers).not.toHaveBeenCalled();
  });

  it('blocks the actions when nothing is registered in Cubist', async () => {
    mockGetIdentifiers.mockResolvedValue({
      identifiers: [],
      authIdentifiers: [],
      epoch: 0,
    });

    const { getByTestId, findByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await findByText(/not registered in Cubist/u);
    expect(getByTestId(RECOVER_BUTTON_TEST_ID)).toBeDisabled();
    expect(getByTestId(FULL_RETRIEVAL_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('disables a recover option the identifier is not enrolled for', async () => {
    mockGetIdentifiers.mockResolvedValue({
      identifiers: [{ type: 'siwe' }],
      authIdentifiers: [],
      epoch: 1,
    });
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressWhenEnabled(getByTestId, RECOVER_BUTTON_TEST_ID);

    expect(
      getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-passkey`),
    ).toBeDisabled();
    expect(getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-siwe`)).toBeEnabled();
  });

  it('recovers the secret with the chosen identifier and shows the fingerprint', async () => {
    const { getByTestId, findByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressWhenEnabled(getByTestId, RECOVER_BUTTON_TEST_ID);
    fireEvent.press(getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-passkey`));

    await findByText(
      /Recovery succeeded \(epoch: 1, secret fingerprint: abcd1234\)/u,
    );
    expect(mockRunCubistRecover).toHaveBeenCalledWith(
      mockService,
      expect.any(Function),
      'passkey',
      undefined,
    );
  });

  it('passes the approved social identifier for a social read', async () => {
    const { getByTestId, findByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressWhenEnabled(getByTestId, RECOVER_BUTTON_TEST_ID);
    fireEvent.press(getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-social`));

    await findByText(/Recovery succeeded/u);
    expect(mockRunCubistRecover).toHaveBeenCalledWith(
      mockService,
      expect.any(Function),
      'social',
      SOCIAL_IDENTIFIER,
    );
  });

  it('shows the failure code when the recover fails', async () => {
    mockRunCubistRecover.mockRejectedValue(
      Object.assign(new Error('Authentication required'), {
        code: 'aal2_required',
      }),
    );
    const { getByTestId, findByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressWhenEnabled(getByTestId, RECOVER_BUTTON_TEST_ID);
    fireEvent.press(getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-siwe`));

    await findByText(/Recovery test failed: aal2_required/u);
  });

  it('verifies the passkey MFA before running through the service', async () => {
    const { getByTestId, findByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );
    await pressWhenEnabled(getByTestId, RECOVER_BUTTON_TEST_ID);
    fireEvent.press(getByTestId(`${RECOVER_OPTION_TEST_ID_PREFIX}-siwe`));
    await findByText(/Recovery succeeded/u);

    const { verifyMfa } = mockCreateService.mock.calls[0][0] as {
      verifyMfa: () => Promise<void>;
    };
    await verifyMfa();

    expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
      methods: ['passkey'],
      verifyWith: ['passkey'],
      reason: { operation: 'qa.mfaRecoveryDevOptions' },
    });
  });

  it('asks for the local password before running the full retrieval', async () => {
    const { getByTestId, findByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressWhenEnabled(getByTestId, FULL_RETRIEVAL_BUTTON_TEST_ID);
    fireEvent.press(
      getByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-siwe`),
    );

    expect(getByTestId(PASSWORD_PROMPT_SHEET_TEST_ID)).toBeOnTheScreen();
    expect(mockRunFullRetrieval).not.toHaveBeenCalled();

    await submitPassword(getByTestId, 'local-password');

    await findByText(/Full retrieval finished: SRPs before 2, recovered 2/u);
    expect(mockRunFullRetrieval).toHaveBeenCalledWith(
      mockService,
      expect.objectContaining({
        identifierType: 'siwe',
        localPassword: 'local-password',
      }),
      expect.any(Function),
    );
  });

  it('offers only SIWE and passkey for the full retrieval', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressWhenEnabled(getByTestId, FULL_RETRIEVAL_BUTTON_TEST_ID);

    expect(
      getByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-passkey`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-social`),
    ).toBeNull();
  });

  it('hides the reset button until a full retrieval succeeds', async () => {
    const { getByTestId, queryByTestId, findByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );
    expect(queryByTestId(RESET_PASSWORD_BUTTON_TEST_ID)).toBeNull();

    await pressWhenEnabled(getByTestId, FULL_RETRIEVAL_BUTTON_TEST_ID);
    fireEvent.press(
      getByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-siwe`),
    );
    await submitPassword(getByTestId, 'local-password');

    expect(await findByTestId(RESET_PASSWORD_BUTTON_TEST_ID)).toBeOnTheScreen();
  });

  it('keeps the reset button hidden when the full retrieval fails', async () => {
    mockRunFullRetrieval.mockRejectedValue(
      Object.assign(new Error('boom'), { code: 'srp_recovery_failed' }),
    );
    const { getByTestId, queryByTestId, findByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    await pressWhenEnabled(getByTestId, FULL_RETRIEVAL_BUTTON_TEST_ID);
    fireEvent.press(
      getByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-passkey`),
    );
    await submitPassword(getByTestId, 'local-password');

    await findByText(/Recovery test failed: srp_recovery_failed/u);
    expect(queryByTestId(RESET_PASSWORD_BUTTON_TEST_ID)).toBeNull();
  });

  it('resets the global password and hides the reset button afterwards', async () => {
    const { getByTestId, queryByTestId, findByTestId, findByText } =
      renderWithProvider(<MfaRecoveryDeveloperOptionsSection />);
    await pressWhenEnabled(getByTestId, FULL_RETRIEVAL_BUTTON_TEST_ID);
    fireEvent.press(
      getByTestId(`${FULL_RETRIEVAL_OPTION_TEST_ID_PREFIX}-siwe`),
    );
    await submitPassword(getByTestId, 'local-password');
    fireEvent.press(await findByTestId(RESET_PASSWORD_BUTTON_TEST_ID));

    await submitPassword(getByTestId, 'global-password');

    await findByText('Global password reset.');
    expect(mockRunResetPassword).toHaveBeenCalledWith(
      expect.anything(),
      'global-password',
      expect.any(Function),
    );
    expect(queryByTestId(RESET_PASSWORD_BUTTON_TEST_ID)).toBeNull();
  });
});

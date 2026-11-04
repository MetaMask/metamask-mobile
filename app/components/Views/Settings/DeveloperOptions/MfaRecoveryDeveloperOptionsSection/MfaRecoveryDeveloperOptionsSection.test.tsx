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

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        state: { keyrings: [{ accounts: ['0xabc'] }] },
        signPersonalMessage: jest.fn(),
      },
      AuthenticationController: {
        requestMfaApproval: (request: unknown) =>
          mockRequestMfaApproval(request),
      },
      MfaRecoveryController: {},
      SeedlessOnboardingController: {},
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
  ) => mockRunMfaRecoveryCubistRecover(dependencies, onStep),
}));

jest.mock('./runMfaRecoverySetup', () => ({
  runMfaRecoverySetup: (
    dependencies: unknown,
    onStep: (step: string) => void,
  ) => mockRunMfaRecoverySetup(dependencies, onStep),
}));

jest.mock('./runToprfRecoverySecretTest', () => ({
  runToprfRecoverySecretTest: (
    dependencies: unknown,
    onStep: (step: string) => void,
  ) => mockRunToprfRecoverySecretTest(dependencies, onStep),
}));

const RUN_BUTTON_TEST_ID = 'mfa-recovery-dev-run-cubist-test-button';
const RECOVER_BUTTON_TEST_ID = 'mfa-recovery-dev-recover-secret-button';
const SETUP_BUTTON_TEST_ID = 'mfa-recovery-dev-setup-recovery-button';
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
      liveKeyMatches: true,
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

  it('runs recovery setup and displays the status before and after', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockRunMfaRecoverySetup).toHaveBeenCalledTimes(1);
      expect(
        getByText(
          'Recovery set up (status before: NotEnabled, after: Enabled).',
        ),
      ).toBeOnTheScreen();
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
    expect(mockVerifyOrEnroll.mock.invocationCallOrder[0]).toBeLessThan(
      mockRequestMfaApproval.mock.invocationCallOrder[0],
    );
  });

  it('does not request an approval when the verification is cancelled', async () => {
    mockVerifyOrEnroll.mockRejectedValueOnce(new Error('flow_cancelled'));
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(TOPRF_TEST_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockRunToprfRecoverySecretTest).toHaveBeenCalledTimes(1);
    });
    const [dependencies] = mockRunToprfRecoverySecretTest.mock.calls[0];
    await expect(dependencies.mintAal2Token()).rejects.toThrow(
      'flow_cancelled',
    );
    expect(mockRequestMfaApproval).not.toHaveBeenCalled();
  });

  it('gives the recovery setup a separate verification and approval minting step', async () => {
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID));

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

    fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID));

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

    fireEvent.press(getByTestId(RUN_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockRunMfaRecoveryCubistTest).toHaveBeenCalledTimes(1);
      expect(getByText(/Recovery test passed/)).toBeOnTheScreen();
    });
  });

  it('runs getRecoverySecret and displays the recovered secret fingerprint', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(RECOVER_BUTTON_TEST_ID));

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

    fireEvent.press(getByTestId(RECOVER_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(
        getByText(/secret matches last registration: yes/),
      ).toBeOnTheScreen();
    });
  });

  it('disables both recovery buttons while a flow is running', async () => {
    mockRunMfaRecoveryCubistTest.mockReturnValue(new Promise(() => undefined));

    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(RUN_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(
        getByTestId(RUN_BUTTON_TEST_ID).props.accessibilityState?.disabled,
      ).toBe(true);
      expect(
        getByTestId(RECOVER_BUTTON_TEST_ID).props.accessibilityState?.disabled,
      ).toBe(true);
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

    fireEvent.press(getByTestId(RUN_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(
        getByText(
          /Recovery test failed: escrow_request_failed \(escrow failed\)/,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('renders the TOPRF recovery secret test button', () => {
    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    expect(getByTestId(TOPRF_TEST_BUTTON_TEST_ID)).toBeOnTheScreen();
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
          'TOPRF recovery secret test passed (status before: NotEnabled, after: Enabled; share existed: no; live key matches: yes; secret fingerprint: cafebabe).',
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

  it('enables the TOPRF recovery secret test when the controller is not configured', () => {
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    expect(
      getByTestId(TOPRF_TEST_BUTTON_TEST_ID).props.accessibilityState?.disabled,
    ).toBeFalsy();
    expect(
      getByTestId(RUN_BUTTON_TEST_ID).props.accessibilityState?.disabled,
    ).toBe(true);
  });
});

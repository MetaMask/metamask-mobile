import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MfaRecoveryDeveloperOptionsSection from './MfaRecoveryDeveloperOptionsSection';

const mockRunMfaRecoveryCubistTest = jest.fn();
const mockRunMfaRecoveryCubistRecover = jest.fn();
const mockGetMfaRecoveryErrorCode = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        state: { keyrings: [{ accounts: ['0xabc'] }] },
        signPersonalMessage: jest.fn(),
      },
    },
  },
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

const RUN_BUTTON_TEST_ID = 'mfa-recovery-dev-run-cubist-test-button';
const RECOVER_BUTTON_TEST_ID = 'mfa-recovery-dev-recover-secret-button';

describe('MfaRecoveryDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    mockGetMfaRecoveryErrorCode.mockReturnValue('unknown_error');
  });

  it('renders the recovery test controls', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    expect(getByText('MFA recovery')).toBeOnTheScreen();
    expect(getByTestId(RUN_BUTTON_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(RECOVER_BUTTON_TEST_ID)).toBeOnTheScreen();
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
});

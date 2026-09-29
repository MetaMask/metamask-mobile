import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MfaRecoveryDeveloperOptionsSection from './MfaRecoveryDeveloperOptionsSection';

const mockRunMfaRecoveryCubistTest = jest.fn();
const mockGetMfaRecoveryErrorCode = jest.fn();

jest.mock('./runMfaRecoveryCubistTest', () => ({
  getMfaRecoveryErrorCode: (error: unknown) =>
    mockGetMfaRecoveryErrorCode(error),
  runMfaRecoveryCubistTest: (onStep: (step: string) => void) =>
    mockRunMfaRecoveryCubistTest(onStep),
}));

const RUN_BUTTON_TEST_ID = 'mfa-recovery-dev-run-cubist-test-button';

describe('MfaRecoveryDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunMfaRecoveryCubistTest.mockResolvedValue({
      ensureUserStatus: 'created',
      epoch: 1,
      matches: true,
    });
    mockGetMfaRecoveryErrorCode.mockReturnValue('unknown_error');
  });

  it('renders the recovery test controls', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MfaRecoveryDeveloperOptionsSection />,
    );

    expect(getByText('MFA recovery')).toBeOnTheScreen();
    expect(getByTestId(RUN_BUTTON_TEST_ID)).toBeOnTheScreen();
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
        getByText(/Recovery test failed: escrow_request_failed/),
      ).toBeOnTheScreen();
    });
  });
});

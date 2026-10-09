import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MfaFlowError } from '../../../../util/identity/mfa/engine/errors';
import { startMfaFlow } from '../../../../util/identity/mfa/engine/activeFlow';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { MfaSettingsSelectorsIDs } from '../Mfa.testIds';
import MfaSettings from './MfaSettings';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../../../../util/identity/mfa/engine/activeFlow', () => ({
  startMfaFlow: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa/bindings', () => ({
  mobileMfaControllerAdapter: {
    refreshEnrolledCredentials: jest.fn(),
    clearVerificationSession: jest.fn(),
  },
}));

const mockStartMfaFlow = jest.mocked(startMfaFlow);
const mockAdapter = jest.mocked(mobileMfaControllerAdapter);

const renderSettings = (enrolledCredentials: EnrolledCredential[] = []) =>
  renderWithProvider(<MfaSettings />, {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          AuthenticationController: {
            ...backgroundState.AuthenticationController,
            enrolledCredentials,
          },
        },
      },
    },
  });

describe('MfaSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter.refreshEnrolledCredentials.mockResolvedValue([]);
    mockStartMfaFlow.mockResolvedValue({ credentials: [] });
  });

  it('refreshes the methods and offers to set up email', async () => {
    const { getByTestId } = renderSettings();
    await act(async () => undefined);

    expect(mockAdapter.refreshEnrolledCredentials).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.EMAIL_BUTTON));
    });
    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: { kind: 'enroll', method: 'email_otp' },
        reason: { operation: 'settings.addEmail' },
      }),
    );
  });

  it('offers to finish a pending email setup', () => {
    const { getByText } = renderSettings([
      {
        type: 'email_otp',
        status: 'pending',
        email: 'a@b.co',
        verified: false,
      },
    ]);

    expect(getByText('Setup not finished')).toBeOnTheScreen();
    expect(getByText('Finish setup')).toBeOnTheScreen();
  });

  it('shows an active email without a setup button', () => {
    const { getByText, queryByTestId } = renderSettings([
      { type: 'email_otp', status: 'active', email: 'a@b.co', verified: true },
    ]);

    expect(getByText('a@b.co')).toBeOnTheScreen();
    expect(queryByTestId(MfaSettingsSelectorsIDs.EMAIL_BUTTON)).toBeNull();
  });

  it('shows how a QA preset settled', async () => {
    mockStartMfaFlow.mockRejectedValue(new MfaFlowError('flow_cancelled'));
    const { getByText, getByTestId } = renderSettings();

    await act(async () => {
      fireEvent.press(getByText('Verify with email'));
    });

    expect(getByTestId(MfaSettingsSelectorsIDs.QA_RESULT)).toHaveTextContent(
      'Verify with email: Rejected with flow_cancelled',
    );
  });

  it('clears the verification session from QA', async () => {
    const { getByText } = renderSettings();

    await act(async () => {
      fireEvent.press(getByText('Clear verification session'));
    });

    expect(mockAdapter.clearVerificationSession).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Verify with email, max 30s old', 'qa.verifyEmailFresh'],
    ['Require email, no verification', 'qa.requireEmail'],
    ['Enroll email', 'qa.enrollEmail'],
    ['Email and passkey (no passkey adapter yet)', 'qa.emailAndPasskey'],
  ])('starts the "%s" QA preset', async (label, operation) => {
    const { getByText } = renderSettings();

    await act(async () => {
      fireEvent.press(getByText(label));
    });

    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: expect.objectContaining({ operation }),
      }),
    );
  });

  it('describes the token a QA preset resolved with', async () => {
    mockStartMfaFlow.mockResolvedValue({
      credentials: [],
      token: {
        accessToken: 'token',
        expiresIn: 3600,
        obtainedAt: 0,
        claims: { sub: 'profile', amr: ['email_otp'], exp: 0 },
      },
    });
    const { getByText, getByTestId } = renderSettings();

    await act(async () => {
      fireEvent.press(getByText('Verify with email'));
    });

    expect(getByTestId(MfaSettingsSelectorsIDs.QA_RESULT)).toHaveTextContent(
      /token amr=email_otp/,
    );
  });

  it('stays usable when refreshing or setting up email fails', async () => {
    mockAdapter.refreshEnrolledCredentials.mockRejectedValue(new Error('down'));
    mockStartMfaFlow.mockRejectedValue(new MfaFlowError('flow_cancelled'));
    const { getByTestId } = renderSettings();

    await act(async () => {
      fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.EMAIL_BUTTON));
    });

    expect(getByTestId(MfaSettingsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });
});

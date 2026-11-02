import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MfaFlowError } from '../../../../util/identity/mfa/engine/errors';
import { startMfaFlow } from '../../../../util/identity/mfa/engine/activeFlow';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import Routes from '../../../../constants/navigation/Routes';
import { MfaSettingsSelectorsIDs } from '../Mfa.testIds';
import MfaSettings from './MfaSettings';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }),
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

  it('refreshes the methods and offers to add email', async () => {
    const { getByTestId } = renderSettings();
    await act(async () => undefined);

    expect(mockAdapter.refreshEnrolledCredentials).toHaveBeenCalledTimes(1);
    expect(getByTestId(MfaSettingsSelectorsIDs.EMAIL_ROW)).toHaveTextContent(
      /Add/,
    );
    await act(async () => {
      fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.EMAIL_ROW));
    });
    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: { kind: 'enroll', method: 'email_otp' },
        reason: { operation: 'settings.addEmail' },
      }),
    );
  });

  it('offers to add an email whose setup is not finished', () => {
    const { getByTestId } = renderSettings([
      {
        type: 'email_otp',
        status: 'pending',
        email: 'a@b.co',
        verified: false,
      },
    ]);

    expect(getByTestId(MfaSettingsSelectorsIDs.EMAIL_ROW)).toHaveTextContent(
      /Add/,
    );
  });

  it('opens an active email', () => {
    const { getByTestId } = renderSettings([
      { type: 'email_otp', status: 'active', email: 'a@b.co', verified: true },
    ]);

    expect(
      getByTestId(MfaSettingsSelectorsIDs.EMAIL_ROW),
    ).not.toHaveTextContent(/Add/);
    fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.EMAIL_ROW));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.METHOD_DETAILS, {
      method: 'email_otp',
      index: 0,
    });
    expect(mockStartMfaFlow).not.toHaveBeenCalled();
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
    ['Verify with passkey', 'qa.verifyPasskey'],
    ['Email and passkey, verify with passkey (Kalshi)', 'qa.kalshi'],
    ['Email or passkey, pick one', 'qa.emailAndPasskey'],
    ['Enroll authenticator app', 'qa.enrollAuthenticatorApp'],
    ['Verify with authenticator app', 'qa.verifyAuthenticatorApp'],
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
      fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.EMAIL_ROW));
    });

    expect(getByTestId(MfaSettingsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('offers to add a first passkey', async () => {
    const { getByTestId } = renderSettings();

    expect(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW)).toHaveTextContent(
      /Add/,
    );
    await act(async () => {
      fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW));
    });
    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: { kind: 'enroll', method: 'passkey' },
        reason: { operation: 'settings.addPasskey' },
      }),
    );
  });

  it('lists the only passkey', () => {
    const { getByTestId } = renderSettings([
      { type: 'passkey', status: 'active' },
    ]);

    expect(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW)).toHaveTextContent(
      /1 passkey/,
    );
    fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.PASSKEYS);
  });

  it('lists several passkeys', () => {
    const { getByTestId } = renderSettings([
      { type: 'passkey', status: 'active' },
      { type: 'passkey', status: 'active' },
    ]);

    expect(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW)).toHaveTextContent(
      /2 passkeys/,
    );
    fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.PASSKEYS);
  });

  it('offers to add an authenticator app', async () => {
    const { getByTestId } = renderSettings();

    expect(getByTestId(MfaSettingsSelectorsIDs.TOTP_ROW)).toHaveTextContent(
      /Authenticator app.*Add/,
    );
    await act(async () => {
      fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.TOTP_ROW));
    });
    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: { kind: 'enroll', method: 'totp' },
        reason: { operation: 'settings.addAuthenticatorApp' },
      }),
    );
  });

  it('opens an authenticator app that is set up', () => {
    const { getByTestId } = renderSettings([
      { type: 'totp', status: 'active' },
    ]);

    expect(getByTestId(MfaSettingsSelectorsIDs.TOTP_ROW)).not.toHaveTextContent(
      /Add/,
    );
    fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.TOTP_ROW));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.METHOD_DETAILS, {
      method: 'totp',
      index: 0,
    });
  });
});

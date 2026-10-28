import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MfaFlowError } from '../../../../util/identity/mfa/engine/errors';
import { startMfaFlow } from '../../../../util/identity/mfa/engine/activeFlow';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import Routes from '../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../component-library/components/Toast';
import { MfaSettingsSelectorsIDs } from '../Mfa.testIds';
import {
  useMoneyMfa,
  type MoneyMfaStatus,
} from '../../../UI/Money/hooks/useMoneyMfa';
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

jest.mock('../../../UI/Money/hooks/useMoneyMfa', () => ({
  useMoneyMfa: jest.fn(),
}));

const mockStartMfaFlow = jest.mocked(startMfaFlow);
const mockUseMoneyMfa = jest.mocked(useMoneyMfa);
const mockTurnOnMoneyMfa = jest.fn();

const mockMoneyMfaStatus = (status: MoneyMfaStatus) => {
  mockUseMoneyMfa.mockReturnValue({
    status,
    turnOn: mockTurnOnMoneyMfa,
  } as unknown as ReturnType<typeof useMoneyMfa>);
};
const mockAdapter = jest.mocked(mobileMfaControllerAdapter);
const mockShowToast = jest.fn();

const renderSettings = (
  enrolledCredentials: EnrolledCredential[] = [],
  seedlessVault?: string,
) =>
  renderWithProvider(
    <ToastContext.Provider
      value={{
        toastRef: {
          current: { showToast: mockShowToast, closeToast: jest.fn() },
        },
      }}
    >
      <MfaSettings />
    </ToastContext.Provider>,
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            SeedlessOnboardingController: {
              ...backgroundState.SeedlessOnboardingController,
              vault: seedlessVault,
            },
            AuthenticationController: {
              ...backgroundState.AuthenticationController,
              enrolledCredentials,
            },
          },
        },
      },
    },
  );

const mockAllMethods = ['passkey', 'totp', 'email_otp'];
const mockEmailOnly = ['email_otp'];
const mockMethods = jest.fn();
jest.mock('../../../../selectors/featureFlagController/mfaUiKit', () => ({
  selectMfaUiKitMethods: () => mockMethods(),
}));
beforeEach(() => mockMethods.mockReturnValue(mockAllMethods));

describe('MfaSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter.refreshEnrolledCredentials.mockResolvedValue([]);
    mockStartMfaFlow.mockResolvedValue({ credentials: [] });
    mockTurnOnMoneyMfa.mockResolvedValue(undefined);
    mockMoneyMfaStatus('unavailable');
  });

  it('hides email and keeps the authenticator app for social login users', () => {
    const { queryByTestId, getByTestId } = renderSettings(
      [
        {
          id: 'email_otp',
          type: 'email_otp',
          status: 'active',
          email: 'a@b.co',
          verified: true,
        },
      ],
      'vault',
    );

    expect(queryByTestId(MfaSettingsSelectorsIDs.EMAIL_ROW)).toBeNull();
    expect(getByTestId(MfaSettingsSelectorsIDs.TOTP_ROW)).toBeOnTheScreen();
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
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Email verified' }],
      }),
    );
  });

  it('offers to add an email whose setup is not finished', () => {
    const { getByTestId } = renderSettings([
      {
        id: 'email_otp',
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
      {
        id: 'email_otp',
        type: 'email_otp',
        status: 'active',
        email: 'a@b.co',
        verified: true,
      },
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
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Passkey added' }],
      }),
    );
  });

  it('lists the only passkey', () => {
    const { getByTestId } = renderSettings([
      { id: 'passkey', type: 'passkey', status: 'active' },
    ]);

    expect(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW)).toHaveTextContent(
      /1 passkey/,
    );
    fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.PASSKEYS);
  });

  it('lists several passkeys', () => {
    const { getByTestId } = renderSettings([
      { id: 'passkey', type: 'passkey', status: 'active' },
      { id: 'passkey', type: 'passkey', status: 'active' },
    ]);

    expect(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW)).toHaveTextContent(
      /2 passkeys/,
    );
    fireEvent.press(getByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.PASSKEYS);
  });

  it('hides the Money 2-step verification toggle when it is unavailable', () => {
    const { queryByTestId } = renderSettings();

    expect(queryByTestId(MfaSettingsSelectorsIDs.MONEY_MFA_ROW)).toBeNull();
  });

  it('turns on Money 2-step verification from the toggle', () => {
    mockMoneyMfaStatus('not_set_up');
    const { getByTestId } = renderSettings();

    fireEvent(
      getByTestId(MfaSettingsSelectorsIDs.MONEY_MFA_SWITCH),
      'onValueChange',
      true,
    );

    expect(mockTurnOnMoneyMfa).toHaveBeenCalledTimes(1);
  });

  it('opens the turn-off sheet when Money 2-step verification is on', () => {
    mockMoneyMfaStatus('enabled');
    const { getByTestId } = renderSettings();

    fireEvent(
      getByTestId(MfaSettingsSelectorsIDs.MONEY_MFA_SWITCH),
      'onValueChange',
      false,
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MFA_TURN_OFF_SHEET,
    });
    expect(mockTurnOnMoneyMfa).not.toHaveBeenCalled();
  });

  it('only offers to add the methods the flag allows', () => {
    mockMethods.mockReturnValue(mockEmailOnly);
    const { queryByTestId } = renderSettings();

    expect(queryByTestId(MfaSettingsSelectorsIDs.EMAIL_ROW)).toBeOnTheScreen();
    expect(queryByTestId(MfaSettingsSelectorsIDs.TOTP_ROW)).toBeNull();
    expect(queryByTestId(MfaSettingsSelectorsIDs.PASSKEY_ROW)).toBeNull();
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
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Authenticator app added' }],
      }),
    );
  });

  it('opens an authenticator app that is set up', () => {
    const { getByTestId } = renderSettings([
      { id: 'totp', type: 'totp', status: 'active' },
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

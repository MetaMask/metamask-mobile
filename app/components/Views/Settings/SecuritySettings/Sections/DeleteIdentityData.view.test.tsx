/**
 * Component-view coverage for deleting encrypted identity data from Security
 * settings (the VBA / neobank account). The section, confirmation, email
 * check, and controller call run for real. Engine is the only mock.
 *
 * yarn jest -c jest.config.view.js app/components/Views/Settings/SecuritySettings/Sections/DeleteIdentityData.view.test.tsx --maxWorkers=2 --coverage=false
 */

import '../../../../../../tests/component-view/mocks';
import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type {
  EnrolledCredential,
  VerificationToken,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../../core/Engine';
import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { getActiveMfaFlow } from '../../../../../util/identity/mfa/engine/activeFlow';
import {
  renderVbaDeleteIdentityData,
  restoreVbaReduxServiceStore,
  VbaDeleteIdentityTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import { SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON } from '../SecuritySettings.constants';

const AAL2_TOKEN = 'aal2-test-token';
const EMAIL_CODE = '424242';
const MFA_FLOW_ID = 'mfa-flow-test-1';
const OTP_SCREEN = VbaDeleteIdentityTestIds.OTP_SCREEN;

const enrolledEmail: EnrolledCredential = {
  id: 'email_otp',
  type: 'email_otp',
  status: 'active',
  email: 'vba.tester@example.com',
  verified: true,
};

const createVerificationToken = (): VerificationToken => ({
  accessToken: AAL2_TOKEN,
  expiresIn: 900,
  obtainedAt: Date.now(),
  claims: {
    sub: 'profile-test-1',
    amr: ['email_otp'],
    exp: 0,
  },
});

const authenticationController = Engine.context.AuthenticationController;
const mockRefreshEnrolledCredentials = jest.mocked(
  authenticationController.refreshEnrolledCredentials,
);
const mockBeginCredentialVerification = jest.mocked(
  authenticationController.beginCredentialVerification,
);
const mockCompleteCredentialVerification = jest.mocked(
  authenticationController.completeCredentialVerification,
);
const mockGetVerificationToken = jest.mocked(
  authenticationController.getVerificationToken,
);
const mockDeleteEncryptedStorage = jest.mocked(
  Engine.context.KycController.deleteEncryptedStorage,
);

let verificationToken: VerificationToken | null = null;
let alertSpy: jest.SpiedFunction<typeof Alert.alert>;

const resetControllerMocks = (): void => {
  verificationToken = null;
  mockRefreshEnrolledCredentials.mockReset();
  mockRefreshEnrolledCredentials.mockResolvedValue([enrolledEmail]);
  mockBeginCredentialVerification.mockReset();
  mockBeginCredentialVerification.mockResolvedValue({
    type: 'email_otp',
    flowId: MFA_FLOW_ID,
    expiresAt: Date.now() + 60_000,
  });
  mockCompleteCredentialVerification.mockReset();
  mockCompleteCredentialVerification.mockImplementation(async () => {
    verificationToken = createVerificationToken();
    return verificationToken;
  });
  mockGetVerificationToken.mockReset();
  mockGetVerificationToken.mockImplementation(() => verificationToken);
  mockDeleteEncryptedStorage.mockReset();
  mockDeleteEncryptedStorage.mockResolvedValue(undefined);
};

const openDeleteConfirmation = (
  getByTestId: ReturnType<typeof renderVbaDeleteIdentityData>['getByTestId'],
): { confirm: AlertButton; cancel: AlertButton | undefined } => {
  fireEvent.press(getByTestId(SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON));
  const buttons = alertSpy.mock.calls[0]?.[2] ?? [];
  const confirm = buttons.find((button) => button.style === 'destructive');
  const cancel = buttons.find((button) => button.style === 'cancel');
  if (!confirm) {
    throw new Error('Delete confirmation is missing its confirm action');
  }
  return { confirm, cancel };
};

const confirmAndSubmitEmailCode = async (
  screen: ReturnType<typeof renderVbaDeleteIdentityData>,
): Promise<void> => {
  const { confirm } = openDeleteConfirmation(screen.getByTestId);

  act(() => {
    confirm.onPress?.();
  });

  // The email screen opens after the controller sends a code.
  await screen.findByTestId(OTP_SCREEN);
  fireEvent.changeText(
    screen.getByTestId(VbaDeleteIdentityTestIds.CODE_INPUT),
    EMAIL_CODE,
  );
};

describe('DeleteIdentityData view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetControllerMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await act(async () => {
      getActiveMfaFlow()?.dispatch({ type: 'cancel' });
    });
    alertSpy.mockRestore();
    NavigationService.resetForTesting();
    restoreVbaReduxServiceStore();
  });

  it('shows the delete control for an active virtual bank account and asks before deleting', () => {
    const { getByTestId, getByText, navigation } =
      renderVbaDeleteIdentityData();

    expect(
      getByTestId(SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('identity_verification.delete_section_title')),
    ).toBeOnTheScreen();

    openDeleteConfirmation(getByTestId);

    expect(alertSpy).toHaveBeenCalledWith(
      strings('identity_verification.delete_confirm_title'),
      strings('identity_verification.delete_confirm_message'),
      expect.any(Array),
    );
    expect(mockDeleteEncryptedStorage).not.toHaveBeenCalled();
    expect(mockRefreshEnrolledCredentials).not.toHaveBeenCalled();
    expect(navigation.getCurrentRoute()?.name).toBe(
      Routes.SETTINGS.SECURITY_SETTINGS,
    );
  });

  it('deletes encrypted storage with the email verification token and stays on Security settings', async () => {
    const screen = renderVbaDeleteIdentityData();

    await confirmAndSubmitEmailCode(screen);

    await waitFor(() => {
      expect(mockDeleteEncryptedStorage).toHaveBeenCalledTimes(1);
    });
    expect(mockDeleteEncryptedStorage).toHaveBeenCalledWith({
      aal2Token: AAL2_TOKEN,
    });
    expect(mockBeginCredentialVerification).toHaveBeenCalledWith({
      type: 'email_otp',
      reason: { operation: 'ukyc.deleteData' },
    });
    await waitFor(() => {
      expect(alertSpy).toHaveBeenLastCalledWith(
        strings('identity_verification.delete_success_title'),
        strings('identity_verification.delete_success_message'),
      );
    });
    await waitFor(() => {
      expect(screen.navigation.getCurrentRoute()?.name).toBe(
        Routes.SETTINGS.SECURITY_SETTINGS,
      );
    });
    expect(screen.queryByTestId(OTP_SCREEN)).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON),
    ).toBeOnTheScreen();
  });

  it('shows the error alert and stays on Security settings when deletion fails', async () => {
    mockDeleteEncryptedStorage.mockRejectedValue(new Error('deletion failed'));
    const screen = renderVbaDeleteIdentityData();

    await confirmAndSubmitEmailCode(screen);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenLastCalledWith(
        strings('identity_verification.delete_error_title'),
        strings('identity_verification.delete_error_message'),
      );
    });
    expect(mockDeleteEncryptedStorage).toHaveBeenCalledWith({
      aal2Token: AAL2_TOKEN,
    });
    await waitFor(() => {
      expect(screen.navigation.getCurrentRoute()?.name).toBe(
        Routes.SETTINGS.SECURITY_SETTINGS,
      );
    });
    expect(screen.queryByTestId(OTP_SCREEN)).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON),
    ).toBeOnTheScreen();
  });

  it('makes no deletion call when the confirmation is cancelled', () => {
    const { getByTestId, navigation } = renderVbaDeleteIdentityData();
    const { cancel } = openDeleteConfirmation(getByTestId);

    act(() => {
      cancel?.onPress?.();
    });

    expect(mockDeleteEncryptedStorage).not.toHaveBeenCalled();
    expect(mockRefreshEnrolledCredentials).not.toHaveBeenCalled();
    expect(
      getByTestId(SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON),
    ).toBeOnTheScreen();
    expect(navigation.getCurrentRoute()?.name).toBe(
      Routes.SETTINGS.SECURITY_SETTINGS,
    );
  });

  it('makes no deletion call and shows no error when the email check is cancelled', async () => {
    const screen = renderVbaDeleteIdentityData();
    const { confirm } = openDeleteConfirmation(screen.getByTestId);

    act(() => {
      confirm.onPress?.();
    });

    await screen.findByTestId(OTP_SCREEN);
    fireEvent.press(screen.getByTestId(VbaDeleteIdentityTestIds.BACK_BUTTON));

    await waitFor(() => {
      expect(screen.queryByTestId(OTP_SCREEN)).not.toBeOnTheScreen();
    });
    expect(mockDeleteEncryptedStorage).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId(SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON),
    ).toBeOnTheScreen();
    expect(screen.navigation.getCurrentRoute()?.name).toBe(
      Routes.SETTINGS.SECURITY_SETTINGS,
    );
  });
});

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import DeviceSecurityToggle from './DeviceSecurityToggle';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';
import { SecurityPrivacyViewSelectorsIDs } from '../SecurityPrivacyView.testIds';
import { AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS } from '../../../../../constants/error';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});

jest.mock('../../../../../util/Logger', () => ({ error: jest.fn() }));

jest.mock('../../../../../core/Authentication/AuthenticationError', () => {
  class AuthenticationError extends Error {
    customErrorMessage: string;
    constructor(message: string, code: string) {
      super(message);
      this.customErrorMessage = code;
      this.name = 'AuthenticationError';
    }
  }
  return { __esModule: true, default: AuthenticationError };
});

const MockedAuthenticationError = jest.requireMock(
  '../../../../../core/Authentication/AuthenticationError',
).default as new (message: string, code: string) => Error & { customErrorMessage: string };

const mockUpdateAuthPreference = jest.fn();
const mockGetAuthCapabilities = jest.fn();
const mockUpdateOsAuthEnabled = jest.fn();

jest.mock('../../../../../core/Authentication', () => ({
  useAuthentication: () => ({
    updateAuthPreference: mockUpdateAuthPreference,
    getAuthCapabilities: mockGetAuthCapabilities,
    updateOsAuthEnabled: mockUpdateOsAuthEnabled,
  }),
}));

const mockUseAuthCapabilities = jest.fn();
jest.mock('../../../../../core/Authentication/hooks/useAuthCapabilities', () => ({
  __esModule: true,
  default: () => mockUseAuthCapabilities(),
}));

jest.mock('../../../../UI/TurnOffRememberMeModal/TurnOffRememberMeModal', () => ({
  createTurnOffRememberMeModalNavDetails: () => ['TurnOffRememberMeModal', {}],
}));

const defaultCapabilities = {
  isBiometricsAvailable: true,
  passcodeAvailable: true,
  authLabel: 'Face ID',
  osAuthEnabled: false,
  allowLoginWithRememberMe: false,
  authType: AUTHENTICATION_TYPE.PASSWORD,
  deviceAuthRequiresSettings: false,
};

const initialState = { security: { allowLoginWithRememberMe: false } };

function renderComponent(props?: { requiresReauthentication?: boolean }) {
  return renderWithProvider(<DeviceSecurityToggle {...props} />, {
    state: initialState,
  });
}

describe('DeviceSecurityToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthCapabilities.mockReturnValue({
      isLoading: false,
      capabilities: defaultCapabilities,
    });
    mockUpdateAuthPreference.mockResolvedValue(undefined);
    mockGetAuthCapabilities.mockImplementation(
      ({ osAuthEnabled }: { osAuthEnabled: boolean }) =>
        Promise.resolve({
          ...defaultCapabilities,
          authType: osAuthEnabled ? AUTHENTICATION_TYPE.BIOMETRIC : AUTHENTICATION_TYPE.PASSWORD,
        }),
    );
  });

  describe('render', () => {
    it('returns null when capabilities are not yet loaded', () => {
      mockUseAuthCapabilities.mockReturnValue({ isLoading: true, capabilities: null });
      const { queryByTestId } = renderComponent();
      expect(queryByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE)).toBeNull();
    });

    it('renders device settings button when deviceAuthRequiresSettings is true', async () => {
      mockUseAuthCapabilities.mockReturnValue({
        isLoading: false,
        capabilities: { ...defaultCapabilities, deviceAuthRequiresSettings: true },
      });
      const { getByText } = renderComponent();
      await waitFor(() => {
        // strings('app_settings.enable_biometrics_in_settings') from en.json
        expect(getByText('Enable Device Authentication')).toBeTruthy();
      });
    });

    it('renders toggle when deviceAuthRequiresSettings is false', async () => {
      const { getByTestId } = renderComponent();
      await waitFor(() => {
        expect(getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE)).toBeTruthy();
      });
    });
  });

  describe('toggle', () => {
    it('calls getAuthCapabilities and updateAuthPreference when turning on', async () => {
      const { getByTestId } = renderComponent();
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => {
        expect(mockGetAuthCapabilities).toHaveBeenCalledWith({
          osAuthEnabled: true,
          allowLoginWithRememberMe: false,
        });
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.BIOMETRIC,
        });
      });
    });

    it('calls getAuthCapabilities and updateAuthPreference when turning off', async () => {
      mockUseAuthCapabilities.mockReturnValue({
        isLoading: false,
        capabilities: { ...defaultCapabilities, osAuthEnabled: true, authType: AUTHENTICATION_TYPE.BIOMETRIC },
      });
      const { getByTestId } = renderComponent();
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      fireEvent(toggle, 'onValueChange', false);

      await waitFor(() => {
        expect(mockGetAuthCapabilities).toHaveBeenCalledWith({
          osAuthEnabled: false,
          allowLoginWithRememberMe: false,
        });
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.PASSWORD,
        });
      });
    });

    it('calls updateOsAuthEnabled only when requiresReauthentication is false (turning on)', async () => {
      const { getByTestId } = renderComponent({ requiresReauthentication: false });
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => {
        expect(mockUpdateOsAuthEnabled).toHaveBeenCalledWith(true);
        expect(mockUpdateAuthPreference).not.toHaveBeenCalled();
        expect(mockGetAuthCapabilities).not.toHaveBeenCalled();
      });
    });

    it('calls updateOsAuthEnabled only when requiresReauthentication is false (turning off)', async () => {
      mockUseAuthCapabilities.mockReturnValue({
        isLoading: false,
        capabilities: { ...defaultCapabilities, osAuthEnabled: true },
      });
      const { getByTestId } = renderComponent({ requiresReauthentication: false });
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      fireEvent(toggle, 'onValueChange', false);

      await waitFor(() => {
        expect(mockUpdateOsAuthEnabled).toHaveBeenCalledWith(false);
        expect(mockUpdateAuthPreference).not.toHaveBeenCalled();
        expect(mockGetAuthCapabilities).not.toHaveBeenCalled();
      });
    });
  });

  describe('remember me', () => {
    it('navigates to TurnOffRememberMeModal when turning off from REMEMBER_ME', async () => {
      mockUseAuthCapabilities.mockReturnValue({
        isLoading: false,
        capabilities: {
          ...defaultCapabilities,
          authType: AUTHENTICATION_TYPE.REMEMBER_ME,
          allowLoginWithRememberMe: true,
          osAuthEnabled: false,
        },
      });
      const { getByTestId } = renderComponent();
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      fireEvent(toggle, 'onValueChange', false);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('TurnOffRememberMeModal', {});
      });
      expect(mockUpdateAuthPreference).not.toHaveBeenCalled();
    });
  });

  describe('password required', () => {
    it('navigates to EnterPasswordSimple when updateAuthPreference throws password-required error', async () => {
      mockUpdateAuthPreference.mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      );
      const { getByTestId } = renderComponent();
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('EnterPasswordSimple', {
          onPasswordSet: expect.any(Function),
          onCancel: expect.any(Function),
        });
      });
    });

    it('calls updateAuthPreference with password when user provides password via callback', async () => {
      let onPasswordSet: ((password: string) => Promise<void>) | undefined;
      mockUpdateAuthPreference
        .mockRejectedValueOnce(
          new MockedAuthenticationError(
            'Password required',
            AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
          ),
        )
        .mockResolvedValueOnce(undefined);
      mockNavigate.mockImplementation(
        (_: string, params?: { onPasswordSet?: (p: string) => Promise<void> }) => {
          if (params?.onPasswordSet) onPasswordSet = params.onPasswordSet;
        },
      );

      const { getByTestId } = renderComponent();
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
      expect(onPasswordSet).toBeDefined();
      await onPasswordSet!('test-password');

      await waitFor(() => {
        expect(mockUpdateAuthPreference).toHaveBeenLastCalledWith({
          authType: AUTHENTICATION_TYPE.BIOMETRIC,
          password: 'test-password',
        });
      });
    });

    it('clears optimistic state when user cancels password entry', async () => {
      let onCancel: (() => void) | undefined;
      mockUpdateAuthPreference.mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      );
      mockNavigate.mockImplementation(
        (_: string, params?: { onCancel?: () => void }) => {
          if (params?.onCancel) onCancel = params.onCancel;
        },
      );

      const { getByTestId } = renderComponent();
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
      expect(onCancel).toBeDefined();
      onCancel!();

      await waitFor(() => {
        const toggleAfterCancel = getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE);
        expect(toggleAfterCancel.props.value).toBe(false);
      });
    });
  });

  describe('onDeviceSecurityToggle success', () => {
    it('clears optimistic value after updateAuthPreference succeeds', async () => {
      jest.useFakeTimers();
      const { getByTestId } = renderComponent();
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => expect(mockUpdateAuthPreference).toHaveBeenCalled());
      expect(toggle.props.value).toBe(true);

      jest.runAllTimers();

      await waitFor(() => {
        const toggleAfterSuccess = getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE);
        expect(toggleAfterSuccess.props.disabled).toBe(false);
      });
      jest.useRealTimers();
    });
  });

  describe('loading and errors', () => {
    it('disables toggle when capabilities are loading', async () => {
      mockUseAuthCapabilities.mockReturnValue({
        isLoading: true,
        capabilities: defaultCapabilities,
      });
      const { getByTestId } = renderComponent();
      await waitFor(() => {
        const toggle = getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE);
        expect(toggle.props.disabled).toBe(true);
      });
    });

    it('handles updateAuthPreference rejection and clears optimistic state', async () => {
      mockUpdateAuthPreference.mockRejectedValueOnce(new Error('Update failed'));
      const { getByTestId } = renderComponent();
      const toggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
      );
      expect(toggle.props.value).toBe(false);

      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => expect(mockUpdateAuthPreference).toHaveBeenCalled());

      // Optimistic state should be cleared in catch: toggle reverts to capabilities (off)
      await waitFor(() => {
        const toggleAfterError = getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE);
        expect(toggleAfterError.props.value).toBe(false);
      });
    });
  });
});

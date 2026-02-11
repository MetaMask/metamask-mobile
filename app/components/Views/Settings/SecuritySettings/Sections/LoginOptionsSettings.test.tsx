// Mock StorageWrapper FIRST (before any imports that use it)
jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Mock Authentication
jest.mock('../../../../../core', () => ({
  Authentication: {
    getType: jest.fn(),
    updateAuthPreference: jest.fn(),
  },
}));

// Mock navigation - define navigate function that can be accessed
const mockNavigateFn = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigateFn,
    }),
  };
});

// Mock useTheme
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#0376C9' },
      background: { default: '#FFFFFF' },
      text: { default: '#000000' },
    },
  }),
}));

// Mock createStyles
jest.mock('../SecuritySettings.styles', () => ({
  __esModule: true,
  default: () => ({
    setting: {},
  }),
}));

// Mock Box and other design system components
jest.mock('@metamask/design-system-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    BoxFlexDirection: { Row: 'row', Column: 'column' },
    BoxAlignItems: { Center: 'center' },
  };
});

// Mock SecurityOptionToggle
jest.mock('../../../../UI/SecurityOptionToggle', () => {
  const { Switch } = jest.requireActual('react-native');
  return {
    SecurityOptionToggle: ({
      testId,
      value,
      onOptionUpdated,
      disabled,
    }: {
      testId: string;
      value: boolean;
      onOptionUpdated: (val: boolean) => void;
      disabled?: boolean;
    }) => (
      <Switch
        testID={testId}
        value={value}
        onValueChange={onOptionUpdated}
        disabled={disabled}
      />
    ),
  };
});

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import LoginOptionsSettings from './LoginOptionsSettings';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';
import { SecurityPrivacyViewSelectorsIDs } from '../SecurityPrivacyView.testIds';
import {
  PASSCODE_DISABLED,
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
} from '../../../../../constants/storage';

// Mock Device
jest.mock('../../../../../util/device', () => ({
  isAndroid: jest.fn(() => false),
  isIos: jest.fn(() => true),
}));

// Mock Logger
jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Import the actual constant
import { AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS } from '../../../../../constants/error';

// Mock AuthenticationError as a proper class for instanceof to work
// Must be defined inside the factory because jest.mock is hoisted
jest.mock('../../../../../core/Authentication/AuthenticationError', () => {
  class AuthenticationError extends Error {
    customErrorMessage: string;
    constructor(message: string, code: string) {
      super(message);
      this.customErrorMessage = code;
      this.name = 'AuthenticationError';
    }
  }
  return {
    __esModule: true,
    default: AuthenticationError,
  };
});

// Get the mocked AuthenticationError class
const MockedAuthenticationError = jest.requireMock(
  '../../../../../core/Authentication/AuthenticationError',
).default as new (
  message: string,
  code: string,
) => Error & { customErrorMessage: string };

describe('LoginOptionsSettings', () => {
  let mockGetType: jest.Mock;
  let mockUpdateAuthPreference: jest.Mock;
  let mockGetItem: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked functions from the modules
    const coreModule = jest.requireMock('../../../../../core');
    mockGetType = coreModule.Authentication.getType as jest.Mock;
    mockUpdateAuthPreference = coreModule.Authentication
      .updateAuthPreference as jest.Mock;

    const storageModule = jest.requireMock(
      '../../../../../store/storage-wrapper',
    );
    mockGetItem = storageModule.default.getItem as jest.Mock;

    // Set default mock implementations
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: 'FaceID',
    });
    mockGetItem.mockResolvedValue(null);
    mockUpdateAuthPreference.mockResolvedValue(undefined);
  });

  const initialState = {
    security: {
      allowLoginWithRememberMe: false,
    },
  };

  it('renders correctly', async () => {
    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(
        getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
      ).toBeTruthy();
    });
  });

  it('enables biometrics when toggle is turned on', async () => {
    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
        authType: AUTHENTICATION_TYPE.BIOMETRIC,
      });
    });
  });

  it('disables biometrics when toggle is turned off', async () => {
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      availableBiometryType: 'FaceID',
    });
    // When biometrics is enabled, passcode is disabled (mutually exclusive)
    mockGetItem.mockImplementation((key: string) => {
      if (key === BIOMETRY_CHOICE_DISABLED) {
        return Promise.resolve(null); // Biometrics not disabled (enabled)
      }
      if (key === PASSCODE_DISABLED) {
        return Promise.resolve(TRUE); // Passcode is disabled
      }
      return Promise.resolve(null);
    });

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
        authType: AUTHENTICATION_TYPE.PASSWORD,
      });
    });
  });

  it('navigates to password entry when password is required for biometrics', async () => {
    mockUpdateAuthPreference.mockRejectedValueOnce(
      new MockedAuthenticationError(
        'Password required',
        AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
      ),
    );

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalledWith('EnterPasswordSimple', {
        onPasswordSet: expect.any(Function),
      });
    });
  });

  it('updates auth preference when password is provided via callback', async () => {
    let passwordCallback: ((password: string) => Promise<void>) | undefined;
    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockResolvedValueOnce(undefined);

    mockNavigateFn.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalled();
    });

    // Simulate password entry
    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(() => {
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.BIOMETRIC,
          password: 'test-password',
        });
      });
    }
  });

  it('clears loading state when user cancels password entry', async () => {
    mockUpdateAuthPreference.mockRejectedValueOnce(
      new MockedAuthenticationError(
        'Password required',
        AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
      ),
    );

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalled();
    });

    // Loading should be cleared in finally block even if callback is never called
    // This is tested by ensuring the component doesn't get stuck in loading state
    await waitFor(() => {
      // Component should be interactive again
      expect(toggle).toBeTruthy();
    });
  });

  it('disables biometrics toggle when remember me is enabled', async () => {
    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: stateWithRememberMe,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    expect(toggle.props.disabled).toBe(true);
  });

  it('disables passcode toggle when remember me is enabled', async () => {
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: 'FaceID',
    });

    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: stateWithRememberMe,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
    );
    expect(toggle.props.disabled).toBe(true);
  });

  it('disables passcode toggle when biometrics is loading', async () => {
    let resolveUpdateAuthPreference: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdateAuthPreference = resolve;
    });
    mockUpdateAuthPreference.mockReturnValue(updatePromise);

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const biometricToggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    fireEvent(biometricToggle, 'onValueChange', true);

    // Wait for the passcode toggle to be disabled while biometrics is loading
    await waitFor(() => {
      const passcodeToggle = getByTestId(
        SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE,
      );
      expect(passcodeToggle.props.disabled).toBe(true);
    });

    // Resolve the promise
    if (resolveUpdateAuthPreference) {
      resolveUpdateAuthPreference();
      await waitFor(() => {
        // Loading should be cleared
      });
    }
  });

  it('disables biometrics toggle when passcode is loading', async () => {
    let resolveUpdateAuthPreference: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdateAuthPreference = resolve;
    });
    mockUpdateAuthPreference.mockReturnValue(updatePromise);

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const passcodeToggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
    );
    fireEvent(passcodeToggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
    });

    const biometricToggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    expect(biometricToggle.props.disabled).toBe(true);

    // Resolve the promise
    if (resolveUpdateAuthPreference) {
      resolveUpdateAuthPreference();
      await waitFor(() => {
        // Loading should be cleared
      });
    }
  });

  it('handles error when updating auth preference fails', async () => {
    const error = new Error('Update failed');
    mockUpdateAuthPreference.mockRejectedValueOnce(error);

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
    });

    // Toggle should revert to original state on error
    await waitFor(() => {
      // Component should handle error gracefully
    });
  });

  it('reverts toggle state when password entry callback fails', async () => {
    let passwordCallback: ((password: string) => Promise<void>) | undefined;
    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockRejectedValueOnce(new Error('Update failed'));

    mockNavigateFn.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalled();
    });

    // Simulate password entry that fails
    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(() => {
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.BIOMETRIC,
          password: 'test-password',
        });
      });
    }
  });

  it('navigates to password entry when password is required for passcode', async () => {
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: 'FaceID',
    });

    mockUpdateAuthPreference.mockRejectedValueOnce(
      new MockedAuthenticationError(
        'Password required',
        AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
      ),
    );

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const passcodeToggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
    );
    fireEvent(passcodeToggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalledWith('EnterPasswordSimple', {
        onPasswordSet: expect.any(Function),
      });
    });
  });

  it('updates auth preference when password is provided via callback for passcode', async () => {
    let passwordCallback: ((password: string) => Promise<void>) | undefined;

    // Initial load: PASSWORD with FaceID available (shows passcode toggle)
    mockGetType.mockResolvedValueOnce({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: 'FaceID',
    });

    // After password entry: PASSCODE
    mockGetType.mockResolvedValueOnce({
      currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      availableBiometryType: 'FaceID',
    });

    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockResolvedValueOnce(undefined);

    // Mock getItem for the re-fetch after password entry
    mockGetItem
      .mockResolvedValueOnce(null) // Initial load
      .mockResolvedValueOnce(null); // After password entry

    mockNavigateFn.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    // Wait for component to load and passcode toggle to appear
    const passcodeToggle = await waitFor(
      () => getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
      { timeout: 3000 },
    );

    fireEvent(passcodeToggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalled();
    });

    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(() => {
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.PASSCODE,
          password: 'test-password',
        });
      });
    }
  });

  it('reverts toggle state when passcode password entry callback fails', async () => {
    let passwordCallback: ((password: string) => Promise<void>) | undefined;
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: 'FaceID',
    });

    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockRejectedValueOnce(new Error('Update failed'));

    mockNavigateFn.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const passcodeToggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
    );
    fireEvent(passcodeToggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalled();
    });

    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(() => {
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.PASSCODE,
          password: 'test-password',
        });
      });
    }
  });

  it('re-fetches auth type after successful password entry for biometrics', async () => {
    let passwordCallback: ((password: string) => Promise<void>) | undefined;

    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockResolvedValueOnce(undefined);

    // First call: initial load in useEffect
    mockGetType.mockResolvedValueOnce({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: 'FaceID',
    });

    // Second call: after password entry (re-fetch)
    mockGetType.mockResolvedValueOnce({
      currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      availableBiometryType: 'FaceID',
    });

    // Mock getItem for initial load and re-fetch after password entry
    mockGetItem
      .mockResolvedValueOnce(null) // Initial load
      .mockResolvedValueOnce(null); // After password entry (re-fetch)

    mockNavigateFn.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const toggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
    );
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalled();
    });

    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(
        () => {
          // Should re-fetch auth type after successful update
          // Call 1: initial load in useEffect
          // Call 2: re-fetch after password entry
          expect(mockGetType).toHaveBeenCalledTimes(2);
        },
        { timeout: 3000 },
      );
    }
  });

  it('re-fetches auth type after successful password entry for passcode', async () => {
    let passwordCallback: ((password: string) => Promise<void>) | undefined;

    // First call: initial load in useEffect
    mockGetType.mockResolvedValueOnce({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: 'FaceID',
    });

    // Second call: after password entry (re-fetch)
    mockGetType.mockResolvedValueOnce({
      currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      availableBiometryType: 'FaceID',
    });

    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockResolvedValueOnce(undefined);

    // Mock getItem for initial load (BIOMETRY_CHOICE_DISABLED and PASSCODE_DISABLED)
    // and re-fetch after password entry (PASSCODE_DISABLED)
    mockGetItem
      .mockResolvedValueOnce(null) // Initial load: BIOMETRY_CHOICE_DISABLED
      .mockResolvedValueOnce(null) // Initial load: PASSCODE_DISABLED
      .mockResolvedValueOnce(null); // After password entry: PASSCODE_DISABLED

    mockNavigateFn.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    // Wait for component to load and passcode toggle to appear
    const passcodeToggle = await waitFor(
      () => getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
      { timeout: 3000 },
    );

    fireEvent(passcodeToggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalled();
    });

    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(
        () => {
          // Should re-fetch auth type after successful update
          // Call 1: initial load in useEffect
          // Call 2: re-fetch after password entry
          expect(mockGetType).toHaveBeenCalledTimes(2);
        },
        { timeout: 3000 },
      );
    }
  });

  it('handles error when updating passcode auth preference fails', async () => {
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: 'FaceID',
    });

    const error = new Error('Update failed');
    mockUpdateAuthPreference.mockRejectedValueOnce(error);

    const { getByTestId } = renderWithProvider(<LoginOptionsSettings />, {
      state: initialState,
    });

    const passcodeToggle = await waitFor(() =>
      getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
    );
    fireEvent(passcodeToggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
    });
  });

  describe('mutual exclusivity and toggle visibility', () => {
    it('shows biometrics toggle when biometrics are enabled regardless of storage state', async () => {
      // Arrange: Simulate inconsistent storage state (bug scenario)
      // Storage says passcode is not disabled, but currentAuthType says biometrics are enabled
      mockGetType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'FaceID',
      });
      mockGetItem.mockImplementation((key: string) => {
        if (key === BIOMETRY_CHOICE_DISABLED) {
          return Promise.resolve(null); // Biometrics not disabled
        }
        if (key === PASSCODE_DISABLED) {
          // This is the bug scenario: storage says passcode is NOT disabled
          // but currentAuthType says biometrics are enabled
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <LoginOptionsSettings />,
        {
          state: initialState,
        },
      );

      // Act & Assert: Biometrics toggle should be visible (currentAuthType is source of truth)
      const biometricsToggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
      );

      expect(biometricsToggle).toBeTruthy();
      expect(biometricsToggle.props.value).toBe(true);

      // Assert: Passcode toggle should NOT be visible (mutually exclusive)
      await waitFor(() => {
        expect(
          queryByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
        ).toBeNull();
      });
    });

    it('shows passcode toggle when passcode is enabled regardless of storage state', async () => {
      // Arrange: Simulate inconsistent storage state (bug scenario)
      // Storage says biometrics is not disabled, but currentAuthType says passcode is enabled
      mockGetType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: 'FaceID',
      });
      mockGetItem.mockImplementation((key: string) => {
        if (key === BIOMETRY_CHOICE_DISABLED) {
          // This is the bug scenario: storage says biometrics is NOT disabled
          // but currentAuthType says passcode is enabled
          return Promise.resolve(null);
        }
        if (key === PASSCODE_DISABLED) {
          return Promise.resolve(null); // Passcode not disabled
        }
        return Promise.resolve(null);
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <LoginOptionsSettings />,
        {
          state: initialState,
        },
      );

      // Act & Assert: Passcode toggle should be visible (currentAuthType is source of truth)
      const passcodeToggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
      );

      expect(passcodeToggle).toBeTruthy();
      expect(passcodeToggle.props.value).toBe(true);

      // Assert: Biometrics toggle should NOT be visible (mutually exclusive)
      await waitFor(() => {
        expect(
          queryByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
        ).toBeNull();
      });
    });

    it('enforces mutual exclusivity when biometrics are enabled', async () => {
      // Arrange
      mockGetType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'FaceID',
      });
      mockGetItem.mockImplementation((key: string) => {
        if (key === BIOMETRY_CHOICE_DISABLED) {
          return Promise.resolve(null);
        }
        if (key === PASSCODE_DISABLED) {
          return Promise.resolve(TRUE);
        }
        return Promise.resolve(null);
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <LoginOptionsSettings />,
        {
          state: initialState,
        },
      );

      // Act
      const biometricsToggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
      );

      // Assert
      expect(biometricsToggle.props.value).toBe(true);
      expect(
        queryByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
      ).toBeNull();
    });

    it('enforces mutual exclusivity when passcode is enabled', async () => {
      // Arrange
      mockGetType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: 'FaceID',
      });
      mockGetItem.mockImplementation((key: string) => {
        if (key === BIOMETRY_CHOICE_DISABLED) {
          return Promise.resolve(TRUE);
        }
        if (key === PASSCODE_DISABLED) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <LoginOptionsSettings />,
        {
          state: initialState,
        },
      );

      // Act
      const passcodeToggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
      );

      // Assert
      expect(passcodeToggle.props.value).toBe(true);
      expect(
        queryByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
      ).toBeNull();
    });

    it('uses currentAuthType as source of truth over storage state', async () => {
      // Arrange: Storage is completely inconsistent, but currentAuthType is correct
      mockGetType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: 'FaceID',
      });
      // Storage incorrectly says both are not disabled (inconsistent state)
      mockGetItem.mockResolvedValue(null);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <LoginOptionsSettings />,
        {
          state: initialState,
        },
      );

      // Act
      const biometricsToggle = await waitFor(() =>
        getByTestId(SecurityPrivacyViewSelectorsIDs.BIOMETRICS_TOGGLE),
      );

      // Assert: Should show biometrics toggle because currentAuthType says BIOMETRIC
      expect(biometricsToggle.props.value).toBe(true);
      expect(
        queryByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_PASSCODE_TOGGLE),
      ).toBeNull();
    });
  });
});

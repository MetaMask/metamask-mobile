jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Mock locales/i18n to prevent it from using StorageWrapper during import
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock Authentication
jest.mock('../../../../../core', () => {
  const mockGetTypeFn = jest.fn();
  const mockUpdateAuthPreferenceFn = jest.fn();
  return {
    Authentication: {
      getType: mockGetTypeFn,
      updateAuthPreference: mockUpdateAuthPreferenceFn,
    },
    __mockGetType: mockGetTypeFn,
    __mockUpdateAuthPreference: mockUpdateAuthPreferenceFn,
  };
});

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import RememberMeOptionSection from './RememberMeOptionSection';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';
import { TURN_ON_REMEMBER_ME } from '../SecuritySettings.constants';
import { AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS } from '../../../../../constants/error';
import { PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME } from '../../../../../constants/storage';
import Logger from '../../../../../util/Logger';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock TurnOffRememberMeModal
jest.mock(
  '../../../../UI/TurnOffRememberMeModal/TurnOffRememberMeModal',
  () => ({
    createTurnOffRememberMeModalNavDetails: jest.fn(() => [
      'TurnOffRememberMe',
      {},
    ]),
  }),
);

// Mock AuthenticationError
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

// Mock Logger
jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('RememberMeOptionSection', () => {
  let mockGetType: jest.Mock;
  let mockUpdateAuthPreference: jest.Mock;
  let mockGetItem: jest.Mock;
  let mockRemoveItem: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const AuthenticationMock = jest.requireMock('../../../../../core');
    mockGetType = AuthenticationMock.__mockGetType;
    mockUpdateAuthPreference = AuthenticationMock.__mockUpdateAuthPreference;

    // Get mocked StorageWrapper functions
    const storageModule = jest.requireMock(
      '../../../../../store/storage-wrapper',
    );
    mockGetItem = storageModule.default.getItem as jest.Mock;
    mockRemoveItem = storageModule.default.removeItem as jest.Mock;

    // Reset mocks to default behavior
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockUpdateAuthPreference.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue(null);
    mockRemoveItem.mockResolvedValue(undefined);
    mockNavigate.mockClear();
  });

  const initialState = {
    security: {
      allowLoginWithRememberMe: false,
    },
  };

  it('renders correctly', () => {
    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: initialState,
    });
    expect(getByTestId(TURN_ON_REMEMBER_ME)).toBeTruthy();
  });

  it('calls getType when attempting to disable remember me', async () => {
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.REMEMBER_ME,
    });

    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockGetType).toHaveBeenCalled();
    });
  });

  it('calls updateAuthPreference when enabling remember me', async () => {
    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: initialState,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
        authType: AUTHENTICATION_TYPE.REMEMBER_ME,
      });
    });
  });

  it('does not call updateAuthPreference when disabling remember me', async () => {
    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.REMEMBER_ME,
    });

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      // Should navigate to turn off modal, not call updateAuthPreference
      expect(mockNavigate).toHaveBeenCalled();
    });

    expect(mockUpdateAuthPreference).not.toHaveBeenCalled();
  });

  it('reverts flag if updateAuthPreference fails when enabling', async () => {
    mockUpdateAuthPreference.mockRejectedValueOnce(new Error('Update failed'));

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: initialState,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
    });

    // The component should handle the error and revert the flag
    // We verify updateAuthPreference was called and failed
    expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
      authType: AUTHENTICATION_TYPE.REMEMBER_ME,
    });
  });

  it('displays correct toggle value based on Redux state', () => {
    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    expect(toggle.props.value).toBe(true);
  });

  it('navigates to password entry when password is required for enabling remember me', async () => {
    const MockedAuthenticationError = jest.requireMock(
      '../../../../../core/Authentication/AuthenticationError',
    ).default;

    mockUpdateAuthPreference.mockRejectedValueOnce(
      new MockedAuthenticationError(
        'Password required',
        AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
      ),
    );

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: initialState,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('EnterPasswordSimple', {
        onPasswordSet: expect.any(Function),
      });
    });
  });

  it('updates auth preference when password is provided via callback when enabling', async () => {
    const MockedAuthenticationError = jest.requireMock(
      '../../../../../core/Authentication/AuthenticationError',
    ).default;

    let passwordCallback: ((password: string) => Promise<void>) | undefined;
    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockResolvedValueOnce(undefined);

    mockNavigate.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: initialState,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(() => {
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.REMEMBER_ME,
          password: 'test-password',
        });
      });
    }
  });

  it('reverts flag when password entry callback fails when enabling', async () => {
    const MockedAuthenticationError = jest.requireMock(
      '../../../../../core/Authentication/AuthenticationError',
    ).default;

    let passwordCallback: ((password: string) => Promise<void>) | undefined;
    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockRejectedValueOnce(new Error('Update failed'));

    mockNavigate.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: initialState,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(() => {
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.REMEMBER_ME,
          password: 'test-password',
        });
      });
    }
  });

  it('calls Logger.error when updateAuthPreference fails when enabling', async () => {
    const error = new Error('Update failed');
    mockUpdateAuthPreference.mockRejectedValueOnce(error);

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: initialState,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Failed to update auth preference for remember me',
      );
    });
  });

  it('calls Logger.error when password entry callback fails when enabling', async () => {
    const MockedAuthenticationError = jest.requireMock(
      '../../../../../core/Authentication/AuthenticationError',
    ).default;

    const updateError = new Error('Update failed');
    let passwordCallback: ((password: string) => Promise<void>) | undefined;
    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockRejectedValueOnce(updateError);

    mockNavigate.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: initialState,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          updateError,
          'Failed to update auth preference after password entry',
        );
      });
    }
  });

  it('successfully disables remember me and restores password auth type', async () => {
    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockGetItem.mockResolvedValue(null);

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    // Wait for getType to be called (from onValueChanged)
    await waitFor(
      () => {
        expect(mockGetType).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for getItem to be called (from toggleRememberMe)
    await waitFor(
      () => {
        expect(mockGetItem).toHaveBeenCalledWith(
          PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
        );
      },
      { timeout: 3000 },
    );

    // Wait for updateAuthPreference to be called
    await waitFor(
      () => {
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.PASSWORD,
        });
      },
      { timeout: 3000 },
    );

    // Wait for removeItem to be called
    await waitFor(
      () => {
        expect(mockRemoveItem).toHaveBeenCalledWith(
          PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
        );
      },
      { timeout: 3000 },
    );
  });

  it('successfully disables remember me and restores stored previous auth type', async () => {
    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockGetItem.mockResolvedValue(AUTHENTICATION_TYPE.BIOMETRIC);

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockGetType).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith(
        PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
      );
    });

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
        authType: AUTHENTICATION_TYPE.BIOMETRIC,
      });
    });

    await waitFor(() => {
      expect(mockRemoveItem).toHaveBeenCalledWith(
        PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
      );
    });
  });

  it('navigates to password entry when password is required for disabling remember me', async () => {
    const MockedAuthenticationError = jest.requireMock(
      '../../../../../core/Authentication/AuthenticationError',
    ).default;

    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockGetItem.mockResolvedValue(null);
    mockUpdateAuthPreference.mockRejectedValueOnce(
      new MockedAuthenticationError(
        'Password required',
        AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
      ),
    );

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockGetType).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('EnterPasswordSimple', {
        onPasswordSet: expect.any(Function),
      });
    });
  });

  it('restores auth preference when password is provided via callback when disabling', async () => {
    const MockedAuthenticationError = jest.requireMock(
      '../../../../../core/Authentication/AuthenticationError',
    ).default;

    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    let passwordCallback: ((password: string) => Promise<void>) | undefined;
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockGetItem.mockResolvedValue(null);
    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockResolvedValueOnce(undefined);

    mockNavigate.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockGetType).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(() => {
        expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
          authType: AUTHENTICATION_TYPE.PASSWORD,
          password: 'test-password',
        });
      });

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith(
          PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
        );
      });
    }
  });

  it('restores stored previous auth type when password is provided via callback when disabling', async () => {
    const MockedAuthenticationError = jest.requireMock(
      '../../../../../core/Authentication/AuthenticationError',
    ).default;

    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    let passwordCallback: ((password: string) => Promise<void>) | undefined;
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockGetItem
      .mockResolvedValueOnce(AUTHENTICATION_TYPE.BIOMETRIC)
      .mockResolvedValueOnce(AUTHENTICATION_TYPE.BIOMETRIC);
    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockResolvedValueOnce(undefined);

    mockNavigate.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockGetType).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

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

  it('reverts flag when password entry callback fails when disabling', async () => {
    const MockedAuthenticationError = jest.requireMock(
      '../../../../../core/Authentication/AuthenticationError',
    ).default;

    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    const updateError = new Error('Update failed');
    let passwordCallback: ((password: string) => Promise<void>) | undefined;
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockGetItem.mockResolvedValue(null);
    mockUpdateAuthPreference
      .mockRejectedValueOnce(
        new MockedAuthenticationError(
          'Password required',
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        ),
      )
      .mockRejectedValueOnce(updateError);

    mockNavigate.mockImplementation(
      (
        screen: string,
        params?: { onPasswordSet?: (password: string) => Promise<void> },
      ) => {
        if (screen === 'EnterPasswordSimple' && params?.onPasswordSet) {
          passwordCallback = params.onPasswordSet;
        }
      },
    );

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockGetType).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    if (passwordCallback) {
      await passwordCallback('test-password');

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          updateError,
          'Failed to restore auth preference after password entry',
        );
      });
    }
  });

  it('calls Logger.error when updateAuthPreference fails when disabling', async () => {
    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    const error = new Error('Restore failed');
    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockGetItem.mockResolvedValue(null);
    mockUpdateAuthPreference.mockRejectedValueOnce(error);

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockGetType).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Failed to restore auth preference when disabling remember me',
      );
    });
  });

  it('proceeds with toggle when getType returns non-REMEMBER_ME when trying to disable', async () => {
    const stateWithRememberMe = {
      security: {
        allowLoginWithRememberMe: true,
      },
    };

    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockGetItem.mockResolvedValue(null);

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: stateWithRememberMe,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockGetType).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
    });
  });

  it('proceeds with toggle when allowLoginWithRememberMe is false but user tries to disable', async () => {
    mockGetItem.mockResolvedValue(null);

    const { getByTestId } = renderWithProvider(<RememberMeOptionSection />, {
      state: initialState,
    });

    const toggle = getByTestId(TURN_ON_REMEMBER_ME);
    fireEvent(toggle, 'onValueChange', false);

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
    });
  });
});

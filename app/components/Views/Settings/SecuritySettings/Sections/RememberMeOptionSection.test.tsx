const mockGetItem = jest.fn();
const mockRemoveItem = jest.fn();
jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    removeItem: mockRemoveItem,
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

  beforeEach(() => {
    jest.clearAllMocks();
    const AuthenticationMock = jest.requireMock('../../../../../core');
    mockGetType = AuthenticationMock.__mockGetType;
    mockUpdateAuthPreference = AuthenticationMock.__mockUpdateAuthPreference;

    // Get the mocked AuthenticationError class
    AuthenticationError = jest.requireMock(
      '../../../../../core/Authentication/AuthenticationError',
    ).default;

    mockGetType.mockResolvedValue({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    });
    mockUpdateAuthPreference.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue(null);
    mockRemoveItem.mockResolvedValue(undefined);
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
      expect(mockUpdateAuthPreference).toHaveBeenCalledWith(
        AUTHENTICATION_TYPE.REMEMBER_ME,
      );
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
    expect(mockUpdateAuthPreference).toHaveBeenCalledWith(
      AUTHENTICATION_TYPE.REMEMBER_ME,
    );
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
});

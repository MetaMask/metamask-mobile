import React from 'react';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import Login from './index';
import { fireEvent, act } from '@testing-library/react-native';
import { VAULT_ERROR } from './constants';

import { getVaultFromBackup } from '../../../core/BackupVault';
import { parseVaultValue } from '../../../util/validators';
import {
  SeedlessOnboardingControllerErrorMessage,
  RecoveryError as SeedlessOnboardingControllerRecoveryError,
} from '@metamask/seedless-onboarding-controller';

import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core';

// Mock dependencies
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { updateAuthTypeStorageFlags } from '../../../util/authentication';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockReset = jest.fn();
const mockGoBack = jest.fn();

const mockRoute = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
      reset: mockReset,
      goBack: mockGoBack,
    }),
    useRoute: () => mockRoute(),
  };
});
jest.mock('../../../util/authentication', () => ({
  updateAuthTypeStorageFlags: jest.fn(),
}));

jest.mock('../../../util/validators', () => ({
  parseVaultValue: jest.fn(),
}));

jest.mock('../../../core/BackupVault', () => ({
  getVaultFromBackup: jest.fn(),
}));

const mockGetVaultFromBackup = getVaultFromBackup as jest.Mock;

const mockParseVaultValue = parseVaultValue as jest.Mock;

describe('Login test suite 2', () => {
  describe('handleVaultCorruption', () => {
    beforeEach(() => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('handle vault corruption successfully with valid password', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce('mock-seed');

      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        });

      jest
        .spyOn(Authentication, 'storePassword')
        .mockResolvedValueOnce(undefined);

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(mockReplace).toHaveBeenCalledWith(
        Routes.VAULT_RECOVERY.RESTORE_WALLET,
        expect.objectContaining({
          params: {
            previousScreen: Routes.ONBOARDING.LOGIN,
          },
          screen: Routes.VAULT_RECOVERY.RESTORE_WALLET,
        }),
      );
    });

    it('show error for invalid password during vault corruption', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce(undefined);

      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'invalid-password');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });

    it('handle vault corruption when password requirements are not met', async () => {
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, '123'); // Too short password
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });

    it('handle vault corruption when backup has error', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: false,
        error: 'Backup error',
      });
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });

    it('handle vault corruption when storePassword fails', async () => {
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce('mock-seed');

      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        });

      jest
        .spyOn(Authentication, 'storePassword')
        .mockRejectedValueOnce(new Error('Store password failed'));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });

    it('handle vault corruption when vault seed cannot be parsed', async () => {
      mockGetVaultFromBackup.mockResolvedValueOnce({
        success: true,
        vault: 'mock-vault',
      });
      mockParseVaultValue.mockResolvedValueOnce(undefined);

      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error(VAULT_ERROR));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();
    });
  });

  describe('handleSeedlessOnboardingControllerError', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
    });

    afterEach(() => {
      jest.useRealTimers();
      mockRoute.mockClear();
    });

    it('handle seedless onboarding controller error with remaining time of > 0', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 1, numberOfAttempts: 1 },
      );

      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByTestId } = renderWithProvider(<Login />);

      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      const loginButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);
      await act(async () => {
        fireEvent.press(loginButton);
      });

      const errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        'Too many attempts. Please try again in 0m:1s',
      );
    });

    it('should handle countdown behavior and disable input during tooManyAttemptsError', async () => {
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 3, numberOfAttempts: 1 },
      );
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByTestId } = renderWithProvider(<Login />);

      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      let errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toEqual(
        'Too many attempts. Please try again in 0m:3s',
      );

      expect(passwordInput.props.editable).toBe(false);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual(
        'Too many attempts. Please try again in 0m:2s',
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      errorElement = getByTestId(LoginViewSelectors.PASSWORD_ERROR);
      expect(errorElement.props.children).toEqual(
        'Too many attempts. Please try again in 0m:1s',
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(() => getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toThrow();
      expect(passwordInput.props.editable).not.toBe(false);
    });

    it('should clean up timeout on component unmount during countdown', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const seedlessError = new SeedlessOnboardingControllerRecoveryError(
        SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts,
        { remainingTime: 5, numberOfAttempts: 1 },
      );
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(seedlessError);

      const { getByTestId, unmount } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeTruthy();

      await act(async () => {
        unmount();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('updateBiometryChoice', () => {
    it('update biometry choice to disabled', async () => {
      mockRoute.mockReturnValue({
        params: {
          locked: false,
          oauthLoginSuccess: true,
        },
      });
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValue(new Error('Error: Cancel'));

      const { getByTestId } = renderWithProvider(<Login />);
      const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'valid-password123');
      });
      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      expect(updateAuthTypeStorageFlags).toHaveBeenCalledWith(false);

      mockRoute.mockClear();
    });
  });
});

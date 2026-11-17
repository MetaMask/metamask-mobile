import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PasswordlessRecoveryDeveloperOptionsSection, {
  TRY_RECOVERY_BUTTON_TEST_ID,
} from './PasswordlessRecoveryDeveloperOptionsSection';
import { Authentication } from '../../../../core';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import {
  PasswordlessRecoverySetupError,
  setupPasswordlessRecovery,
} from '../../../../core/MfaRecovery/setupPasswordlessRecovery';

jest.mock('react-native-quick-crypto', () => ({
  randomBytes: jest.fn(),
}));

jest.mock('../../../../core', () => ({
  Authentication: {
    lockApp: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MfaRecoveryController: {},
      SeedlessOnboardingController: {
        state: {},
        getAccessToken: jest.fn(),
      },
      AuthenticationController: {
        requestMfaApproval: jest.fn(),
        getVerificationToken: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { reset: jest.fn() } },
}));

jest.mock(
  '../../../../core/Engine/controllers/mfa-recovery-controller/config',
  () => ({
    getCubistConfig: jest.fn(() => ({ authAudience: 'aud' })),
    getToprfRecoveryConfig: jest.fn(() => ({})),
  }),
);

jest.mock('../../../../core/MfaRecovery/setupPasswordlessRecovery', () => {
  const actual = jest.requireActual(
    '../../../../core/MfaRecovery/setupPasswordlessRecovery',
  );
  return {
    ...actual,
    setupPasswordlessRecovery: jest.fn(),
  };
});

jest.mock('../../../../core/MfaRecovery/linkSocialLogin', () => ({
  linkSocialLogin: jest.fn(),
}));

jest.mock('../../../../core/apiEnv', () => ({
  authEnv: jest.fn(() => 'dev'),
}));

jest.mock('../../../../util/identity/mfa/useMfa', () => ({
  useMfa: () => ({
    credentials: [],
    verifyOrEnroll: jest.fn().mockResolvedValue(undefined),
  }),
}));

const SETUP_BUTTON_TEST_ID = 'passwordless-recovery-dev-setup-button';
const SETUP_RESULT_TEST_ID = 'passwordless-recovery-dev-setup-result';

const mockLockApp = Authentication.lockApp as jest.Mock;
const mockReset = NavigationService.navigation?.reset as jest.Mock;
const mockSetup = jest.mocked(setupPasswordlessRecovery);

describe('PasswordlessRecoveryDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLockApp.mockResolvedValue(undefined);
    mockSetup.mockResolvedValue('enabled');
    Object.assign(NavigationService, {
      navigation: { reset: mockReset },
    });
  });

  it('locks without resetting the wallet and opens recovery', async () => {
    const { getByTestId } = renderWithProvider(
      <PasswordlessRecoveryDeveloperOptionsSection />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(TRY_RECOVERY_BUTTON_TEST_ID));
    });

    await waitFor(() => {
      expect(mockLockApp).toHaveBeenCalledTimes(1);
    });
    expect(mockLockApp).toHaveBeenCalledWith({
      reset: false,
      navigateToLogin: false,
      lockSeedless: false,
    });
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [
        {
          name: Routes.ONBOARDING.REHYDRATE,
          params: { isSeedlessPasswordOutdated: true },
        },
      ],
    });
  });

  it('does not open recovery when locking fails', async () => {
    mockLockApp.mockRejectedValueOnce(
      Object.assign(new Error('lock failed'), { code: 'lock_failed' }),
    );
    const { getByTestId, findByText } = renderWithProvider(
      <PasswordlessRecoveryDeveloperOptionsSection />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(TRY_RECOVERY_BUTTON_TEST_ID));
    });

    expect(
      await findByText(
        'Could not open recovery (lock_failed). The wallet was not reset.',
      ),
    ).toBeOnTheScreen();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('shows navigation unavailable when NavigationService has no navigator', async () => {
    Object.assign(NavigationService, { navigation: null });
    const { getByTestId, findByText } = renderWithProvider(
      <PasswordlessRecoveryDeveloperOptionsSection />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(TRY_RECOVERY_BUTTON_TEST_ID));
    });

    expect(
      await findByText(
        'Could not open recovery (navigation_unavailable). The wallet was not reset.',
      ),
    ).toBeOnTheScreen();
    expect(mockLockApp).not.toHaveBeenCalled();
  });

  it('shows the enabled message after setup succeeds', async () => {
    const { getByTestId, findByTestId } = renderWithProvider(
      <PasswordlessRecoveryDeveloperOptionsSection />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID));
    });

    expect(await findByTestId(SETUP_RESULT_TEST_ID)).toHaveTextContent(
      'Recovery is set up. Tap Recover with a new password. That does not reset the wallet.',
    );
    expect(mockSetup).toHaveBeenCalledTimes(1);
  });

  it('shows the already-enabled message when setup is a no-op', async () => {
    mockSetup.mockResolvedValueOnce('already_enabled');
    const { getByTestId, findByTestId } = renderWithProvider(
      <PasswordlessRecoveryDeveloperOptionsSection />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID));
    });

    expect(await findByTestId(SETUP_RESULT_TEST_ID)).toHaveTextContent(
      'Recovery is already set up. Tap Recover with a new password. That does not reset the wallet.',
    );
  });

  it('shows the setup failure message with detail when available', async () => {
    mockSetup.mockRejectedValueOnce(
      new PasswordlessRecoverySetupError(
        'social_identifier_not_approved',
        'passkey@metamask.io',
      ),
    );
    const { getByTestId, findByText } = renderWithProvider(
      <PasswordlessRecoveryDeveloperOptionsSection />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(SETUP_BUTTON_TEST_ID));
    });

    expect(
      await findByText(
        'Setup failed (social_identifier_not_approved: passkey@metamask.io). The wallet password is unchanged.',
      ),
    ).toBeOnTheScreen();
  });
});

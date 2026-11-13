import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PasswordlessRecoveryDeveloperOptionsSection, {
  TRY_RECOVERY_BUTTON_TEST_ID,
} from './PasswordlessRecoveryDeveloperOptionsSection';
import { Authentication } from '../../../../core';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';

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
  default: { context: {} },
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

jest.mock('../../../../core/MfaRecovery/setupPasswordlessRecovery', () => ({
  setupPasswordlessRecovery: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa/useMfa', () => ({
  useMfa: () => ({
    credentials: [],
    verifyOrEnroll: jest.fn(),
  }),
}));

const mockLockApp = Authentication.lockApp as jest.Mock;
const mockReset = NavigationService.navigation?.reset as jest.Mock;

describe('PasswordlessRecoveryDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLockApp.mockResolvedValue(undefined);
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
});

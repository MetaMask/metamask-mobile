import React from 'react';
import { Alert, AlertButton } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import NewWalletDeveloperOptionsSection, {
  NEW_WALLET_BUTTON_TEST_ID,
} from './NewWalletDeveloperOptionsSection';
import { Authentication } from '../../../../core';
import Engine from '../../../../core/Engine';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { getDevAutoUnlockPassword } from '../../../../util/environment';

jest.mock('@react-native-cookies/cookies', () => ({
  clearAll: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../../core', () => ({
  Authentication: {
    getPassword: jest.fn(),
    deleteWallet: jest.fn().mockResolvedValue(undefined),
    componentAuthenticationType: jest
      .fn()
      .mockResolvedValue({ currentAuthType: 'password' }),
    requestBiometricsAccessControlForIOS: jest
      .fn()
      .mockResolvedValue('password'),
    newWalletAndKeychain: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      RampsController: {
        state: {
          orders: [{ providerOrderId: 'order-1' }],
          autoramps: [{ id: 'autoramp-1' }],
        },
        transakResetState: jest.fn(),
        setIsApplyingOrderSyncChanges: jest.fn(),
        removeOrder: jest.fn(),
        removeAutoramp: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { reset: jest.fn() } },
}));

jest.mock('../../../../util/environment', () => ({
  ...jest.requireActual('../../../../util/environment'),
  getDevAutoUnlockPassword: jest.fn(),
}));

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockGetDevAutoUnlockPassword = getDevAutoUnlockPassword as jest.Mock;
const mockGetPassword = Authentication.getPassword as jest.Mock;
const { RampsController } = Engine.context;

const state = { security: { dataCollectionForMarketing: false } };

const pressAndConfirm = async (
  getByTestId: (id: string) => Parameters<typeof fireEvent.press>[0],
) => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  fireEvent.press(getByTestId(NEW_WALLET_BUTTON_TEST_ID));
  const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
  await act(async () => {
    await buttons[1].onPress?.();
  });
  return alertSpy;
};

describe('NewWalletDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDevAutoUnlockPassword.mockReturnValue('password123');
  });

  it('renders the heading and the button', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <NewWalletDeveloperOptionsSection />,
      { state },
    );

    expect(getByText('New wallet')).toBeOnTheScreen();
    expect(getByTestId(NEW_WALLET_BUTTON_TEST_ID)).toBeOnTheScreen();
  });

  it('asks for confirmation before wiping', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderWithProvider(
      <NewWalletDeveloperOptionsSection />,
      { state },
    );

    fireEvent.press(getByTestId(NEW_WALLET_BUTTON_TEST_ID));

    expect(alertSpy).toHaveBeenCalledWith(
      'Wipe wallet and create a new SRP?',
      expect.any(String),
      expect.any(Array),
    );
    expect(Authentication.deleteWallet).not.toHaveBeenCalled();
  });

  it('wipes the wallet, clears ramps state and creates a new one with the saved password', async () => {
    const { getByTestId } = renderWithProvider(
      <NewWalletDeveloperOptionsSection />,
      { state },
    );

    await pressAndConfirm(getByTestId);

    expect(Authentication.deleteWallet).toHaveBeenCalledTimes(1);
    expect(RampsController.transakResetState).toHaveBeenCalledTimes(1);
    expect(RampsController.removeOrder).toHaveBeenCalledWith('order-1');
    expect(RampsController.removeAutoramp).toHaveBeenCalledWith('autoramp-1');
    expect(
      RampsController.setIsApplyingOrderSyncChanges,
    ).toHaveBeenLastCalledWith(false);
    expect(Authentication.newWalletAndKeychain).toHaveBeenCalledWith(
      'password123',
      { currentAuthType: 'password' },
    );
    expect(NavigationService.navigation?.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
  });

  it('falls back to the keychain password when no env password is set', async () => {
    mockGetDevAutoUnlockPassword.mockReturnValue(undefined);
    mockGetPassword.mockResolvedValue({ password: 'keychain-password' });
    const { getByTestId } = renderWithProvider(
      <NewWalletDeveloperOptionsSection />,
      { state },
    );

    await pressAndConfirm(getByTestId);

    expect(Authentication.newWalletAndKeychain).toHaveBeenCalledWith(
      'keychain-password',
      expect.any(Object),
    );
  });

  it('does not wipe the wallet when no password is available', async () => {
    mockGetDevAutoUnlockPassword.mockReturnValue(undefined);
    mockGetPassword.mockResolvedValue(false);
    const { getByTestId } = renderWithProvider(
      <NewWalletDeveloperOptionsSection />,
      { state },
    );

    const alertSpy = await pressAndConfirm(getByTestId);

    expect(Authentication.deleteWallet).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenLastCalledWith(
      'No saved password',
      expect.any(String),
    );
  });

  it('shows the error when creating the wallet fails', async () => {
    (Authentication.newWalletAndKeychain as jest.Mock).mockRejectedValueOnce(
      new Error('keychain blew up'),
    );
    const { getByTestId } = renderWithProvider(
      <NewWalletDeveloperOptionsSection />,
      { state },
    );

    const alertSpy = await pressAndConfirm(getByTestId);

    expect(alertSpy).toHaveBeenLastCalledWith(
      'New wallet failed',
      'keychain blew up',
    );
    expect(NavigationService.navigation?.reset).not.toHaveBeenCalled();
  });
});

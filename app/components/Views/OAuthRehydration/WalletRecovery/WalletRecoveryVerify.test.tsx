import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WalletRecoveryVerify from './WalletRecoveryVerify';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

describe('WalletRecoveryVerify', () => {
  const onBack = jest.fn();
  const onCantUseThese = jest.fn();
  const onSelectMethod = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderVerify = (
    props: Partial<React.ComponentProps<typeof WalletRecoveryVerify>> = {},
  ) =>
    renderWithProvider(
      <WalletRecoveryVerify
        onBack={onBack}
        onCantUseThese={onCantUseThese}
        onSelectMethod={onSelectMethod}
        {...props}
      />,
    );

  it('renders Figma verify copy and recovery methods', () => {
    const { getByText, getByTestId } = renderVerify();

    expect(getByText('Wallet recovery')).toBeOnTheScreen();
    expect(getByText("Verify it's you")).toBeOnTheScreen();
    expect(
      getByText('Choose a security method to recover your wallet.'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoverySelectorsIDs.CANT_USE_THESE),
    ).toBeOnTheScreen();
  });

  it('notifies when the user picks a recovery method', () => {
    const { getByTestId } = renderVerify();

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP));

    expect(onSelectMethod).toHaveBeenCalledWith('passkey');
    expect(onSelectMethod).toHaveBeenCalledWith('password');
    expect(onSelectMethod).toHaveBeenCalledWith('email');
    expect(onSelectMethod).toHaveBeenCalledWith('totp');
  });

  it('hides optional methods when not enrolled', () => {
    const { queryByTestId } = renderVerify({
      showPasskey: false,
      showPassword: false,
      showEmail: false,
      showTotp: false,
    });

    expect(
      queryByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON),
    ).toBeNull();
    expect(queryByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL)).toBeNull();
    expect(queryByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP)).toBeNull();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD),
    ).toBeNull();
  });

  it('shows failure and offline copy when provided', () => {
    const { getByTestId, getByText } = renderVerify({
      error: 'Verification failed. Try again or choose another method.',
      isOffline: true,
    });

    expect(
      getByTestId(WalletRecoverySelectorsIDs.VERIFY_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoverySelectorsIDs.VERIFY_OFFLINE),
    ).toBeOnTheScreen();
    expect(
      getByText('Connect to the internet to use these methods.'),
    ).toBeOnTheScreen();
  });

  it('keeps password available offline while MFA methods are disabled', () => {
    const { getByTestId } = renderVerify({ isOffline: true });

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP));
    expect(onSelectMethod).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD));
    expect(onSelectMethod).toHaveBeenCalledWith('password');
  });

  it('notifies when the user cannot use any methods', () => {
    const { getByTestId } = renderVerify();

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.CANT_USE_THESE));
    expect(onCantUseThese).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WalletRecoveryVerify from './WalletRecoveryVerify';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

describe('WalletRecoveryVerify', () => {
  const onBack = jest.fn();
  const onSelectMethod = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Figma verify copy and recovery methods', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <WalletRecoveryVerify onBack={onBack} onSelectMethod={onSelectMethod} />,
    );

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
  });

  it('notifies when the user picks a recovery method', () => {
    const { getByTestId } = renderWithProvider(
      <WalletRecoveryVerify onBack={onBack} onSelectMethod={onSelectMethod} />,
    );

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
    const { queryByTestId } = renderWithProvider(
      <WalletRecoveryVerify
        showPasskey={false}
        showPassword={false}
        showEmail={false}
        showTotp={false}
        onBack={onBack}
        onSelectMethod={onSelectMethod}
      />,
    );

    expect(
      queryByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON),
    ).toBeNull();
    expect(queryByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL)).toBeNull();
    expect(queryByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP)).toBeNull();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD),
    ).toBeNull();
  });
});

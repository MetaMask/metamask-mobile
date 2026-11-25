import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import WalletRecoveryVerify from './WalletRecoveryVerify';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

describe('WalletRecoveryVerify', () => {
  const onBack = jest.fn();
  const onSelectMethod = jest.fn();
  const allMethods = {
    showPasskey: true,
    showPassword: true,
    showEmail: true,
    showTotp: true,
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderVerify = (
    props: Partial<React.ComponentProps<typeof WalletRecoveryVerify>> = {},
  ) =>
    renderWithProvider(
      <WalletRecoveryVerify
        onBack={onBack}
        onSelectMethod={onSelectMethod}
        {...props}
      />,
    );

  it('renders copy without methods until the host opts them in', () => {
    const { getByText, queryByTestId, queryByText } = renderVerify();

    expect(
      getByText(strings('wallet_recovery_mfa.verify_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('wallet_recovery_mfa.verify_description')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(strings('wallet_recovery_mfa.cant_use_these')),
    ).not.toBeOnTheScreen();
  });

  it('shows only the enrolled methods the host passes', () => {
    const { getByTestId, queryByTestId, queryByText } = renderVerify({
      showPasskey: true,
    });

    expect(
      getByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(strings('wallet_recovery_mfa.or')),
    ).not.toBeOnTheScreen();
  });

  it('renders Figma verify methods when the host opts them all in', () => {
    const { getByTestId, queryByText } = renderVerify(allMethods);

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
      queryByText(strings('wallet_recovery_mfa.cant_use_these')),
    ).not.toBeOnTheScreen();
  });

  it('notifies when the user picks a recovery method', () => {
    const { getByTestId } = renderVerify(allMethods);

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP));

    expect(onSelectMethod).toHaveBeenCalledWith('passkey');
    expect(onSelectMethod).toHaveBeenCalledWith('password');
    expect(onSelectMethod).toHaveBeenCalledWith('email');
    expect(onSelectMethod).toHaveBeenCalledWith('totp');
  });

  it('shows failure and offline copy when provided', () => {
    const error = strings('wallet_recovery_mfa.method_failed');
    const { getByTestId, getByText } = renderVerify({
      error,
      isOffline: true,
    });

    expect(
      getByTestId(WalletRecoverySelectorsIDs.VERIFY_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoverySelectorsIDs.VERIFY_OFFLINE),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('wallet_recovery_mfa.offline_reason')),
    ).toBeOnTheScreen();
    // Prefer the verify error when both are present.
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      error,
    );
  });

  it('announces the offline warning when there is no verify error', () => {
    renderVerify({ isOffline: true });

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      strings('wallet_recovery_mfa.offline_reason'),
    );
  });

  it('keeps password available offline while MFA methods are disabled', () => {
    const { getByTestId } = renderVerify({
      ...allMethods,
      isOffline: true,
    });

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL));
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_TOTP));
    expect(onSelectMethod).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD));
    expect(onSelectMethod).toHaveBeenCalledWith('password');
  });

  it('shows email without a password row', () => {
    const { getByTestId, queryByTestId } = renderVerify({ showEmail: true });

    expect(
      getByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD),
    ).not.toBeOnTheScreen();
  });

  it('ignores method presses while busy', () => {
    const { getByTestId } = renderVerify({
      showPassword: true,
      showEmail: true,
      showTotp: true,
      isBusy: true,
    });

    const passwordRow = getByTestId(WalletRecoverySelectorsIDs.METHOD_PASSWORD);
    const pressedStyle = passwordRow.props.style;
    if (typeof pressedStyle === 'function') {
      pressedStyle({ pressed: true });
      pressedStyle({ pressed: false });
    }

    fireEvent.press(passwordRow);
    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.METHOD_EMAIL));

    expect(onSelectMethod).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import WalletRecoveryVerify from './WalletRecoveryVerify';
import { WalletRecoveryVerifySelectorsIDs } from './WalletRecoveryVerify.testIds';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('WalletRecoveryVerify', () => {
  const onBack = jest.fn();
  const onSelectMethod = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderVerify = (
    props: Partial<React.ComponentProps<typeof WalletRecoveryVerify>> = {},
  ) =>
    render(
      <ThemeContext.Provider value={mockTheme}>
        <WalletRecoveryVerify
          onBack={onBack}
          onSelectMethod={onSelectMethod}
          {...props}
        />
      </ThemeContext.Provider>,
    );

  it('shows only the methods the host opts into', () => {
    const { getByTestId, queryByTestId } = renderVerify({
      showPasskey: true,
      showPassword: true,
      showTotp: true,
    });

    expect(
      getByTestId(WalletRecoveryVerifySelectorsIDs.USE_PASSKEY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoveryVerifySelectorsIDs.METHOD_PASSWORD),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoveryVerifySelectorsIDs.METHOD_TOTP),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoveryVerifySelectorsIDs.METHOD_EMAIL),
    ).toBeNull();
  });

  it('calls onSelectMethod for passkey and secondary rows', () => {
    const { getByTestId } = renderVerify({
      showPasskey: true,
      showPassword: true,
      showEmail: true,
      showTotp: true,
    });

    fireEvent.press(
      getByTestId(WalletRecoveryVerifySelectorsIDs.USE_PASSKEY_BUTTON),
    );
    fireEvent.press(
      getByTestId(WalletRecoveryVerifySelectorsIDs.METHOD_PASSWORD),
    );
    fireEvent.press(getByTestId(WalletRecoveryVerifySelectorsIDs.METHOD_EMAIL));
    fireEvent.press(getByTestId(WalletRecoveryVerifySelectorsIDs.METHOD_TOTP));

    expect(onSelectMethod).toHaveBeenCalledWith('passkey');
    expect(onSelectMethod).toHaveBeenCalledWith('password');
    expect(onSelectMethod).toHaveBeenCalledWith('email');
    expect(onSelectMethod).toHaveBeenCalledWith('totp');
  });

  it('disables MFA rows when offline but keeps password available', () => {
    const { getByTestId } = renderVerify({
      showPasskey: true,
      showPassword: true,
      showTotp: true,
      isOffline: true,
    });

    expect(
      getByTestId(WalletRecoveryVerifySelectorsIDs.VERIFY_OFFLINE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoveryVerifySelectorsIDs.USE_PASSKEY_BUTTON),
    ).toBeDisabled();
    expect(
      getByTestId(WalletRecoveryVerifySelectorsIDs.METHOD_TOTP),
    ).toBeDisabled();
    expect(
      getByTestId(WalletRecoveryVerifySelectorsIDs.METHOD_PASSWORD),
    ).not.toBeDisabled();
  });

  it('renders optional description override', () => {
    const { getByText } = renderVerify({
      description: 'Change password verify copy',
    });

    expect(getByText('Change password verify copy')).toBeOnTheScreen();
  });
});

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { LoginViewSelectors } from '../../Login/LoginView.testIds';
import WalletRecoveryPassword from './WalletRecoveryPassword';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    HeaderStandard: ({
      onBack,
      backButtonProps,
    }: {
      onBack?: () => void;
      backButtonProps?: { isDisabled?: boolean };
    }) => (
      <ReactNative.View>
        <ReactNative.Pressable
          testID="wallet-recovery-password-back"
          disabled={backButtonProps?.isDisabled}
          onPress={onBack}
        />
      </ReactNative.View>
    ),
  };
});

const renderPassword = (
  overrides: Partial<React.ComponentProps<typeof WalletRecoveryPassword>> = {},
) => {
  const props = {
    password: '',
    onChangePassword: jest.fn(),
    onSubmit: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  };
  return {
    props,
    ...renderWithProvider(<WalletRecoveryPassword {...props} />),
  };
};

describe('WalletRecoveryPassword', () => {
  it('renders the password step with expected testIDs', () => {
    const { getByTestId, getByText } = renderPassword();

    expect(getByTestId(LoginViewSelectors.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoverySelectorsIDs.PASSWORD_SCREEN),
    ).toBeOnTheScreen();
    expect(getByTestId(LoginViewSelectors.PASSWORD_INPUT)).toBeOnTheScreen();
    expect(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID)).toBeOnTheScreen();
    expect(
      getByText(strings('wallet_recovery_mfa.verify_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('wallet_recovery_mfa.password_description')),
    ).toBeOnTheScreen();
  });

  it('disables submit while the password is empty', () => {
    const { getByTestId } = renderPassword({ password: '' });

    expect(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID)).toBeDisabled();
  });

  it('submits when the password is non-empty', () => {
    const { getByTestId, props } = renderPassword({
      password: 'new-password',
    });

    fireEvent.press(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID));

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('forwards password text changes', () => {
    const { getByTestId, props } = renderPassword();

    fireEvent.changeText(
      getByTestId(LoginViewSelectors.PASSWORD_INPUT),
      'typed-password',
    );

    expect(props.onChangePassword).toHaveBeenCalledWith('typed-password');
  });

  it('shows an error message when provided', () => {
    const { getByTestId, getByText } = renderPassword({
      password: 'x',
      error: 'Recovery failed',
    });

    expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeOnTheScreen();
    expect(getByText('Recovery failed')).toBeOnTheScreen();
  });

  it('toggles password visibility', () => {
    const { getByTestId } = renderPassword({ password: 'secret' });

    expect(
      getByTestId(LoginViewSelectors.PASSWORD_INPUT).props.secureTextEntry,
    ).toBe(true);

    fireEvent.press(
      getByTestId(WalletRecoverySelectorsIDs.PASSWORD_VISIBILITY),
    );

    expect(
      getByTestId(LoginViewSelectors.PASSWORD_INPUT).props.secureTextEntry,
    ).toBe(false);
  });

  it('calls onBack from the header', () => {
    const { getByTestId, props } = renderPassword();

    fireEvent.press(getByTestId('wallet-recovery-password-back'));

    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps submit disabled while loading', () => {
    const { getByTestId } = renderPassword({
      password: 'new-password',
      isLoading: true,
    });

    expect(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID)).toBeDisabled();
  });
});

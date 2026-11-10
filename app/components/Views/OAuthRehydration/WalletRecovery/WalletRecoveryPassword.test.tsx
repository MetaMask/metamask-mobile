import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WalletRecoveryPassword from './WalletRecoveryPassword';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

describe('WalletRecoveryPassword', () => {
  const onBack = jest.fn();
  const onChangePassword = jest.fn();
  const onContinue = jest.fn();
  const onForgotPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPassword = (
    props: Partial<React.ComponentProps<typeof WalletRecoveryPassword>> = {},
  ) =>
    renderWithProvider(
      <WalletRecoveryPassword
        password=""
        error={null}
        onBack={onBack}
        onChangePassword={onChangePassword}
        onContinue={onContinue}
        {...props}
      />,
    );

  it('renders password copy and continue control', () => {
    const { getByText, getByTestId } = renderPassword();

    expect(getByText('Password')).toBeOnTheScreen();
    expect(getByText('Enter the password for this wallet.')).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoverySelectorsIDs.PASSWORD_CONTINUE),
    ).toBeOnTheScreen();
  });

  it('notifies password changes and continue when enabled', () => {
    const { getByTestId, rerender } = renderPassword({ password: '' });

    fireEvent.changeText(
      getByTestId(WalletRecoverySelectorsIDs.PASSWORD_INPUT),
      'secret',
    );
    expect(onChangePassword).toHaveBeenCalledWith('secret');

    rerender(
      <WalletRecoveryPassword
        password="secret"
        error={null}
        onBack={onBack}
        onChangePassword={onChangePassword}
        onContinue={onContinue}
      />,
    );

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.PASSWORD_CONTINUE));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('shows an error and forgot-password when provided', () => {
    const { getByTestId, getByText } = renderPassword({
      password: 'x',
      error: 'Wrong password',
      showForgotPassword: true,
      onForgotPassword,
    });

    expect(
      getByTestId(WalletRecoverySelectorsIDs.PASSWORD_ERROR),
    ).toBeOnTheScreen();
    expect(getByText('Wrong password')).toBeOnTheScreen();

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.PASSWORD_FORGOT));
    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('hides forgot password when not requested', () => {
    const { queryByTestId } = renderPassword({
      showForgotPassword: false,
      onForgotPassword,
    });

    expect(
      queryByTestId(WalletRecoverySelectorsIDs.PASSWORD_FORGOT),
    ).toBeNull();
  });

  it('disables continue while busy or empty', () => {
    const { getByTestId, rerender } = renderPassword({
      password: '',
      isBusy: false,
    });

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.PASSWORD_CONTINUE));
    expect(onContinue).not.toHaveBeenCalled();

    rerender(
      <WalletRecoveryPassword
        password="secret"
        error={null}
        isBusy
        onBack={onBack}
        onChangePassword={onChangePassword}
        onContinue={onContinue}
      />,
    );

    fireEvent.press(getByTestId(WalletRecoverySelectorsIDs.PASSWORD_CONTINUE));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('invokes onBack from the header control', () => {
    const { getAllByTestId } = renderPassword({ password: 'x' });

    fireEvent.press(getAllByTestId('button-icon')[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('submits from the password field when continue is allowed', () => {
    const { getByTestId } = renderPassword({ password: 'secret' });

    fireEvent(
      getByTestId(WalletRecoverySelectorsIDs.PASSWORD_INPUT),
      'submitEditing',
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

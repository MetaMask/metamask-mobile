import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';
import SignInWalletFields from './SignInWalletFields';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../components/MoneyAccountRow/MoneyAccountRow', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MoneyAccountIdentity: () =>
      ReactActual.createElement(
        Text,
        { testID: 'money-account-identity' },
        'Money account',
      ),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: ({ children, testID }: React.PropsWithChildren<{ testID?: string }>) =>
      ReactActual.createElement(View, { testID }, children),
    Text: ({
      children,
      testID,
    }: React.PropsWithChildren<{ testID?: string }>) =>
      ReactActual.createElement(Text, { testID }, children),
    Label: ({ children }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(Text, null, children),
    Icon: () => null,
    AvatarAccount: () =>
      ReactActual.createElement(View, { testID: 'sign-in-account-avatar' }),
    FontWeight: { Medium: 'Medium' },
    TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm' },
    IconName: { ArrowLeft: 'ArrowLeft' },
    IconSize: { Sm: 'Sm' },
    AvatarBaseSize: { Sm: 'Sm' },
    AvatarAccountVariant: {
      Jazzicon: 'Jazzicon',
      Blockies: 'Blockies',
      Maskicon: 'Maskicon',
    },
  };
});

const renderFields = (
  overrides: Partial<React.ComponentProps<typeof SignInWalletFields>> = {},
) => {
  const onSelectAccount = jest.fn();
  const view = render(
    <SignInWalletFields
      origin="linked"
      avatarAccountType="Maskicon"
      walletError={null}
      showSoftLink={false}
      onSelectAccount={onSelectAccount}
      onUseCurrentCard={jest.fn()}
      {...overrides}
    />,
  );
  return { ...view, onSelectAccount };
};

describe('SignInWalletFields', () => {
  it('lets the user pick an account when the row is not locked', () => {
    const { getByTestId, queryByTestId, onSelectAccount } = renderFields();

    expect(queryByTestId('sign-in-account-avatar')).toBeNull();
    fireEvent.press(getByTestId(CardAuthenticationSelectors.ACCOUNT_SELECT));
    expect(onSelectAccount).toHaveBeenCalledTimes(1);
  });

  it('shows the account avatar when an address is available', () => {
    const { getByTestId } = renderFields({
      displayAccountAddress: '0x1234567890123456789012345678901234567890',
      displayAccountLabel: 'Account 1',
    });

    expect(getByTestId('sign-in-account-avatar')).toBeTruthy();
  });

  it('locks the row to the Money account', () => {
    const { getByTestId, queryByTestId, onSelectAccount } = renderFields({
      lockToMoneyAccount: true,
    });

    expect(getByTestId('money-account-identity')).toBeTruthy();
    expect(queryByTestId('sign-in-account-avatar')).toBeNull();
    expect(onSelectAccount).not.toHaveBeenCalled();
  });
});

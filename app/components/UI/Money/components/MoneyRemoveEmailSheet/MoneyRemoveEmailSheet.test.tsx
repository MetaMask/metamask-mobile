import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyRemoveEmailSheet from './MoneyRemoveEmailSheet';

const mockNavigate = jest.fn();
const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
let mockPasskeyCount = 1;
let mockIsAuthenticatorAdded = false;
let mockIsSmsAdded = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({ passkeyCount: mockPasskeyCount }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isAuthenticatorAdded: mockIsAuthenticatorAdded,
    isSmsAdded: mockIsSmsAdded,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockCloseBottomSheet,
        }));
        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

describe('MoneyRemoveEmailSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPasskeyCount = 1;
    mockIsAuthenticatorAdded = false;
    mockIsSmsAdded = false;
  });

  it('starts verified removal when another method exists', () => {
    const { getByText } = renderWithProvider(<MoneyRemoveEmailSheet />);

    expect(getByText('Remove email')).toBeOnTheScreen();
    fireEvent.press(getByText('Remove'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
      params: { action: { type: 'remove-email' } },
    });
  });

  it('blocks removal when email is the only method', () => {
    mockPasskeyCount = 0;
    const { getByText, queryByText } = renderWithProvider(
      <MoneyRemoveEmailSheet />,
    );

    expect(getByText('Email can’t be deleted')).toBeOnTheScreen();
    expect(
      getByText(
        'Email is the only security method for this account. Add a second method before removing it.',
      ),
    ).toBeOnTheScreen();
    expect(queryByText('Remove')).not.toBeOnTheScreen();
    expect(getByText('Got it')).toBeOnTheScreen();
  });
});

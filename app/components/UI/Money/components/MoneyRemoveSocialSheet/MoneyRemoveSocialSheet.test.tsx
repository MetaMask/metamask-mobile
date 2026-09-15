import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyRemoveSocialSheet from './MoneyRemoveSocialSheet';
import { MoneyRemoveSocialSheetTestIds } from './MoneyRemoveSocialSheet.testIds';

const mockRemoveSocial = jest.fn();
const mockShowSuccessToast = jest.fn();
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

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isAuthenticatorAdded: mockIsAuthenticatorAdded,
    isSmsAdded: mockIsSmsAdded,
    removeSocial: mockRemoveSocial,
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({ passkeyCount: mockPasskeyCount }),
}));

jest.mock('../../hooks/useMoneySecurityToast', () => ({
  useMoneySecurityToast: () => mockShowSuccessToast,
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockCloseBottomSheet,
        }));
        return <View>{children}</View>;
      },
    ),
  };
});

describe('MoneyRemoveSocialSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPasskeyCount = 1;
    mockIsAuthenticatorAdded = false;
    mockIsSmsAdded = false;
  });

  it('removes the social login and returns to security settings', () => {
    const { getByTestId } = renderWithProvider(<MoneyRemoveSocialSheet />);

    fireEvent.press(getByTestId(MoneyRemoveSocialSheetTestIds.CONFIRM_BUTTON));

    expect(mockRemoveSocial).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY);
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Social login removed');
  });

  it('prevents removing the final security method', () => {
    mockPasskeyCount = 0;
    const { getByText, queryByTestId } = renderWithProvider(
      <MoneyRemoveSocialSheet />,
    );

    expect(getByText('Social login cannot be removed')).toBeOnTheScreen();
    expect(
      getByText(
        'This social login is the only security method for your wallet and cannot be removed. Add a second method before removing it.',
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyRemoveSocialSheetTestIds.CONFIRM_BUTTON),
    ).toBeNull();
  });
});

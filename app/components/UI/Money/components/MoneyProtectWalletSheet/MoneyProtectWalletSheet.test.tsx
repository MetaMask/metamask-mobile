import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyProtectWalletSheet from './MoneyProtectWalletSheet';
import { MoneyProtectWalletSheetTestIds } from './MoneyProtectWalletSheet.testIds';

const mockNavigate = jest.fn();
const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
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

describe('MoneyProtectWalletSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the existing passkey benefits', () => {
    const { getByText } = renderWithProvider(<MoneyProtectWalletSheet />);

    expect(getByText('Protect your wallet')).toBeOnTheScreen();
    expect(
      getByText(
        'Get an extra layer of protection in case you lose your wallet or your login is compromised.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Log in with Face ID')).toBeOnTheScreen();
    expect(getByText('Syncs across devices automatically')).toBeOnTheScreen();
    expect(getByText('Verify Money account transfers')).toBeOnTheScreen();
  });

  it('continues into the existing Add passkey sheet', () => {
    const { getByTestId } = renderWithProvider(<MoneyProtectWalletSheet />);

    fireEvent.press(
      getByTestId(MoneyProtectWalletSheetTestIds.ADD_PASSKEY_BUTTON),
    );

    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
    });
  });

  it('dismisses when Not now is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyProtectWalletSheet />);

    fireEvent.press(getByTestId(MoneyProtectWalletSheetTestIds.NOT_NOW_BUTTON));

    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

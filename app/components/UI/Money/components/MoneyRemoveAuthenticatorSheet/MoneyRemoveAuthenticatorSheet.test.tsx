import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyRemoveAuthenticatorSheet from './MoneyRemoveAuthenticatorSheet';
import { MoneyRemoveAuthenticatorSheetTestIds } from './MoneyRemoveAuthenticatorSheet.testIds';

const mockNavigate = jest.fn();
const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
let mockPasskeyCount = 1;
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
    isSmsAdded: mockIsSmsAdded,
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    passkeyCount: mockPasskeyCount,
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

describe('MoneyRemoveAuthenticatorSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPasskeyCount = 1;
    mockIsSmsAdded = false;
  });

  it('removes the authenticator and returns to security settings', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyRemoveAuthenticatorSheet />,
    );

    expect(getByText('Remove authenticator app')).toBeOnTheScreen();
    expect(
      getByText(
        "You'll no longer be able to log in or verify transactions by receiving a code in the app.",
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneyRemoveAuthenticatorSheetTestIds.CONFIRM_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
      params: {
        action: { type: 'remove-authenticator' },
      },
    });
  });

  it('prevents removing the only security method', () => {
    mockPasskeyCount = 0;
    const { getByText, queryByTestId } = renderWithProvider(
      <MoneyRemoveAuthenticatorSheet />,
    );

    expect(getByText("Authenticator app can't be removed")).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyRemoveAuthenticatorSheetTestIds.CONFIRM_BUTTON),
    ).not.toBeOnTheScreen();
  });
});

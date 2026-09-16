import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyDeletePasskeySheet from './MoneyDeletePasskeySheet';
import { MoneyDeletePasskeySheetTestIds } from './MoneyDeletePasskeySheet.testIds';

const mockNavigate = jest.fn();
const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
let mockHasAlternativeSecurityMethod = true;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: { passkeyIndex: 0 },
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    passkeys: [{ name: 'Passkey #1' }],
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    hasAlternativeSecurityMethod: mockHasAlternativeSecurityMethod,
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

describe('MoneyDeletePasskeySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasAlternativeSecurityMethod = true;
  });

  it('confirms deletion in the bottom sheet', () => {
    const { getByTestId, getAllByText } = renderWithProvider(
      <MoneyDeletePasskeySheet />,
    );

    expect(getAllByText('Delete passkey')).toHaveLength(2);
    fireEvent.press(getByTestId(MoneyDeletePasskeySheetTestIds.CONFIRM_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
      params: {
        action: { type: 'delete-passkey', passkeyIndex: 0 },
      },
    });
  });

  it('prevents deleting the only security method', () => {
    mockHasAlternativeSecurityMethod = false;
    const { getByText, queryByTestId } = renderWithProvider(
      <MoneyDeletePasskeySheet />,
    );

    expect(getByText("Passkey can't be deleted")).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyDeletePasskeySheetTestIds.CONFIRM_BUTTON),
    ).not.toBeOnTheScreen();
  });
});

import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyDeletePasskeySheet from './MoneyDeletePasskeySheet';
import { MoneyDeletePasskeySheetTestIds } from './MoneyDeletePasskeySheet.testIds';

const mockDeletePasskey = jest.fn();
const mockShowSuccessToast = jest.fn();
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
    deletePasskey: mockDeletePasskey,
    passkeys: [{ name: 'Passkey #1' }],
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    hasAlternativeSecurityMethod: mockHasAlternativeSecurityMethod,
  }),
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
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockHasAlternativeSecurityMethod = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('confirms deletion in the bottom sheet', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyDeletePasskeySheet />,
    );

    expect(getByText('Delete passkey')).toBeOnTheScreen();
    fireEvent.press(getByTestId(MoneyDeletePasskeySheetTestIds.CONFIRM_BUTTON));
    act(() => jest.advanceTimersByTime(900));

    expect(mockDeletePasskey).toHaveBeenCalledWith(0);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.PASSKEYS, {
      entryPoint: 'security',
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Passkey deleted');
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

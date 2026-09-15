import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyRemoveSmsSheet from './MoneyRemoveSmsSheet';
import { MoneyRemoveSmsSheetTestIds } from './MoneyRemoveSmsSheet.testIds';

const mockNavigate = jest.fn();
const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
let mockPasskeyCount = 1;
let mockIsAuthenticatorAdded = false;

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

describe('MoneyRemoveSmsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPasskeyCount = 1;
    mockIsAuthenticatorAdded = false;
  });

  it('removes SMS and returns to security settings', () => {
    const { getByTestId } = renderWithProvider(<MoneyRemoveSmsSheet />);

    fireEvent.press(getByTestId(MoneyRemoveSmsSheetTestIds.CONFIRM_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.SECURITY_VERIFICATION,
      {
        action: { type: 'remove-sms' },
      },
    );
  });

  it('prevents removing the only security method', () => {
    mockPasskeyCount = 0;
    const { getByText, queryByTestId } = renderWithProvider(
      <MoneyRemoveSmsSheet />,
    );

    expect(getByText("SMS can't be removed")).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyRemoveSmsSheetTestIds.CONFIRM_BUTTON),
    ).not.toBeOnTheScreen();
  });
});

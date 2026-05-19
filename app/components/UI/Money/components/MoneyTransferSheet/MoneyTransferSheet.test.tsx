import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyTransferSheet from './MoneyTransferSheet';
import { MoneyTransferSheetTestIds } from './MoneyTransferSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';

const mockInitiateWithdrawal = jest.fn().mockResolvedValue(undefined);
const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountWithdrawal: jest.fn(),
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return <View testID={testID}>{children}</View>;
    },
  );
  const MockBottomSheetHeader = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View>{children}</View>;
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

describe('MoneyTransferSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
    (useMoneyAccountWithdrawal as jest.Mock).mockReturnValue({
      initiateWithdrawal: mockInitiateWithdrawal,
    });
  });

  it('renders the sheet title', () => {
    const { getByText } = renderWithProvider(<MoneyTransferSheet />);

    expect(getByText(strings('money.transfer_sheet.title'))).toBeOnTheScreen();
  });

  it('renders all five list items', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    expect(
      getByTestId(MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyTransferSheetTestIds.SEND_EXTERNAL_ROW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyTransferSheetTestIds.WITHDRAW_TO_BANK_ROW),
    ).toBeOnTheScreen();
  });

  it('renders "Coming soon" tags on the last two items', () => {
    const { getAllByText } = renderWithProvider(<MoneyTransferSheet />);

    const comingSoonTags = getAllByText(
      strings('money.add_money_sheet.coming_soon'),
    );
    expect(comingSoonTags).toHaveLength(2);
  });

  it('closes the sheet and calls initiateWithdrawal when "Between accounts" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateWithdrawal).toHaveBeenCalledTimes(1);
    expect(global.alert).not.toHaveBeenCalled();
  });

  it('closes the sheet and calls initiateWithdrawal when "Perps account" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateWithdrawal).toHaveBeenCalledTimes(1);
    expect(global.alert).not.toHaveBeenCalled();
  });

  it('closes the sheet and calls initiateWithdrawal when "Predictions account" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateWithdrawal).toHaveBeenCalledTimes(1);
    expect(global.alert).not.toHaveBeenCalled();
  });
});

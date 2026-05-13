import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyMoreSheet from './MoneyMoreSheet';
import { MoneyMoreSheetTestIds } from './MoneyMoreSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import AppConstants from '../../../../../core/AppConstants';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
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

describe('MoneyMoreSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it('renders all three menu options', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    expect(
      getByTestId(MoneyMoreSheetTestIds.HOW_IT_WORKS_OPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMoreSheetTestIds.WHAT_YOU_GET_OPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION),
    ).toBeOnTheScreen();
  });

  it('renders the sheet title', () => {
    const { getByText } = renderWithProvider(<MoneyMoreSheet />);

    expect(getByText(strings('money.more_sheet.title'))).toBeOnTheScreen();
  });

  it('navigates to MoneyHowItWorks when "How it works" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.HOW_IT_WORKS_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.HOW_IT_WORKS);
  });

  it('opens the mUSD learn more URL when "What you get" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.WHAT_YOU_GET_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith(
      AppConstants.URLS.MUSD_LEARN_MORE,
    );
  });

  it('opens the MetaMask support URL when "Contact support" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith(METAMASK_SUPPORT_URL);
  });
});

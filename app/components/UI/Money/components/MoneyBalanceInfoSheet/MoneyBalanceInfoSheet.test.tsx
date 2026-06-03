import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyBalanceInfoSheet from './MoneyBalanceInfoSheet';
import { MoneyBalanceInfoSheetTestIds } from './MoneyBalanceInfoSheet.testIds';
import { strings } from '../../../../../../locales/i18n';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();

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
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
        goBack,
      }: {
        children: React.ReactNode;
        testID?: string;
        goBack?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(
          Pressable,
          {
            testID: 'bottom-sheet-go-back',
            onPress: goBack,
          },
          ReactActual.createElement(RNText, {}, 'go-back'),
        ),
        children,
      );
    },
  );

  const MockBottomSheetHeader = ({
    children,
    onClose,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'bottom-sheet-header' },
      ReactActual.createElement(
        Pressable,
        { testID: 'bottom-sheet-close-button', onPress: onClose },
        ReactActual.createElement(RNText, {}, 'close'),
      ),
      children,
    );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

describe('MoneyBalanceInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyBalanceInfoSheet />);

    expect(
      getByTestId(MoneyBalanceInfoSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the sheet title', () => {
    const { getByTestId } = renderWithProvider(<MoneyBalanceInfoSheet />);

    expect(getByTestId(MoneyBalanceInfoSheetTestIds.TITLE)).toHaveTextContent(
      strings('money.balance_card.info_sheet_title'),
    );
  });

  it('renders the body copy', () => {
    const { getByTestId } = renderWithProvider(<MoneyBalanceInfoSheet />);

    expect(getByTestId(MoneyBalanceInfoSheetTestIds.BODY)).toHaveTextContent(
      strings('money.balance_card.info_sheet_body'),
    );
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyBalanceInfoSheet />);

    fireEvent.press(getByTestId('bottom-sheet-close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('navigates back when the BottomSheet goBack handler is invoked', () => {
    const { getByTestId } = renderWithProvider(<MoneyBalanceInfoSheet />);

    fireEvent.press(getByTestId('bottom-sheet-go-back'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

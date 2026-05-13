import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyEarningsInfoSheet from './MoneyEarningsInfoSheet';
import { MoneyEarningsInfoSheetTestIds } from './MoneyEarningsInfoSheet.testIds';
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
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(View, { testID }, children);
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

describe('MoneyEarningsInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(
      getByTestId(MoneyEarningsInfoSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the sheet title', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(
      getByText(strings('money.earnings_tooltip.title')),
    ).toBeOnTheScreen();
  });

  it('renders the body paragraph', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(getByText(strings('money.earnings_tooltip.body'))).toBeOnTheScreen();
  });

  it('renders the Got It footer button', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(
      getByTestId(MoneyEarningsInfoSheetTestIds.GOT_IT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders the correct label on the Got It button', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(getByText(strings('browser.got_it'))).toBeOnTheScreen();
  });

  it('closes the sheet when the Got It button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsInfoSheet />);

    fireEvent.press(getByTestId(MoneyEarningsInfoSheetTestIds.GOT_IT_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsInfoSheet />);

    fireEvent.press(getByTestId('bottom-sheet-close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});

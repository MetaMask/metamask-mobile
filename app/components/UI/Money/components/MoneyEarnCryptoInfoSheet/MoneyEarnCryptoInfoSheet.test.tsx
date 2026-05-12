import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyEarnCryptoInfoSheet from './MoneyEarnCryptoInfoSheet';
import { MoneyEarnCryptoInfoSheetTestIds } from './MoneyEarnCryptoInfoSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
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

describe('MoneyEarnCryptoInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      apyPercent: 4,
    });
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarnCryptoInfoSheet />);

    expect(
      getByTestId(MoneyEarnCryptoInfoSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the sheet title', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEarnCryptoInfoSheet />,
    );

    expect(
      getByTestId(MoneyEarnCryptoInfoSheetTestIds.TITLE),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.earn_crypto_info_sheet.title')),
    ).toBeOnTheScreen();
  });

  it('renders the body paragraph', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEarnCryptoInfoSheet />,
    );

    expect(getByTestId(MoneyEarnCryptoInfoSheetTestIds.BODY)).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.earn_crypto_info_sheet.body', { percentage: 4 }),
      ),
    ).toBeOnTheScreen();
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarnCryptoInfoSheet />);

    fireEvent.press(getByTestId('bottom-sheet-close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});

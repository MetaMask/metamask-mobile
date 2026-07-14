import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyEarnCryptoInfoSheet from './MoneyEarnCryptoInfoSheet';
import { MoneyEarnCryptoInfoSheetTestIds } from './MoneyEarnCryptoInfoSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
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
          { testID: 'bottom-sheet-go-back-trigger', onPress: goBack },
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

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('MoneyEarnCryptoInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
    });
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

  it('navigates back when the bottom sheet goBack handler fires', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarnCryptoInfoSheet />);

    fireEvent.press(getByTestId('bottom-sheet-go-back-trigger'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not render the deposit title without a variant', () => {
    const { queryByText } = renderWithProvider(<MoneyEarnCryptoInfoSheet />);

    expect(
      queryByText(strings('money.earn_crypto_info_sheet.deposit_title')),
    ).toBeNull();
  });

  describe('when variant is deposit', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ variant: 'deposit' });
    });

    it('renders the deposit title', () => {
      const { getByText } = renderWithProvider(<MoneyEarnCryptoInfoSheet />);

      expect(
        getByText(strings('money.earn_crypto_info_sheet.deposit_title')),
      ).toBeOnTheScreen();
    });

    it('does not render the default title', () => {
      const { queryByText } = renderWithProvider(<MoneyEarnCryptoInfoSheet />);

      expect(
        queryByText(strings('money.earn_crypto_info_sheet.title')),
      ).toBeNull();
    });

    it('renders the body paragraph', () => {
      const { getByText } = renderWithProvider(<MoneyEarnCryptoInfoSheet />);

      expect(
        getByText(
          strings('money.earn_crypto_info_sheet.body', { percentage: 4 }),
        ),
      ).toBeOnTheScreen();
    });
  });

  it('renders the body when APY is unavailable', () => {
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      apyPercent: undefined,
    });
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEarnCryptoInfoSheet />,
    );

    expect(getByTestId(MoneyEarnCryptoInfoSheetTestIds.BODY)).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.earn_crypto_info_sheet.body', { percentage: '-' }),
      ),
    ).toBeOnTheScreen();
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_EARN_CRYPTO_INFO_SHEET bottom_sheet_name', () => {
      renderWithProvider(<MoneyEarnCryptoInfoSheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_EARN_CRYPTO_INFO_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyEarnCryptoInfoSheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });
  });
});

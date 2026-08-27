import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyEarningsInfoSheet from './MoneyEarningsInfoSheet';
import { MoneyEarningsInfoSheetTestIds } from './MoneyEarningsInfoSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

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

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ({
    children,
    testID,
    goBack,
  }: {
    children: React.ReactNode;
    testID?: string;
    goBack?: () => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID },
      ReactActual.createElement(
        Pressable,
        { testID: 'bottom-sheet-dismiss', onPress: goBack },
        ReactActual.createElement(RNText, {}, 'dismiss'),
      ),
      children,
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
      onClose
        ? ReactActual.createElement(
            Pressable,
            { testID: 'bottom-sheet-close-button', onPress: onClose },
            ReactActual.createElement(RNText, {}, 'close'),
          )
        : null,
      children,
    );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('MoneyEarningsInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ variant: 'monthly' });
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
    });
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(
      getByTestId(MoneyEarningsInfoSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the monthly earnings title and body', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(
      getByText(strings('money.earnings_tooltip.monthly.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.earnings_tooltip.monthly.body')),
    ).toBeOnTheScreen();
  });

  it('renders the lifetime earnings title and body', () => {
    mockUseParams.mockReturnValue({ variant: 'lifetime' });

    const { getByText } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(
      getByText(strings('money.earnings_tooltip.lifetime.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.earnings_tooltip.lifetime.body')),
    ).toBeOnTheScreen();
  });

  it('defaults to monthly copy when variant is missing', () => {
    mockUseParams.mockReturnValue({});

    const { getByText } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(
      getByText(strings('money.earnings_tooltip.monthly.title')),
    ).toBeOnTheScreen();
  });

  it('does not render a Got It footer button', () => {
    const { queryByTestId } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(queryByTestId('money-earnings-info-sheet-got-it-button')).toBeNull();
  });

  it('does not render a close button', () => {
    const { queryByTestId } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(queryByTestId('bottom-sheet-close-button')).toBeNull();
  });

  it('navigates back when the sheet is dismissed', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsInfoSheet />);

    fireEvent.press(getByTestId('bottom-sheet-dismiss'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders the body in the alternative text colour', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsInfoSheet />);

    expect(getByTestId(MoneyEarningsInfoSheetTestIds.BODY)).toHaveStyle({
      color: lightTheme.colors.text.alternative,
    });
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with the monthly bottom sheet name', () => {
      renderWithProvider(<MoneyEarningsInfoSheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MONTHLY_EARNINGS_INFO_SHEET,
      });
    });

    it('initialises useMoneyAnalytics with the lifetime bottom sheet name', () => {
      mockUseParams.mockReturnValue({ variant: 'lifetime' });

      renderWithProvider(<MoneyEarningsInfoSheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name:
          BOTTOM_SHEET_NAMES.MONEY_LIFETIME_EARNINGS_INFO_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyEarningsInfoSheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });
  });
});

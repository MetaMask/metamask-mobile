import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyGeoBlockSheet from './MoneyGeoBlockSheet';
import { MoneyGeoBlockSheetTestIds } from './MoneyGeoBlockSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';
import Routes from '../../../../../constants/navigation/Routes';

const mockTrackBottomSheetViewed = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockNavigate = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
        onClose,
      }: {
        children: React.ReactNode;
        testID?: string;
        onClose?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));

      return ReactActual.createElement(View, { testID, onClose }, children);
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

describe('MoneyGeoBlockSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
    });
  });

  it('renders geo-block bottom sheet container', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    expect(getByTestId(MoneyGeoBlockSheetTestIds.SHEET)).toBeOnTheScreen();
  });

  it('renders geo-block title copy', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    expect(getByTestId(MoneyGeoBlockSheetTestIds.TITLE)).toHaveTextContent(
      strings('money.geo_block.title'),
    );
  });

  it('renders geo-block description copy', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    expect(getByTestId(MoneyGeoBlockSheetTestIds.BODY)).toHaveTextContent(
      strings('money.geo_block.description'),
    );
  });

  it('renders continue button copy', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    expect(
      getByTestId(MoneyGeoBlockSheetTestIds.CONTINUE_BUTTON),
    ).toHaveTextContent(strings('money.geo_block.button'));
  });

  it('closes sheet and navigates to wallet home when continue button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    fireEvent.press(getByTestId(MoneyGeoBlockSheetTestIds.CONTINUE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('closes sheet and navigates to wallet home when bottom sheet close callback runs', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);
    const sheet = getByTestId(MoneyGeoBlockSheetTestIds.SHEET);

    sheet.props.onClose();

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('closes sheet and navigates to wallet home when header close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    fireEvent.press(getByTestId(MoneyGeoBlockSheetTestIds.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_GEO_BLOCK_SHEET bottom_sheet_name', () => {
      renderWithProvider(<MoneyGeoBlockSheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_GEO_BLOCK_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyGeoBlockSheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });
  });
});

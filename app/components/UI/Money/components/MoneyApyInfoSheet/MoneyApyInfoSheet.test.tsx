import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyApyInfoSheet from './MoneyApyInfoSheet';
import { MoneyApyInfoSheetTestIds } from './MoneyApyInfoSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

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

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

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

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

const DEFAULT_APY = 5;

describe('MoneyApyInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ apy: DEFAULT_APY });
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
    });
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(getByTestId(MoneyApyInfoSheetTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the sheet title', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(getByText(strings('money.apy_tooltip.title'))).toBeOnTheScreen();
  });

  it('renders paragraph_1 with the apy percentage interpolated', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(
        strings('money.apy_tooltip.paragraph_1', { percentage: DEFAULT_APY }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders paragraph_2', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.paragraph_2')),
    ).toBeOnTheScreen();
  });

  it('renders paragraph_3', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.paragraph_3')),
    ).toBeOnTheScreen();
  });

  it('renders paragraph_4', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.paragraph_4')),
    ).toBeOnTheScreen();
  });

  it('does not render a Learn More footer button', () => {
    const { queryByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(queryByTestId('money-apy-info-sheet-learn-more-button')).toBeNull();
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    fireEvent.press(getByTestId('bottom-sheet-close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  describe('when variant is deposit', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ apy: DEFAULT_APY, variant: 'deposit' });
    });

    it('renders the deposit body copy', () => {
      const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

      expect(
        getByText(strings('money.apy_tooltip.deposit_body')),
      ).toBeOnTheScreen();
    });

    it('does not render paragraph_1', () => {
      const { queryByText } = renderWithProvider(<MoneyApyInfoSheet />);

      expect(
        queryByText(
          strings('money.apy_tooltip.paragraph_1', { percentage: DEFAULT_APY }),
        ),
      ).toBeNull();
    });

    it('does not render paragraph_2', () => {
      const { queryByText } = renderWithProvider(<MoneyApyInfoSheet />);

      expect(queryByText(strings('money.apy_tooltip.paragraph_2'))).toBeNull();
    });

    it('does not render paragraph_3', () => {
      const { queryByText } = renderWithProvider(<MoneyApyInfoSheet />);

      expect(queryByText(strings('money.apy_tooltip.paragraph_3'))).toBeNull();
    });

    it('does not render paragraph_4', () => {
      const { queryByText } = renderWithProvider(<MoneyApyInfoSheet />);

      expect(queryByText(strings('money.apy_tooltip.paragraph_4'))).toBeNull();
    });

    it('renders the sheet title', () => {
      const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

      expect(getByText(strings('money.apy_tooltip.title'))).toBeOnTheScreen();
    });
  });

  it('does not render the deposit body copy without a variant', () => {
    const { queryByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(queryByText(strings('money.apy_tooltip.deposit_body'))).toBeNull();
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_APY_INFO_SHEET bottom_sheet_name', () => {
      renderWithProvider(<MoneyApyInfoSheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_APY_INFO_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyApyInfoSheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });
  });
});

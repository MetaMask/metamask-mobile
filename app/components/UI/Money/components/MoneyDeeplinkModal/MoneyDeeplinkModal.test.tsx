import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyDeeplinkModal from './MoneyDeeplinkModal';
import { MoneyDeeplinkModalTestIds } from './MoneyDeeplinkModal.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';
import Routes from '../../../../../constants/navigation/Routes';

const mockTrackBottomSheetViewed = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockNavigate = jest.fn();

const DEFAULT_TITLE = 'Money account is temporarily unavailable';
const DEFAULT_DESCRIPTION =
  "We're working on it. Money Account will be back up shortly — check back soon.";

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useRoute: () => mockUseRoute(),
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

describe('MoneyDeeplinkModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({
      params: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
      },
    });
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
    });
  });

  describe('rendering', () => {
    it('renders the bottom sheet container', () => {
      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      expect(getByTestId(MoneyDeeplinkModalTestIds.SHEET)).toBeOnTheScreen();
    });

    it('renders the title from route params', () => {
      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      expect(getByTestId(MoneyDeeplinkModalTestIds.TITLE)).toHaveTextContent(
        DEFAULT_TITLE,
      );
    });

    it('renders the description from route params', () => {
      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      expect(
        getByTestId(MoneyDeeplinkModalTestIds.DESCRIPTION),
      ).toHaveTextContent(DEFAULT_DESCRIPTION);
    });

    it('renders an empty title when title param is undefined', () => {
      mockUseRoute.mockReturnValue({
        params: { description: DEFAULT_DESCRIPTION },
      });

      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      expect(getByTestId(MoneyDeeplinkModalTestIds.TITLE)).toHaveTextContent(
        '',
      );
    });

    it('renders an empty description when description param is undefined', () => {
      mockUseRoute.mockReturnValue({ params: { title: DEFAULT_TITLE } });

      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      expect(
        getByTestId(MoneyDeeplinkModalTestIds.DESCRIPTION),
      ).toHaveTextContent('');
    });

    it('renders an empty title and description when params are undefined', () => {
      mockUseRoute.mockReturnValue({ params: undefined });

      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      expect(getByTestId(MoneyDeeplinkModalTestIds.TITLE)).toHaveTextContent(
        '',
      );
      expect(
        getByTestId(MoneyDeeplinkModalTestIds.DESCRIPTION),
      ).toHaveTextContent('');
    });

    it('renders the primary button with correct copy', () => {
      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      expect(
        getByTestId(MoneyDeeplinkModalTestIds.PRIMARY_BUTTON),
      ).toHaveTextContent(strings('money.deeplink_modal.button'));
    });

    it('renders the close button', () => {
      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      expect(
        getByTestId(MoneyDeeplinkModalTestIds.CLOSE_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('closes sheet and navigates to wallet home when primary button is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      fireEvent.press(getByTestId(MoneyDeeplinkModalTestIds.PRIMARY_BUTTON));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('closes sheet and navigates to wallet home when header close button is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);

      fireEvent.press(getByTestId(MoneyDeeplinkModalTestIds.CLOSE_BUTTON));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('closes sheet and navigates to wallet home when bottom sheet onClose callback runs', () => {
      const { getByTestId } = renderWithProvider(<MoneyDeeplinkModal />);
      const sheet = getByTestId(MoneyDeeplinkModalTestIds.SHEET);

      sheet.props.onClose();

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_DEEPLINK_MODAL bottom_sheet_name', () => {
      renderWithProvider(<MoneyDeeplinkModal />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_DEEPLINK_MODAL,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyDeeplinkModal />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });
  });
});

import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyMoreSheet from './MoneyMoreSheet';
import { MoneyMoreSheetTestIds } from './MoneyMoreSheet.testIds';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import Routes from '../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

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
  const MockIcon = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`} />
  );
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
    Icon: MockIcon,
  };
});

describe('MoneyMoreSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
      trackSurfaceClicked: mockTrackSurfaceClicked,
    });
  });

  it('renders How it works, What you get, and Contact support rows', () => {
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

  it('renders the "How it works" row with the book icon', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    expect(getByTestId(`icon-${IconName.Book}`)).toBeOnTheScreen();
  });

  it('does not render the info icon for the "How it works" row', () => {
    const { queryByTestId } = renderWithProvider(<MoneyMoreSheet />);

    expect(queryByTestId(`icon-${IconName.Info}`)).not.toBeOnTheScreen();
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

  it('opens the Money landing URL in the in-app browser when "What you get" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.WHAT_YOU_GET_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalledWith(
      AppConstants.URLS.MONEY_LANDING,
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: AppConstants.URLS.MONEY_LANDING,
        timestamp: expect.any(Number),
        fromMoney: true,
      },
    });
  });

  it('opens the support consent sheet when "Contact support" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SUPPORT_CONSENT_SHEET,
      params: {
        onConfirm: expect.any(Function),
        onReject: expect.any(Function),
      },
    });
  });

  it('opens the MetaMask support URL in the in-app browser when consent is rejected', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION));
    const { onReject } = mockNavigate.mock.calls[0][1].params;
    onReject();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: expect.stringContaining(METAMASK_SUPPORT_URL),
        timestamp: expect.any(Number),
        fromMoney: true,
      },
    });
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_MORE_SHEET bottom_sheet_name', () => {
      renderWithProvider(<MoneyMoreSheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MORE_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyMoreSheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });

    it('calls trackSurfaceClicked with HOW_IT_WORKS component and MONEY_HOW_IT_WORKS redirect when "How it works" is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

      fireEvent.press(getByTestId(MoneyMoreSheetTestIds.HOW_IT_WORKS_OPTION));

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_HOW_IT_WORKS,
        redirect_target: SCREEN_NAMES.MONEY_HOW_IT_WORKS,
      });
    });

    it('calls trackSurfaceClicked with WHAT_YOU_GET component and MONEY_LANDING redirect when "What you get" is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

      fireEvent.press(getByTestId(MoneyMoreSheetTestIds.WHAT_YOU_GET_OPTION));

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_WHAT_YOU_GET,
        redirect_target: MONEY_URLS.MONEY_LANDING,
      });
    });

    it('calls trackSurfaceClicked with CONTACT_SUPPORT component and METAMASK_SUPPORT redirect when "Contact support" is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

      fireEvent.press(
        getByTestId(MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION),
      );

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_CONTACT_SUPPORT,
        redirect_target: MONEY_URLS.METAMASK_SUPPORT,
      });
    });
  });
});

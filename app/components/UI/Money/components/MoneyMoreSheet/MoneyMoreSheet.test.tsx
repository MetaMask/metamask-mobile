import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyMoreSheet from './MoneyMoreSheet';
import { MoneyMoreSheetTestIds } from './MoneyMoreSheet.testIds';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import Routes from '../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useMoneyMfa, type MoneyMfaStatus } from '../../hooks/useMoneyMfa';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

const mockOpenSupportWithConsent: jest.Mock<
  void,
  [(url: string) => void, string]
> = jest.fn();
jest.mock('../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

const mockTrackBottomSheetViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();
const mockTrackButtonClicked = jest.fn();
const mockTrackTooltipClicked = jest.fn();
const mockTrackTokenButtonClicked = jest.fn();
const mockTrackTokenSurfaceClicked = jest.fn();
const mockTrackActivitySurfaceClicked = jest.fn();
const mockTrackScreenViewed = jest.fn();
const mockTrackComponentViewed = jest.fn();
const mockTrackCampaignTriggered = jest.fn();
const mockTrackOnboardingEvent = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock('../../hooks/useMoneyMfa', () => ({
  useMoneyMfa: jest.fn(),
}));

const mockTurnOnMfa = jest.fn();

const mockMfaStatus = (status: MoneyMfaStatus) =>
  jest.mocked(useMoneyMfa).mockReturnValue({
    status,
    turnOn: mockTurnOnMfa,
    addPasskeyAndTurnOn: jest.fn(),
    retry: jest.fn(),
    turnOff: jest.fn(),
    isSettingUpBannerDismissed: false,
    dismissSettingUpBanner: jest.fn(),
    refreshCredentials: jest.fn(),
  });

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
    jest.mocked(useMoneyAnalytics).mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
      trackCampaignTriggered: mockTrackCampaignTriggered,
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
      trackSurfaceClicked: mockTrackSurfaceClicked,
      trackTooltipClicked: mockTrackTooltipClicked,
      trackTokenButtonClicked: mockTrackTokenButtonClicked,
      trackTokenSurfaceClicked: mockTrackTokenSurfaceClicked,
      trackActivitySurfaceClicked: mockTrackActivitySurfaceClicked,
      trackScreenViewed: mockTrackScreenViewed,
      trackComponentViewed: mockTrackComponentViewed,
      trackOnboardingEvent: mockTrackOnboardingEvent,
    });
    mockMfaStatus('unavailable');
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('shows the support consent sheet with the METAMASK_SUPPORT_URL when "Contact support" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION));

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
      METAMASK_SUPPORT_URL,
    );
  });

  it('keeps the sheet open while the support consent sheet is shown', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);

    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION));

    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('closes the sheet before opening the consented support URL in the in-app browser', () => {
    const { getByTestId } = renderWithProvider(<MoneyMoreSheet />);
    fireEvent.press(getByTestId(MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION));
    const [openSupportUrl] = mockOpenSupportWithConsent.mock.calls[0];
    const consentedUrl = `${METAMASK_SUPPORT_URL}&metamask_version=1.0.0`;

    openSupportUrl(consentedUrl);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: consentedUrl,
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

  describe('2-step verification row', () => {
    const getMfaSwitch = () =>
      within(screen.getByTestId(MoneyMoreSheetTestIds.MFA_SWITCH)).getByRole(
        'switch',
      );

    it('hides the row when 2-step verification is unavailable', () => {
      const { queryByTestId } = renderWithProvider(<MoneyMoreSheet />);

      expect(
        queryByTestId(MoneyMoreSheetTestIds.MFA_OPTION),
      ).not.toBeOnTheScreen();
    });

    it('renders the row title and description when 2-step verification is available', () => {
      mockMfaStatus('not_set_up');

      const { getByTestId, getByText } = renderWithProvider(<MoneyMoreSheet />);

      expect(getByTestId(MoneyMoreSheetTestIds.MFA_OPTION)).toBeOnTheScreen();
      expect(
        getByText(strings('money.mfa.more_sheet_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('money.mfa.more_sheet_description')),
      ).toBeOnTheScreen();
    });

    it('shows the switch on when 2-step verification is enabled', () => {
      mockMfaStatus('enabled');

      renderWithProvider(<MoneyMoreSheet />);

      expect(getMfaSwitch()).toHaveProp('value', true);
    });

    it.each<MoneyMfaStatus>(['not_set_up', 'off', 'failed'])(
      'shows the switch off when the status is %s',
      (status) => {
        mockMfaStatus(status);

        renderWithProvider(<MoneyMoreSheet />);

        expect(getMfaSwitch()).toHaveProp('value', false);
      },
    );

    it('disables the switch while the Money account is being set up', () => {
      mockMfaStatus('setting_up');

      renderWithProvider(<MoneyMoreSheet />);

      expect(getMfaSwitch()).toBeDisabled();
    });

    it('closes the sheet then opens the turn off sheet when toggled while enabled', () => {
      mockMfaStatus('enabled');
      renderWithProvider(<MoneyMoreSheet />);

      fireEvent(getMfaSwitch(), 'valueChange', false);

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.MFA_TURN_OFF_SHEET,
      });
      expect(mockTurnOnMfa).not.toHaveBeenCalled();
    });

    it('tracks turning off from the switch', () => {
      mockMfaStatus('enabled');
      renderWithProvider(<MoneyMoreSheet />);

      fireEvent(getMfaSwitch(), 'valueChange', false);

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.DISABLE_MFA,
        label_key: 'money.mfa.more_sheet_title',
        component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_MFA_TOGGLE,
        redirect_target: BOTTOM_SHEET_NAMES.MONEY_MFA_TURN_OFF_SHEET,
      });
    });

    it('tracks turning on from the switch', () => {
      mockMfaStatus('off');
      renderWithProvider(<MoneyMoreSheet />);

      fireEvent(getMfaSwitch(), 'valueChange', true);

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ENABLE_MFA,
        label_key: 'money.mfa.more_sheet_title',
        component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_MFA_TOGGLE,
      });
    });

    it('closes the sheet then turns on 2-step verification when toggled before setup', () => {
      mockMfaStatus('not_set_up');
      renderWithProvider(<MoneyMoreSheet />);

      fireEvent(getMfaSwitch(), 'valueChange', true);

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockTurnOnMfa).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('closes the sheet then turns 2-step verification back on when toggled while off', () => {
      mockMfaStatus('off');
      renderWithProvider(<MoneyMoreSheet />);

      fireEvent(getMfaSwitch(), 'valueChange', true);

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockTurnOnMfa).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

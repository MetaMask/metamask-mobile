import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyMfa } from '../../hooks/useMoneyMfa';
import MoneyMfaEnabledSheet from './MoneyMfaEnabledSheet';
import MoneyMfaSettingUpSheet from './MoneyMfaSettingUpSheet';
import MoneyMfaTurnOffSheet from './MoneyMfaTurnOffSheet';
import MoneyMfaPromptSheet from './MoneyMfaPromptSheet';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import { moneyMfaStore } from '../../../../../lib/Money/mfa/moneyMfaStore';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();
const mockTrackButtonClicked = jest.fn();
const mockTrackComponentViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackBottomSheetViewed: mockTrackBottomSheetViewed,
    trackButtonClicked: mockTrackButtonClicked,
    trackComponentViewed: mockTrackComponentViewed,
  })),
}));

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();

jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    getItemSync: jest.fn(() => null),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

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
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

jest.mock('../../hooks/useMoneyMfa', () => ({
  useMoneyMfa: jest.fn(),
}));

const mockTurnOn = jest.fn();
const mockAddPasskeyAndTurnOn = jest.fn();
const mockTurnOff = jest.fn();

describe('Money 2-step verification sheets', () => {
  beforeEach(() => {
    moneyMfaStore.reset();
    jest.clearAllMocks();
    jest.mocked(useMoneyMfa).mockReturnValue({
      status: 'not_set_up',
      turnOn: mockTurnOn,
      addPasskeyAndTurnOn: mockAddPasskeyAndTurnOn,
      retry: jest.fn(),
      turnOff: mockTurnOff,
      isSettingUpBannerDismissed: false,
      dismissSettingUpBanner: jest.fn(),
      refreshCredentials: jest.fn(),
    });
  });

  it.each([
    [
      'MoneyMfaEnabledSheet',
      MoneyMfaEnabledSheet,
      BOTTOM_SHEET_NAMES.MONEY_MFA_ENABLED_SHEET,
    ],
    [
      'MoneyMfaSettingUpSheet',
      MoneyMfaSettingUpSheet,
      BOTTOM_SHEET_NAMES.MONEY_MFA_SETTING_UP_SHEET,
    ],
    [
      'MoneyMfaTurnOffSheet',
      MoneyMfaTurnOffSheet,
      BOTTOM_SHEET_NAMES.MONEY_MFA_TURN_OFF_SHEET,
    ],
    [
      'MoneyMfaPromptSheet',
      MoneyMfaPromptSheet,
      BOTTOM_SHEET_NAMES.MONEY_MFA_PROMPT_SHEET,
    ],
  ])(
    '%s tracks the sheet as viewed on mount',
    (_name, Sheet, bottomSheetName) => {
      render(<Sheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: bottomSheetName,
      });
      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    },
  );

  describe('MoneyMfaEnabledSheet', () => {
    it('renders the enabled title and description', () => {
      const { getByTestId, getByText } = render(<MoneyMfaEnabledSheet />);

      expect(getByTestId(MoneyMfaTestIds.ENABLED_SHEET)).toBeOnTheScreen();
      expect(getByText(strings('money.mfa.enabled_title'))).toBeOnTheScreen();
      expect(
        getByText(strings('money.mfa.enabled_description')),
      ).toBeOnTheScreen();
    });

    it('closes the sheet when Got it is pressed', () => {
      const { getByTestId } = render(<MoneyMfaEnabledSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.ENABLED_SHEET_BUTTON));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('MoneyMfaSettingUpSheet', () => {
    it('renders the send blocked title and description', () => {
      const { getByTestId, getByText } = render(<MoneyMfaSettingUpSheet />);

      expect(getByTestId(MoneyMfaTestIds.SETTING_UP_SHEET)).toBeOnTheScreen();
      expect(
        getByText(strings('money.mfa.send_blocked_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('money.mfa.send_blocked_description')),
      ).toBeOnTheScreen();
    });

    it('closes the sheet when Got it is pressed', () => {
      const { getByTestId } = render(<MoneyMfaSettingUpSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.SETTING_UP_SHEET_BUTTON));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('MoneyMfaTurnOffSheet', () => {
    it('renders the turn off title and description', () => {
      const { getByTestId, getByText } = render(<MoneyMfaTurnOffSheet />);

      expect(getByTestId(MoneyMfaTestIds.TURN_OFF_SHEET)).toBeOnTheScreen();
      expect(getByText(strings('money.mfa.turn_off_title'))).toBeOnTheScreen();
      expect(
        getByText(strings('money.mfa.turn_off_description')),
      ).toBeOnTheScreen();
    });

    it('closes the sheet then turns off 2-step verification when Turn off is pressed', () => {
      const { getByTestId } = render(<MoneyMfaTurnOffSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.TURN_OFF_BUTTON));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledWith(mockTurnOff);
      expect(mockTurnOff).toHaveBeenCalledTimes(1);
    });

    it('tracks the Turn off button', () => {
      const { getByTestId } = render(<MoneyMfaTurnOffSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.TURN_OFF_BUTTON));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.DISABLE_MFA,
        label_key: 'money.mfa.turn_off_cta',
      });
    });

    it('tracks the Cancel button', () => {
      const { getByTestId } = render(<MoneyMfaTurnOffSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.TURN_OFF_CANCEL_BUTTON));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.DISMISS,
        label_key: 'money.mfa.cancel',
      });
    });

    it('closes the sheet without turning off when Cancel is pressed', () => {
      const { getByTestId } = render(<MoneyMfaTurnOffSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.TURN_OFF_CANCEL_BUTTON));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockTurnOff).not.toHaveBeenCalled();
    });
  });

  describe('MoneyMfaPromptSheet', () => {
    it('renders the passkey intro', () => {
      const { getByTestId, getByText } = render(<MoneyMfaPromptSheet />);

      expect(getByTestId(MoneyMfaTestIds.PROMPT_SHEET)).toBeOnTheScreen();
      expect(getByText(strings('money.mfa.intro_title'))).toBeOnTheScreen();
    });

    it('closes the sheet then turns on 2-step verification when Add passkey is pressed', () => {
      const { getByTestId } = render(<MoneyMfaPromptSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.INTRO_BUTTON));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockAddPasskeyAndTurnOn).toHaveBeenCalledTimes(1);
    });

    it('does not turn on 2-step verification before the sheet finishes closing', () => {
      mockOnCloseBottomSheet.mockImplementationOnce(() => undefined);
      const { getByTestId } = render(<MoneyMfaPromptSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.INTRO_BUTTON));

      expect(mockAddPasskeyAndTurnOn).not.toHaveBeenCalled();
    });

    it('dismisses the home prompt for good when closed', () => {
      const { getByTestId } = render(<MoneyMfaPromptSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.PROMPT_SHEET_CLOSE));

      expect(moneyMfaStore.getState().isHomePromptDismissed).toBe(true);
      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('tracks the close button', () => {
      const { getByTestId } = render(<MoneyMfaPromptSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.PROMPT_SHEET_CLOSE));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.ICON,
        button_intent: MONEY_BUTTON_INTENTS.DISMISS,
      });
    });

    it('tracks the Add passkey button', () => {
      const { getByTestId } = render(<MoneyMfaPromptSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.INTRO_BUTTON));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ENABLE_MFA,
        label_key: 'money.mfa.intro_cta',
      });
    });

    it('keeps the home prompt when Add passkey is pressed', () => {
      const { getByTestId } = render(<MoneyMfaPromptSheet />);

      fireEvent.press(getByTestId(MoneyMfaTestIds.INTRO_BUTTON));

      expect(moneyMfaStore.getState().isHomePromptDismissed).toBe(false);
    });
  });
});

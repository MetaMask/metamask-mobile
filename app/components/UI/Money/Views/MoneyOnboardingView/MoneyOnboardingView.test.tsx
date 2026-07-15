import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import MoneyOnboardingView from './MoneyOnboardingView';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_ONBOARDING_STEP_ACTIONS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MoneyOnboardingViewTestIds } from './MoneyOnboardingView.testIds';
import Logger from '../../../../../util/Logger';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';

const mockTrackOnboardingEvent = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockIsUsUnauthenticatedNonCardholder = false;

const setWindowDimensions = ({
  height,
  width,
}: {
  height: number;
  width: number;
}) => {
  Dimensions.set({
    screen: {
      fontScale: 1,
      height,
      scale: 3,
      width,
    },
    window: {
      fontScale: 1,
      height,
      scale: 3,
      width,
    },
  });
};

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest
    .fn()
    .mockImplementation(() => mockIsUsUnauthenticatedNonCardholder),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: () => ({ apyPercent: 4 }),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../util/haptics', () => ({
  ImpactMoment: {
    PageNavigation: 'pageNavigation',
  },
  playImpact: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');

  return {
    ...Reanimated,
    useAnimatedStyle: jest.fn((updater) => updater()),
    useSharedValue: jest.fn((initialValue) => {
      const sharedValue = {
        value: initialValue,
        set: jest.fn((nextValue) => {
          sharedValue.value = nextValue;
        }),
      };

      return sharedValue;
    }),
    withTiming: jest.fn((toValue, config) => ({ config, toValue })),
  };
});

let mockOnStateChanged: (stateMachineName: string, stateName: string) => void;
let mockOnError: (error: { message: string; type: string }) => void;
let mockTriggerCallbacks: Record<string, () => void> = {};
const mockSetNumber = jest.fn();
const mockSetString = jest.fn();

const triggerStateChange = (stateName: string) => {
  act(() => {
    mockOnStateChanged('State Machine 1', stateName);
  });
};

const renderMoneyOnboardingView = () => render(<MoneyOnboardingView />);

jest.mock('rive-react-native', () => {
  const mockRiveRef = {};

  return {
    __esModule: true,
    default: jest.fn(({ onError, onStateChanged, ...props }) => {
      mockOnError = onError;
      mockOnStateChanged = onStateChanged;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { View } = require('react-native');
      return <View {...props} />;
    }),
    useRive: () => [jest.fn(), mockRiveRef],
    useRiveNumber: () => [undefined, mockSetNumber],
    useRiveString: () => [undefined, mockSetString],
    useRiveTrigger: (_riveRef: unknown, path: string, callback: () => void) => {
      mockTriggerCallbacks[path] = callback;
    },
    AutoBind: (value: boolean) => ({ type: 'autobind', value }),
    Fit: { Layout: 'layout' },
  };
});

describe('MoneyOnboardingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTriggerCallbacks = {};
    mockIsUsUnauthenticatedNonCardholder = false;
    setWindowDimensions({ height: 844, width: 390 });
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackOnboardingEvent: mockTrackOnboardingEvent,
    });
  });

  describe('Rendering', () => {
    it('renders the Rive animation component', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      expect(
        getByTestId(MoneyOnboardingViewTestIds.RIVE_ANIMATION),
      ).toBeOnTheScreen();
    });

    it('renders the initial native text overlay for step 1', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step1_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step1_body', { percentage: 4 }));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_FOOTER).props.children,
      ).toBe(strings('money.rive_onboarding.step1_footer_text'));
    });

    it('uses default overlay text size preset on regular devices', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      expect(
        StyleSheet.flatten(
          getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.style,
        ).fontSize,
      ).toBe(24);
      expect(
        StyleSheet.flatten(
          getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.style,
        ).fontSize,
      ).toBe(16);
      expect(
        StyleSheet.flatten(
          getByTestId(MoneyOnboardingViewTestIds.OVERLAY_FOOTER).props.style,
        ).fontSize,
      ).toBe(12);
    });

    it('uses small overlay text size preset on small devices', () => {
      setWindowDimensions({ height: 667, width: 375 });

      const { getByTestId } = renderMoneyOnboardingView();

      expect(
        StyleSheet.flatten(
          getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.style,
        ).fontSize,
      ).toBe(18);
      expect(
        StyleSheet.flatten(
          getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.style,
        ).fontSize,
      ).toBe(14);
      expect(
        StyleSheet.flatten(
          getByTestId(MoneyOnboardingViewTestIds.OVERLAY_FOOTER).props.style,
        ).fontSize,
      ).toBe(10);
    });
  });

  describe('Analytics initialization', () => {
    it('initializes useMoneyAnalytics with onboarding screen and stepper component', () => {
      renderMoneyOnboardingView();

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        screen_name: SCREEN_NAMES.MONEY_ONBOARDING,
        component_name: COMPONENT_NAMES.RIVE_ONBOARDING_STEPPER,
      });
    });
  });

  describe('State changes (onStateChanged)', () => {
    it('tracks VIEWED event with step 1 when state changes to UI1', () => {
      renderMoneyOnboardingView();

      triggerStateChange('UI1');

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith({
        step: 1,
        step_title: expect.any(String),
        total_steps: 5,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('tracks VIEWED event with step 2 when state changes to APY', () => {
      renderMoneyOnboardingView();

      triggerStateChange('APY');

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith({
        step: 2,
        step_title: expect.any(String),
        total_steps: 5,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('tracks VIEWED event with step 3 when state changes to Card', () => {
      renderMoneyOnboardingView();

      triggerStateChange('Card');

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith({
        step: 3,
        step_title: expect.any(String),
        total_steps: 5,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('tracks VIEWED event with step 4 when state changes to Coins', () => {
      renderMoneyOnboardingView();

      triggerStateChange('Coins');

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith({
        step: 4,
        step_title: expect.any(String),
        total_steps: 5,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('does not track events for unknown state names', () => {
      renderMoneyOnboardingView();

      triggerStateChange('SomeTransitionState');

      expect(mockTrackOnboardingEvent).not.toHaveBeenCalled();
    });

    it('tracks VIEWED event when FinalState fires', () => {
      renderMoneyOnboardingView();

      triggerStateChange('FinalState');

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 5,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        }),
      );
    });

    it('tracks COMPLETED event when FinalState fires', () => {
      renderMoneyOnboardingView();

      triggerStateChange('FinalState');

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 5,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.COMPLETED,
          redirect_target: SCREEN_NAMES.MONEY_HOME,
        }),
      );
    });

    it('navigates to Money home when FinalState fires', () => {
      renderMoneyOnboardingView();

      triggerStateChange('FinalState');

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('dispatches setMoneyOnboardingSeen when FinalState fires', () => {
      renderMoneyOnboardingView();

      triggerStateChange('FinalState');

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_MONEY_ONBOARDING_SEEN',
          payload: { seen: true },
        }),
      );
    });
  });

  describe('Close trigger', () => {
    it('tracks EXITED event at current step when close trigger fires', () => {
      renderMoneyOnboardingView();
      triggerStateChange('APY');
      jest.clearAllMocks();

      mockTriggerCallbacks.close();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.EXITED,
          redirect_target: SCREEN_NAMES.MONEY_HOME,
        }),
      );
    });

    it('navigates to Money home when close trigger fires', () => {
      renderMoneyOnboardingView();
      triggerStateChange('APY');
      jest.clearAllMocks();

      mockTriggerCallbacks.close();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('dispatches setMoneyOnboardingSeen when close trigger fires', () => {
      renderMoneyOnboardingView();

      mockTriggerCallbacks.close();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_MONEY_ONBOARDING_SEEN',
          payload: { seen: true },
        }),
      );
    });

    it('plays page navigation haptic when close trigger fires', () => {
      renderMoneyOnboardingView();

      mockTriggerCallbacks.close();

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
    });
  });

  describe('Rive config initialization', () => {
    it('sets transition speed in Rive', () => {
      renderMoneyOnboardingView();

      expect(mockSetNumber).toHaveBeenCalledWith(300);
    });

    it('sets Rive button text from localized onboarding button label', () => {
      renderMoneyOnboardingView();

      expect(mockSetString).toHaveBeenCalledWith(
        strings('money.rive_onboarding.button_text'),
      );
    });

    it('starts the overlay hidden and fades it in after Rive initializes', () => {
      renderMoneyOnboardingView();

      expect(useSharedValue).toHaveBeenCalledWith(0);
      expect(withTiming).toHaveBeenCalledWith(1, {
        duration: 200,
      });
    });
  });

  describe('Transition haptics', () => {
    it('plays page navigation haptic when Rive enters forward transition state', () => {
      renderMoneyOnboardingView();

      triggerStateChange('UI to APY');

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
    });

    it('plays page navigation haptic when Rive enters backward transition state', () => {
      renderMoneyOnboardingView();

      triggerStateChange('APY to UI');

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
    });

    it('does not play haptic when Rive enters settled step state', () => {
      renderMoneyOnboardingView();

      triggerStateChange('APY');

      expect(playImpact).not.toHaveBeenCalled();
    });
  });

  describe('Overlay fade animation', () => {
    it('fades out during transition states and fades in when a step settles', () => {
      renderMoneyOnboardingView();
      (withTiming as jest.Mock).mockClear();

      triggerStateChange('UI to APY');
      triggerStateChange('APY');

      expect(withTiming).toHaveBeenCalledWith(0, {
        duration: 200,
      });
      expect(withTiming).toHaveBeenCalledWith(1, {
        duration: 200,
      });
    });
  });

  describe('Rive errors', () => {
    const riveError = {
      message: 'Unable to load artboard',
      type: 'IncorrectArtboardName',
    };

    const renderAndTriggerRiveError = () => {
      renderMoneyOnboardingView();

      mockOnError(riveError);
    };

    it('redirects to Money home when Rive reports error', () => {
      renderAndTriggerRiveError();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('dispatches onboarding seen when Rive reports error so users are not shown onboarding again', () => {
      renderAndTriggerRiveError();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_MONEY_ONBOARDING_SEEN',
          payload: { seen: true },
        }),
      );
    });

    it('logs when Rive reports error', () => {
      renderAndTriggerRiveError();

      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'MoneyOnboardingView: Rive error: Unable to load artboard - IncorrectArtboardName',
        }),
      );
    });
  });

  describe('Native text overlay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('keeps step1 text during UI to APY transition and swaps when APY settles', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      triggerStateChange('UI to APY');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step1_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step1_body', { percentage: 4 }));

      triggerStateChange('APY');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step2_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step2_body'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_FOOTER).props.children,
      ).toBe(strings('money.rive_onboarding.step2_footer_text'));
    });

    it('keeps step2 text during APY to Wallet transition and swaps when Card settles', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      triggerStateChange('APY');
      triggerStateChange('APY to Wallet');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step2_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step2_body'));

      triggerStateChange('Card');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step3_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(
        strings('money.rive_onboarding.step3_body_card_eligible', {
          percentage: 3,
        }),
      );
    });

    it('keeps step2 text during APY to UI transition and swaps when UI1 settles', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      triggerStateChange('APY');
      triggerStateChange('APY to UI');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step2_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step2_body'));

      triggerStateChange('UI1');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step1_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step1_body', { percentage: 4 }));
    });

    it('keeps step4 text during Coins to Card transition and swaps when Card settles', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      triggerStateChange('Coins');
      triggerStateChange('Coins to Card');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step4_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step4_body'));

      triggerStateChange('Card');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step3_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(
        strings('money.rive_onboarding.step3_body_card_eligible', {
          percentage: 3,
        }),
      );
    });

    it('renders step3 card_eligible body when user is not US unauthenticated non-cardholder', () => {
      mockIsUsUnauthenticatedNonCardholder = false;

      const { getByTestId } = renderMoneyOnboardingView();

      triggerStateChange('Card');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(
        strings('money.rive_onboarding.step3_body_card_eligible', {
          percentage: 3,
        }),
      );
    });

    it('renders step3 card_ineligible body when user is US unauthenticated non-cardholder', () => {
      mockIsUsUnauthenticatedNonCardholder = true;

      const { getByTestId } = renderMoneyOnboardingView();

      triggerStateChange('Card');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(
        strings('money.rive_onboarding.step3_body_card_ineligible', {
          percentage: 3,
        }),
      );
    });
  });
});

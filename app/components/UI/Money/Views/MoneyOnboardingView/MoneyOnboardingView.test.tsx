import React from 'react';
import { act, render } from '@testing-library/react-native';
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

const mockTrackOnboardingEvent = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockIsUsUnauthenticatedNonCardholder = false;

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

let mockOnStateChanged: (stateMachineName: string, stateName: string) => void;
let mockTriggerCallbacks: Record<string, () => void> = {};
const mockSetNumber = jest.fn();

const triggerStateChange = (stateName: string) => {
  act(() => {
    mockOnStateChanged('State Machine 1', stateName);
  });
};

jest.mock('rive-react-native', () => {
  const mockRiveRef = {};

  return {
    __esModule: true,
    default: jest.fn(({ onStateChanged, ...props }) => {
      mockOnStateChanged = onStateChanged;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { View } = require('react-native');
      return <View {...props} />;
    }),
    useRive: () => [jest.fn(), mockRiveRef],
    useRiveNumber: () => [undefined, mockSetNumber],
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
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackOnboardingEvent: mockTrackOnboardingEvent,
    });
  });

  describe('Rendering', () => {
    it('renders the Rive animation component', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);

      expect(
        getByTestId(MoneyOnboardingViewTestIds.RIVE_ANIMATION),
      ).toBeOnTheScreen();
    });

    it('renders the initial native text overlay for step 1', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);

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
  });

  describe('Analytics initialization', () => {
    it('initializes useMoneyAnalytics with onboarding screen and stepper component', () => {
      render(<MoneyOnboardingView />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        screen_name: SCREEN_NAMES.MONEY_ONBOARDING,
        component_name: COMPONENT_NAMES.RIVE_ONBOARDING_STEPPER,
      });
    });
  });

  describe('State changes (onStateChanged)', () => {
    it('tracks VIEWED event with step 1 when state changes to UI1', () => {
      render(<MoneyOnboardingView />);

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
      render(<MoneyOnboardingView />);

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
      render(<MoneyOnboardingView />);

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
      render(<MoneyOnboardingView />);

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
      render(<MoneyOnboardingView />);

      triggerStateChange('SomeTransitionState');

      expect(mockTrackOnboardingEvent).not.toHaveBeenCalled();
    });

    it('tracks VIEWED event when FinalState fires', () => {
      render(<MoneyOnboardingView />);

      triggerStateChange('FinalState');

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 5,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        }),
      );
    });

    it('tracks COMPLETED event when FinalState fires', () => {
      render(<MoneyOnboardingView />);

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
      render(<MoneyOnboardingView />);

      triggerStateChange('FinalState');

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('dispatches setMoneyOnboardingSeen when FinalState fires', () => {
      render(<MoneyOnboardingView />);

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
      render(<MoneyOnboardingView />);
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
      render(<MoneyOnboardingView />);
      triggerStateChange('APY');
      jest.clearAllMocks();

      mockTriggerCallbacks.close();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('dispatches setMoneyOnboardingSeen when close trigger fires', () => {
      render(<MoneyOnboardingView />);

      mockTriggerCallbacks.close();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_MONEY_ONBOARDING_SEEN',
          payload: { seen: true },
        }),
      );
    });
  });

  describe('Rive config initialization', () => {
    it('sets transition speed in Rive', () => {
      render(<MoneyOnboardingView />);

      expect(mockSetNumber).toHaveBeenCalledWith(300);
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
      const { getByTestId } = render(<MoneyOnboardingView />);

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
      const { getByTestId } = render(<MoneyOnboardingView />);

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
      const { getByTestId } = render(<MoneyOnboardingView />);

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
      const { getByTestId } = render(<MoneyOnboardingView />);

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

      const { getByTestId } = render(<MoneyOnboardingView />);

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

      const { getByTestId } = render(<MoneyOnboardingView />);

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

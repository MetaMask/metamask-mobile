import React from 'react';
import { render } from '@testing-library/react-native';
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
const mockSetString = jest.fn();
const mockSetNumber = jest.fn();

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
    useRiveString: () => [undefined, mockSetString],
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

      mockOnStateChanged('State Machine 1', 'UI1');

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

      mockOnStateChanged('State Machine 1', 'APY');

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

      mockOnStateChanged('State Machine 1', 'Card');

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

      mockOnStateChanged('State Machine 1', 'Coins');

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

      mockOnStateChanged('State Machine 1', 'SomeTransitionState');

      expect(mockTrackOnboardingEvent).not.toHaveBeenCalled();
    });

    it('tracks VIEWED event when FinalState fires', () => {
      render(<MoneyOnboardingView />);

      mockOnStateChanged('State Machine 1', 'FinalState');

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 5,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        }),
      );
    });

    it('tracks COMPLETED event when FinalState fires', () => {
      render(<MoneyOnboardingView />);

      mockOnStateChanged('State Machine 1', 'FinalState');

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

      mockOnStateChanged('State Machine 1', 'FinalState');

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('dispatches setMoneyOnboardingSeen when FinalState fires', () => {
      render(<MoneyOnboardingView />);

      mockOnStateChanged('State Machine 1', 'FinalState');

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
      mockOnStateChanged('State Machine 1', 'APY');
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
      mockOnStateChanged('State Machine 1', 'APY');
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

  describe('Rive text run initialization', () => {
    it('sets step3 card_eligible body when user is not US unauthenticated non-cardholder', () => {
      mockIsUsUnauthenticatedNonCardholder = false;

      render(<MoneyOnboardingView />);

      const expectedStrings = [
        strings('money.rive_onboarding.step1_title'),
        strings('money.rive_onboarding.step1_body', { percentage: 4 }),
        strings('money.rive_onboarding.step1_footer_text'),
        strings('money.rive_onboarding.step2_title'),
        strings('money.rive_onboarding.step2_body'),
        strings('money.rive_onboarding.step2_footer_text'),
        strings('money.rive_onboarding.step3_title'),
        strings('money.rive_onboarding.step3_body_card_eligible', {
          percentage: 3,
        }),
        strings('money.rive_onboarding.step3_footer_text'),
        strings('money.rive_onboarding.step4_title'),
        strings('money.rive_onboarding.step4_body'),
        strings('money.rive_onboarding.step4_footer_text'),
      ];

      expectedStrings.forEach((text) => {
        expect(mockSetString).toHaveBeenCalledWith(text);
      });

      expect(mockSetNumber).toHaveBeenCalledWith(300);
      expect(mockSetNumber).toHaveBeenCalledWith(0);
    });

    it('sets step3 card_ineligible body when user is US unauthenticated non-cardholder', () => {
      mockIsUsUnauthenticatedNonCardholder = true;

      render(<MoneyOnboardingView />);

      expect(mockSetString).toHaveBeenCalledWith(
        strings('money.rive_onboarding.step3_body_card_ineligible', {
          percentage: 3,
        }),
      );
      expect(mockSetString).not.toHaveBeenCalledWith(
        strings('money.rive_onboarding.step3_body_card_eligible', {
          percentage: 3,
        }),
      );
    });
  });
});

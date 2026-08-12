import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
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
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';
import {
  __fireRiveTrigger,
  __getRivePropertySetter,
  __resetRiveMocks,
} from '../../../../../__mocks__/rive-app-react-native';

const mockTrackOnboardingEvent = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockIsUsUnauthenticatedNonCardholder = false;
let mockRouteParams:
  | {
      postOnboardingRedirect?: {
        type: MoneyPostOnboardingRedirectType;
        preferredPaymentToken?: {
          address: `0x${string}`;
          chainId: `0x${string}`;
        };
      };
    }
  | undefined;
const mockInitiateDeposit = jest.fn();

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
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest
    .fn()
    .mockImplementation(() => mockIsUsUnauthenticatedNonCardholder),
}));

let mockApy: { apyPercent?: number; apyPercentFormatted?: string } = {
  apyPercent: 4,
  apyPercentFormatted: '4%',
};
jest.mock('../../hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: () => mockApy,
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
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

// Local wrapper around the global Nitro Rive mock so the RiveView `onError`
// prop is observable; triggers/setters are driven via the global mock helpers.
const mockRiveViewProps: {
  current?: { onError?: (error: RiveError) => void };
} = {};

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  const ReactActual = jest.requireActual('react');
  const MockRiveView = (props: { onError?: (error: RiveError) => void }) => {
    mockRiveViewProps.current = props;
    return ReactActual.createElement(actual.RiveView, props);
  };
  return {
    __esModule: true,
    ...actual,
    RiveView: MockRiveView,
  };
});

const STEP_TRANSITION_MS = 300;

// Steps are reconstructed from `continue`/`back` view-model triggers (no
// `onStateChanged` in Nitro): fire a trigger, then settle the transition timer.
const fireTrigger = (path: string) => {
  act(() => {
    __fireRiveTrigger(path);
  });
};

const settleTransition = () => {
  act(() => {
    jest.advanceTimersByTime(STEP_TRANSITION_MS);
  });
};

const advanceStep = () => {
  fireTrigger('continue');
  settleTransition();
};

/** Fires `continue` up to the final step and settles the last transition. */
const completeOnboarding = async () => {
  fireTrigger('continue');
  fireTrigger('continue');
  fireTrigger('continue');
  fireTrigger('continue');
  await act(async () => {
    jest.advanceTimersByTime(STEP_TRANSITION_MS);
  });
};

const renderMoneyOnboardingView = () => render(<MoneyOnboardingView />);

describe('MoneyOnboardingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    jest.useFakeTimers();
    mockRiveViewProps.current = undefined;
    mockApy = { apyPercent: 4, apyPercentFormatted: '4%' };
    mockIsUsUnauthenticatedNonCardholder = false;
    mockRouteParams = undefined;
    mockInitiateDeposit.mockResolvedValue(undefined);
    jest.mocked(useMoneyAccountDeposit).mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
    setWindowDimensions({ height: 844, width: 390 });
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackOnboardingEvent: mockTrackOnboardingEvent,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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

  describe('Step tracking (continue/back triggers)', () => {
    it('tracks VIEWED event with step 1 once the view-model instance is bound', () => {
      renderMoneyOnboardingView();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith({
        step: 1,
        step_title: expect.any(String),
        total_steps: 5,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('tracks VIEWED event with step 2 when the continue trigger settles', () => {
      renderMoneyOnboardingView();

      advanceStep();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith({
        step: 2,
        step_title: expect.any(String),
        total_steps: 5,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('tracks VIEWED event with step 3 after two continue triggers', () => {
      renderMoneyOnboardingView();

      advanceStep();
      advanceStep();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith({
        step: 3,
        step_title: expect.any(String),
        total_steps: 5,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('tracks VIEWED event with step 4 after three continue triggers', () => {
      renderMoneyOnboardingView();

      advanceStep();
      advanceStep();
      advanceStep();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith({
        step: 4,
        step_title: expect.any(String),
        total_steps: 5,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('does not track the next step until the transition has settled', () => {
      renderMoneyOnboardingView();
      mockTrackOnboardingEvent.mockClear();

      fireTrigger('continue');

      expect(mockTrackOnboardingEvent).not.toHaveBeenCalled();
    });

    it('tracks the previous step again when the back trigger settles', () => {
      renderMoneyOnboardingView();
      advanceStep();
      advanceStep();
      mockTrackOnboardingEvent.mockClear();

      fireTrigger('back');
      settleTransition();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        }),
      );
    });

    it('ignores the back trigger on the first step', () => {
      renderMoneyOnboardingView();
      mockTrackOnboardingEvent.mockClear();

      fireTrigger('back');
      settleTransition();

      expect(mockTrackOnboardingEvent).not.toHaveBeenCalled();
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('ignores further continue triggers on the final step', async () => {
      renderMoneyOnboardingView();
      await completeOnboarding();
      mockTrackOnboardingEvent.mockClear();

      fireTrigger('continue');
      settleTransition();

      expect(mockTrackOnboardingEvent).not.toHaveBeenCalled();
    });
  });

  describe('Completion (final step)', () => {
    it('tracks VIEWED event when the final step settles', async () => {
      renderMoneyOnboardingView();

      await completeOnboarding();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 5,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        }),
      );
    });

    it('tracks COMPLETED event when the final step settles', async () => {
      renderMoneyOnboardingView();

      await completeOnboarding();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 5,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.COMPLETED,
          redirect_target: SCREEN_NAMES.MONEY_HOME,
        }),
      );
    });

    it('navigates to Money home when the final step settles', async () => {
      renderMoneyOnboardingView();

      await completeOnboarding();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('dispatches setMoneyOnboardingSeen when the final step settles', async () => {
      renderMoneyOnboardingView();

      await completeOnboarding();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_MONEY_ONBOARDING_SEEN',
          payload: { seen: true },
        }),
      );
    });

    it('initiates deposit with preferred token after completing onboarding', async () => {
      const preferredPaymentToken = {
        address: '0xabc' as const,
        chainId: '0x1' as const,
      };
      mockRouteParams = {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
          preferredPaymentToken,
        },
      };
      renderMoneyOnboardingView();

      await completeOnboarding();

      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        preferredPaymentToken,
        replaceConfirmation: true,
        onDepositSetupFailure: expect.any(Function),
      });
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
        }),
      );
    });

    it('logs error when post-onboarding deposit fails', async () => {
      const error = new Error('deposit failed');
      mockRouteParams = {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
        },
      };
      mockInitiateDeposit.mockRejectedValue(error);
      renderMoneyOnboardingView();

      await completeOnboarding();

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        '[Money Account] Failed to initiate deposit after onboarding',
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('marks onboarding seen when post-onboarding deposit fails', async () => {
      mockRouteParams = {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
        },
      };
      mockInitiateDeposit.mockRejectedValue(new Error('deposit failed'));
      renderMoneyOnboardingView();

      await completeOnboarding();

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
      advanceStep();
      jest.clearAllMocks();

      fireTrigger('close');

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
      advanceStep();
      jest.clearAllMocks();

      fireTrigger('close');

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('navigates to Money home when post-onboarding deposit fails', async () => {
      mockRouteParams = {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
        },
      };
      mockInitiateDeposit.mockImplementationOnce(
        async ({ onDepositSetupFailure }) => {
          const error = new Error('deposit setup failed');
          onDepositSetupFailure?.(error);
          throw error;
        },
      );
      renderMoneyOnboardingView();

      await act(async () => {
        __fireRiveTrigger('close');
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('dispatches setMoneyOnboardingSeen when close trigger fires', () => {
      renderMoneyOnboardingView();

      fireTrigger('close');

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_MONEY_ONBOARDING_SEEN',
          payload: { seen: true },
        }),
      );
    });

    it('plays page navigation haptic when close trigger fires', () => {
      renderMoneyOnboardingView();

      fireTrigger('close');

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
    });
  });

  describe('Rive config initialization', () => {
    it('sets transition speed in Rive', () => {
      renderMoneyOnboardingView();

      expect(__getRivePropertySetter('transitionSpeed')).toHaveBeenCalledWith(
        300,
      );
    });

    it('sets Rive button text from localized onboarding button label', () => {
      renderMoneyOnboardingView();

      expect(__getRivePropertySetter('button')).toHaveBeenCalledWith(
        strings('money.rive_onboarding.button_text'),
      );
    });

    it('binds the live APY, percent sign included, to the animation', () => {
      mockApy = { apyPercent: 4.6, apyPercentFormatted: '4.6%' };

      renderMoneyOnboardingView();

      expect(__getRivePropertySetter('apyValue')).toHaveBeenCalledWith('4.6%');
    });

    it('binds the APY digit count so the artboard picks the matching layout', () => {
      mockApy = { apyPercent: 4.6, apyPercentFormatted: '4.6%' };

      renderMoneyOnboardingView();

      expect(__getRivePropertySetter('apyAmountDigit')).toHaveBeenCalledWith(2);
    });

    it('binds the fallback APY when the rate has not loaded yet', () => {
      mockApy = {};

      renderMoneyOnboardingView();

      expect(__getRivePropertySetter('apyValue')).toHaveBeenCalledWith('4%');
      expect(__getRivePropertySetter('apyAmountDigit')).toHaveBeenCalledWith(1);
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
    it('plays page navigation haptic when the continue trigger fires', () => {
      renderMoneyOnboardingView();

      fireTrigger('continue');

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
    });

    it('plays page navigation haptic when the back trigger fires past the first step', () => {
      renderMoneyOnboardingView();
      advanceStep();
      (playImpact as jest.Mock).mockClear();

      fireTrigger('back');

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
    });

    it('does not play haptic while no navigation trigger fires', () => {
      renderMoneyOnboardingView();

      expect(playImpact).not.toHaveBeenCalled();
    });
  });

  describe('Overlay fade animation', () => {
    it('fades out when the transition starts and fades in when the step settles', () => {
      renderMoneyOnboardingView();
      (withTiming as jest.Mock).mockClear();

      fireTrigger('continue');

      expect(withTiming).toHaveBeenCalledWith(0, {
        duration: 200,
      });

      settleTransition();

      expect(withTiming).toHaveBeenCalledWith(1, {
        duration: 200,
      });
    });
  });

  describe('Rive errors', () => {
    const riveError: RiveError = {
      message: 'Unable to load artboard',
      type: RiveErrorType.IncorrectArtboardName,
    };

    const renderAndTriggerRiveError = () => {
      renderMoneyOnboardingView();

      act(() => {
        mockRiveViewProps.current?.onError?.(riveError);
      });
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
    it('keeps step1 text during the forward transition and swaps when step 2 settles', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      fireTrigger('continue');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step1_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step1_body', { percentage: 4 }));

      settleTransition();

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

    it('keeps step2 text during the backward transition and swaps when step 1 settles', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      advanceStep();
      fireTrigger('back');

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step2_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step2_body'));

      settleTransition();

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step1_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step1_body', { percentage: 4 }));
    });

    it('keeps the step4 overlay copy on the final step, which has no overlay content of its own', async () => {
      const { getByTestId } = renderMoneyOnboardingView();

      advanceStep();
      advanceStep();
      advanceStep();
      await completeOnboarding();

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step4_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step4_body'));
    });

    it('renders step3 card_eligible body when user is not US unauthenticated non-cardholder', () => {
      mockIsUsUnauthenticatedNonCardholder = false;

      const { getByTestId } = renderMoneyOnboardingView();

      advanceStep();
      advanceStep();

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

      advanceStep();
      advanceStep();

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

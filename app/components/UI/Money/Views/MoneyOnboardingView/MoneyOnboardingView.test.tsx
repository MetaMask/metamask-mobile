import React from 'react';
import { act, render } from '@testing-library/react-native';
import {
  Dimensions,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { Fit, RiveErrorType, type RiveError } from '@rive-app/react-native';
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
  __setRivePropertyValue,
} from '../../../../../__mocks__/rive-app-react-native';

const mockTrackOnboardingEvent = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockTimingCompletion: (() => void) | undefined;
let mockIsUsUnauthenticatedNonCardholder = false;
let mockIsE2EOrPerformanceTest = false;
let mockRouteParams:
  | {
      postOnboardingRedirect?: {
        type: MoneyPostOnboardingRedirectType;
        preferredPaymentToken?: {
          address: `0x${string}`;
          chainId: `0x${string}`;
        };
        autoSelectFiatPayment?: boolean;
        intent?: 'convert' | 'addMusd' | 'card';
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

jest.mock('../../../../../util/test/utils', () => ({
  get isE2EOrPerformanceTest() {
    return mockIsE2EOrPerformanceTest;
  },
}));

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: jest.fn(
    (callback: (...args: number[]) => void, ...args: number[]) =>
      callback(...args),
  ),
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
    withTiming: jest.fn(
      (
        toValue: number,
        config: { duration: number },
        callback?: (finished: boolean) => void,
      ) => {
        if (callback) {
          mockTimingCompletion = () => callback(true);
        }
        return { config, toValue };
      },
    ),
  };
});

const mockWorklets = jest.requireMock(
  'react-native-worklets',
) as typeof import('react-native-worklets');

// Local wrapper around the global Nitro Rive mock so the RiveView `onError`
// prop is observable; triggers/setters are driven via the global mock helpers.
interface MockRiveViewProps {
  fit?: Fit;
  onError?: (error: RiveError) => void;
  onLayout?: () => void;
  style?: StyleProp<ViewStyle>;
}

const mockRiveViewProps: { current?: MockRiveViewProps } = {};

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  const ReactActual = jest.requireActual('react');
  const MockRiveView = (props: MockRiveViewProps) => {
    mockRiveViewProps.current = props;
    return ReactActual.createElement(actual.RiveView, props);
  };
  return {
    __esModule: true,
    ...actual,
    RiveView: MockRiveView,
  };
});

const fireTrigger = (path: string) => {
  act(() => {
    __fireRiveTrigger(path);
  });
};

let mockCurrentStep = 1;

const setCurrentStep = (step: number) => {
  act(() => {
    mockCurrentStep = step;
    __setRivePropertyValue('currentStep', step);
  });
};

const completeOverlayFade = () => {
  act(() => {
    mockTimingCompletion?.();
    mockTimingCompletion = undefined;
  });
};

const advanceStep = () => {
  setCurrentStep(mockCurrentStep + 1);
};

const goBack = () => {
  setCurrentStep(mockCurrentStep - 1);
};

const setOnboardingCompleted = (completed: boolean) => {
  if (completed) {
    fireTrigger('onboardingCompleted');
  }
};

/** Emits each Rive step and then the completion binding. */
const completeOnboarding = async () => {
  advanceStep();
  completeOverlayFade();
  advanceStep();
  completeOverlayFade();
  advanceStep();
  completeOverlayFade();
  advanceStep();
  completeOverlayFade();
  setOnboardingCompleted(true);
};

const renderMoneyOnboardingView = () => render(<MoneyOnboardingView />);

const triggerRiveLayout = () => {
  act(() => {
    mockRiveViewProps.current?.onLayout?.();
  });
};

describe('MoneyOnboardingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(mockWorklets, 'scheduleOnRN')
      .mockImplementation(
        (callback: (...args: unknown[]) => unknown, ...args: unknown[]) =>
          callback(...args),
      );
    __resetRiveMocks();
    jest.useFakeTimers();
    mockTimingCompletion = undefined;
    mockCurrentStep = 1;
    __setRivePropertyValue('currentStep', mockCurrentStep);
    mockRiveViewProps.current = undefined;
    mockApy = { apyPercent: 4, apyPercentFormatted: '4%' };
    mockIsUsUnauthenticatedNonCardholder = false;
    mockIsE2EOrPerformanceTest = false;
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

  describe('Rive initial layout', () => {
    it('starts hidden with Cover fit before native layout', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      expect(mockRiveViewProps.current?.fit).toBe(Fit.Cover);
      expect(StyleSheet.flatten(mockRiveViewProps.current?.style).opacity).toBe(
        0,
      );
      expect(
        StyleSheet.flatten(
          getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTAINER).props.style,
        ).opacity,
      ).toBe(0);
    });

    it('switches to Layout fit after native layout while remaining hidden', () => {
      renderMoneyOnboardingView();

      triggerRiveLayout();

      expect(mockRiveViewProps.current?.fit).toBe(Fit.Layout);
      expect(StyleSheet.flatten(mockRiveViewProps.current?.style).opacity).toBe(
        0,
      );
    });

    it('reveals Rive and overlay on the animation frame after layout', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      triggerRiveLayout();

      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(
        StyleSheet.flatten(mockRiveViewProps.current?.style).opacity,
      ).toBeUndefined();
      expect(
        StyleSheet.flatten(
          getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTAINER).props.style,
        ).opacity,
      ).toBe(1);
    });
  });

  describe('Onboarding view gate', () => {
    it('renders the standard onboarding view outside E2E and performance tests', () => {
      mockIsE2EOrPerformanceTest = false;

      const { getByTestId } = renderMoneyOnboardingView();

      expect(
        getByTestId(MoneyOnboardingViewTestIds.RIVE_ANIMATION),
      ).toBeOnTheScreen();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('completes onboarding and redirects to Money home during E2E and performance tests', () => {
      mockIsE2EOrPerformanceTest = true;

      renderMoneyOnboardingView();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_MONEY_ONBOARDING_SEEN',
          payload: { seen: true },
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );
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

  describe('Step tracking (currentStep binding)', () => {
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

    it('tracks VIEWED event with step 2 when currentStep changes', () => {
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

    it('tracks VIEWED event with step 3 after two currentStep changes', () => {
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

    it('tracks VIEWED event with step 4 after three currentStep changes', () => {
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

    it('tracks the next step immediately when currentStep changes', () => {
      renderMoneyOnboardingView();
      mockTrackOnboardingEvent.mockClear();

      advanceStep();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        }),
      );
    });

    it('tracks the previous step again when currentStep moves backward', () => {
      renderMoneyOnboardingView();
      advanceStep();
      advanceStep();
      mockTrackOnboardingEvent.mockClear();

      goBack();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        }),
      );
    });

    it('ignores invalid currentStep values', () => {
      renderMoneyOnboardingView();
      mockTrackOnboardingEvent.mockClear();

      goBack();
      setCurrentStep(6);
      setCurrentStep(1.5);

      expect(mockTrackOnboardingEvent).not.toHaveBeenCalled();
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('does not retrack the current step when the binding repeats its value', async () => {
      renderMoneyOnboardingView();
      await completeOnboarding();
      mockTrackOnboardingEvent.mockClear();

      setCurrentStep(5);

      expect(mockTrackOnboardingEvent).not.toHaveBeenCalled();
    });
  });

  describe('Completion (final step)', () => {
    it('tracks VIEWED event when currentStep reaches the final step', async () => {
      renderMoneyOnboardingView();

      await completeOnboarding();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 5,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        }),
      );
    });

    it('tracks COMPLETED event when onboardingCompleted becomes true', async () => {
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

    it('navigates to Money home when onboardingCompleted becomes true', async () => {
      renderMoneyOnboardingView();

      await completeOnboarding();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );
    });

    it('waits for onboardingCompleted after reaching the final step', () => {
      renderMoneyOnboardingView();
      advanceStep();
      advanceStep();
      advanceStep();
      mockTrackOnboardingEvent.mockClear();

      advanceStep();

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 5,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        }),
      );
      expect(mockTrackOnboardingEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.COMPLETED,
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();

      setOnboardingCompleted(true);

      expect(mockTrackOnboardingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 5,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.COMPLETED,
        }),
      );
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('dispatches setMoneyOnboardingSeen when onboardingCompleted becomes true', async () => {
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

    it('preserves fiat deposit options after completing onboarding', async () => {
      mockRouteParams = {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
          autoSelectFiatPayment: true,
          intent: 'card',
        },
      };
      renderMoneyOnboardingView();

      await completeOnboarding();

      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        preferredPaymentToken: undefined,
        autoSelectFiatPayment: true,
        intent: 'card',
        replaceConfirmation: true,
        onDepositSetupFailure: expect.any(Function),
      });
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

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );
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

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );
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

    it('initializes overlay opacity for the initial step', () => {
      renderMoneyOnboardingView();

      expect(useSharedValue).toHaveBeenCalledWith(1);
      expect(withTiming).not.toHaveBeenCalled();
    });
  });

  describe('Transition haptics', () => {
    it('plays page navigation haptic when currentStep advances', () => {
      renderMoneyOnboardingView();

      advanceStep();

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
    });

    it('plays page navigation haptic when currentStep moves backward', () => {
      renderMoneyOnboardingView();
      advanceStep();
      (playImpact as jest.Mock).mockClear();

      goBack();

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
    });

    it('does not play haptic while currentStep does not change', () => {
      renderMoneyOnboardingView();

      expect(playImpact).not.toHaveBeenCalled();
    });
  });

  describe('Overlay updates', () => {
    it('fades in after currentStep changes', () => {
      renderMoneyOnboardingView();
      (withTiming as jest.Mock).mockClear();

      advanceStep();

      expect(withTiming).toHaveBeenCalledWith(
        0,
        {
          duration: 600,
        },
        expect.any(Function),
      );
      completeOverlayFade();
      expect(withTiming).toHaveBeenCalledWith(1, {
        duration: 600,
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

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );
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
    it('updates text when currentStep changes', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      advanceStep();
      completeOverlayFade();

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

    it('updates text when currentStep moves backward', () => {
      const { getByTestId } = renderMoneyOnboardingView();

      advanceStep();
      completeOverlayFade();
      goBack();
      completeOverlayFade();

      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_TITLE).props.children,
      ).toBe(strings('money.rive_onboarding.step1_title'));
      expect(
        getByTestId(MoneyOnboardingViewTestIds.OVERLAY_CONTENT).props.children,
      ).toBe(strings('money.rive_onboarding.step1_body', { percentage: 4 }));
    });

    it('keeps the step4 overlay copy on the final step, which has no overlay content of its own', async () => {
      const { getByTestId } = renderMoneyOnboardingView();

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
      completeOverlayFade();

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
      completeOverlayFade();

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

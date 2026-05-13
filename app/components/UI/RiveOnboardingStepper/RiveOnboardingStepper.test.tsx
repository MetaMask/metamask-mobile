import React from 'react';
import { View } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ButtonVariant, TextColor } from '@metamask/design-system-react-native';
import RiveOnboardingStepper from './RiveOnboardingStepper';
import { RiveOnboardingStepperTestIds } from './RiveOnboardingStepper.testIds';
import {
  __getLastMockedMethods,
  __clearLastMockedMethods,
  __mockRiveFireState,
} from '../.././../__mocks__/rive-react-native';
import Logger from '../../../util/Logger';

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = jest.fn();
  return Reanimated;
});

// Mock the money_account_onboarding_animation .riv file
jest.mock(
  '../../../animations/money_account_onboarding_animation.riv',
  () => 1,
  { virtual: true },
);

const mockRivSource = 1;
const mockStateMachineName = 'StateMachine';
const mockTriggerName = 'trig';

const STEPS = [
  {
    title: 'Step one title',
    body: 'Step one body text.',
    durationMs: 3000,
    buttonLabel: 'Next',
  },
  {
    title: 'Step two title',
    body: 'Step two body text.',
    durationMs: 3000,
    buttonLabel: 'Continue',
  },
  {
    title: 'Step three title',
    body: 'Step three body text.',
    durationMs: 3000,
    buttonLabel: 'Get Started',
  },
];

const defaultProps = {
  steps: STEPS,
  riveConfig: {
    source: mockRivSource,
    stateMachineName: mockStateMachineName,
    triggerName: mockTriggerName,
  },
  renderBackground: () => <View testID="mock-background" />,
  textColor: TextColor.PrimaryDefault,
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex
  progressBarColor: '#ffffff',
  onComplete: jest.fn(),
};

describe('RiveOnboardingStepper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearLastMockedMethods();
  });

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      expect(
        getByTestId(RiveOnboardingStepperTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the progress bar', () => {
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      expect(
        getByTestId(RiveOnboardingStepperTestIds.PROGRESS_BAR),
      ).toBeOnTheScreen();
    });

    it('renders a progress segment per step', () => {
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      STEPS.forEach((_, index) => {
        expect(
          getByTestId(
            `${RiveOnboardingStepperTestIds.PROGRESS_SEGMENT}-${index}`,
          ),
        ).toBeOnTheScreen();
      });
    });

    it('renders the Rive animation', () => {
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      expect(
        getByTestId(RiveOnboardingStepperTestIds.RIVE_ANIMATION),
      ).toBeOnTheScreen();
    });

    it('renders the footer button', () => {
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      expect(
        getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the first step title', () => {
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      expect(getByTestId(RiveOnboardingStepperTestIds.TITLE)).toBeOnTheScreen();
    });

    it('renders the first step body', () => {
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      expect(getByTestId(RiveOnboardingStepperTestIds.BODY)).toBeOnTheScreen();
    });

    it('renders background from renderBackground prop', () => {
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      expect(getByTestId('mock-background')).toBeOnTheScreen();
    });

    it('renders the custom button label for the first step', () => {
      const { getByText } = render(<RiveOnboardingStepper {...defaultProps} />);
      expect(getByText('Next')).toBeOnTheScreen();
    });
  });

  describe('Close button', () => {
    it('does not render close button when onClose is not provided', () => {
      const { queryByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      expect(
        queryByTestId(RiveOnboardingStepperTestIds.CLOSE_BUTTON),
      ).toBeNull();
    });

    it('renders close button when onClose is provided', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} onClose={onClose} />,
      );
      expect(
        getByTestId(RiveOnboardingStepperTestIds.CLOSE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} onClose={onClose} />,
      );
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.CLOSE_BUTTON));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Step navigation', () => {
    it('fires Rive trigger on Continue press when not on last step', () => {
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      expect(__mockRiveFireState).toHaveBeenCalledWith(
        mockStateMachineName,
        mockTriggerName,
      );
    });

    it('calls onComplete when Continue is pressed on the last step', () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(
        <RiveOnboardingStepper
          {...defaultProps}
          onComplete={onComplete}
          steps={STEPS.slice(0, 1)}
        />,
      );
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onComplete when not on the last step', () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} onComplete={onComplete} />,
      );
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('calls onStepChange with the new step index when advancing', () => {
      const onStepChange = jest.fn();
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} onStepChange={onStepChange} />,
      );
      // Called once on mount for step 0
      expect(onStepChange).toHaveBeenCalledWith(0);

      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      expect(onStepChange).toHaveBeenCalledWith(1);
    });

    it('shows the correct button label for each step', () => {
      jest.useFakeTimers();
      const { getByTestId, getByText } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );

      // Step 0 — custom label "Next"
      expect(getByText('Next')).toBeOnTheScreen();

      // Advance to step 1 — label "Continue"
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      act(() => jest.advanceTimersByTime(3000));
      expect(getByText('Continue')).toBeOnTheScreen();

      // Advance to step 2 — custom label "Get Started"
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      expect(getByText('Get Started')).toBeOnTheScreen();

      jest.useRealTimers();
    });

    it('does not advance past the last step', () => {
      const onComplete = jest.fn();
      const singleStep = [STEPS[0]];
      const { getByTestId } = render(
        <RiveOnboardingStepper
          {...defaultProps}
          steps={singleStep}
          onComplete={onComplete}
        />,
      );

      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      expect(onComplete).toHaveBeenCalledTimes(1);

      // Pressing again should still fire onComplete (the last step again)
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('logs error and does not crash when Rive fireState throws', () => {
      const riveMethods = __getLastMockedMethods();
      // Rive isn't mounted yet at this point; render first
      const { getByTestId } = render(
        <RiveOnboardingStepper {...defaultProps} />,
      );
      const methods = __getLastMockedMethods();
      if (methods) {
        methods.fireState.mockImplementationOnce(() => {
          throw new Error('Rive error');
        });
      }

      expect(() =>
        fireEvent.press(
          getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON),
        ),
      ).not.toThrow();
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('Custom button variant', () => {
    it('accepts a custom buttonVariant prop without crashing', () => {
      expect(() =>
        render(
          <RiveOnboardingStepper
            {...defaultProps}
            buttonVariant={ButtonVariant.Secondary}
          />,
        ),
      ).not.toThrow();
    });

    it('accepts buttonIsInverse prop without crashing', () => {
      expect(() =>
        render(<RiveOnboardingStepper {...defaultProps} buttonIsInverse />),
      ).not.toThrow();
    });
  });
});

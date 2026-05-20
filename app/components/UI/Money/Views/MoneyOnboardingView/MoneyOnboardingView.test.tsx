import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import MoneyOnboardingView, {
  MONEY_ONBOARDING_STEP_DURATION_MS,
} from './MoneyOnboardingView';
import { RiveOnboardingStepperTestIds } from '../../../RiveOnboardingStepper/RiveOnboardingStepper.testIds';
import { __clearLastMockedMethods } from '../../../../../__mocks__/rive-react-native';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn().mockReturnValue(false),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: () => ({ apyPercent: 4 }),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = jest.fn();
  return Reanimated;
});

jest.mock(
  '../../../../../animations/money_account_onboarding_animation.riv',
  () => 1,
  { virtual: true },
);

describe('MoneyOnboardingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearLastMockedMethods();
  });

  describe('Rendering', () => {
    it('renders the onboarding stepper container', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      expect(
        getByTestId(RiveOnboardingStepperTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the progress bar', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      expect(
        getByTestId(RiveOnboardingStepperTestIds.PROGRESS_BAR),
      ).toBeOnTheScreen();
    });

    it('renders five progress segments', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      [0, 1, 2, 3, 4].forEach((index) => {
        expect(
          getByTestId(
            `${RiveOnboardingStepperTestIds.PROGRESS_SEGMENT}-${index}`,
          ),
        ).toBeOnTheScreen();
      });
    });

    it('renders the Rive animation', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      expect(
        getByTestId(RiveOnboardingStepperTestIds.RIVE_ANIMATION),
      ).toBeOnTheScreen();
    });

    it('renders the footer button', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      expect(
        getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the close button', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      expect(
        getByTestId(RiveOnboardingStepperTestIds.CLOSE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the first step title', () => {
      const { getByText } = render(<MoneyOnboardingView />);
      expect(getByText('Money accounts are here')).toBeOnTheScreen();
    });

    it('renders the first step body text', () => {
      const { getByText } = render(<MoneyOnboardingView />);
      expect(
        getByText(
          'Earn up to 4% APY on your balance, available across your entire wallet.',
        ),
      ).toBeOnTheScreen();
    });

    it('renders the first step footer text', () => {
      const { getByText } = render(<MoneyOnboardingView />);
      expect(
        getByText('APY is variable and may change at any time.'),
      ).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('dispatches setMoneyOnboardingSeen and navigates to Money home when close button is pressed', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);

      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.CLOSE_BUTTON));

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_MONEY_ONBOARDING_SEEN' }),
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('dispatches setMoneyOnboardingSeen and navigates to Money home on completion', () => {
      jest.useFakeTimers();
      const { getByTestId } = render(<MoneyOnboardingView />);
      const footerButton = getByTestId(
        RiveOnboardingStepperTestIds.FOOTER_BUTTON,
      );

      // Step 0 -> 1 (button starts enabled at step 0)
      fireEvent.press(footerButton);
      act(() => jest.advanceTimersByTime(MONEY_ONBOARDING_STEP_DURATION_MS));

      // Step 1 -> 2
      fireEvent.press(footerButton);
      act(() => jest.advanceTimersByTime(MONEY_ONBOARDING_STEP_DURATION_MS));

      // Step 2 -> 3
      fireEvent.press(footerButton);
      act(() => jest.advanceTimersByTime(MONEY_ONBOARDING_STEP_DURATION_MS));

      // Step 3 -> 4 (last step, autoComplete timer starts)
      fireEvent.press(footerButton);

      // Auto-complete timer fires onComplete after durationMs
      act(() => jest.advanceTimersByTime(MONEY_ONBOARDING_STEP_DURATION_MS));

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_MONEY_ONBOARDING_SEEN' }),
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });

      jest.useRealTimers();
    });

    it('does not navigate to Money home when continuing between non-final steps', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

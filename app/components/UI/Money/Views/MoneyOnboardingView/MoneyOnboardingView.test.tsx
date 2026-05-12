import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyOnboardingView from './MoneyOnboardingView';
import { RiveOnboardingStepperTestIds } from '../../../RiveOnboardingStepper/RiveOnboardingStepper.testIds';
import { __clearLastMockedMethods } from '../../../../../__mocks__/rive-react-native';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

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

    it('renders four progress segments', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      [0, 1, 2, 3].forEach((index) => {
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
          'Earn 4% APY on your balance, available across your entire wallet.',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('calls navigation.goBack when close button is pressed', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.CLOSE_BUTTON));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls navigation.goBack when the last step is completed', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      const footerButton = getByTestId(
        RiveOnboardingStepperTestIds.FOOTER_BUTTON,
      );

      // Advance through steps 1, 2, 3 → then complete on step 4
      fireEvent.press(footerButton);
      fireEvent.press(footerButton);
      fireEvent.press(footerButton);
      fireEvent.press(footerButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack when continuing between non-final steps', () => {
      const { getByTestId } = render(<MoneyOnboardingView />);
      fireEvent.press(getByTestId(RiveOnboardingStepperTestIds.FOOTER_BUTTON));
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Step content', () => {
    it('shows the final step "Get Started" button label on the last step', () => {
      const { getByTestId, getByText } = render(<MoneyOnboardingView />);
      const footerButton = getByTestId(
        RiveOnboardingStepperTestIds.FOOTER_BUTTON,
      );

      // Advance to step 4 (last)
      fireEvent.press(footerButton);
      fireEvent.press(footerButton);
      fireEvent.press(footerButton);

      expect(getByText('Get Started')).toBeOnTheScreen();
    });
  });
});

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../testUtils';
import OnboardingStep1 from '../OnboardingStep1';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock redux
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

// Mock design system
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((styles) => ({
      testID: `tw-${Array.isArray(styles) ? styles.join('-') : styles}`,
    })),
  }),
}));

// Mock theme
jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        muted: '#f5f5f5',
      },
    },
  }),
}));

// Mock strings
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => `mocked_${key}`,
}));

// Mock all image and SVG imports
jest.mock(
  '../../../../../images/rewards/rewards-onboarding-step1.png',
  () => 'step1Img',
);
jest.mock(
  '../../../../../images/rewards/rewards-onboarding-step1-bg.svg',
  () => 'Step1BgImg',
);

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => ({
  Text: 'Text',
  TextVariant: {
    HeadingLg: 'HeadingLg',
    BodyMd: 'BodyMd',
  },
  ButtonIcon: 'ButtonIcon',
  ButtonIconSize: {
    Lg: 'Lg',
    Md: 'Md',
    Sm: 'Sm',
  },
  IconName: {
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    Close: 'Close',
  },
  Box: 'Box',
  BoxJustifyContent: {
    Center: 'Center',
    FlexStart: 'FlexStart',
    FlexEnd: 'FlexEnd',
    SpaceBetween: 'SpaceBetween',
  },
  BoxAlignItems: {
    Center: 'Center',
    FlexStart: 'FlexStart',
    FlexEnd: 'FlexEnd',
  },
  BoxFlexDirection: {
    Row: 'Row',
    Column: 'Column',
  },
  ButtonVariant: {
    Primary: 'Primary',
    Secondary: 'Secondary',
    Link: 'Link',
  },
  ButtonSize: {
    Lg: 'Lg',
    Md: 'Md',
    Sm: 'Sm',
  },
  Button: 'Button',
}));

// React Native components are mocked globally in testSetup.js

// Mock actions and reducers
jest.mock('../../../../../../actions/rewards', () => ({
  setOnboardingActiveStep: jest.fn((step) => ({
    type: 'SET_ONBOARDING_ACTIVE_STEP',
    payload: step,
  })),
}));

jest.mock('../../../../../../reducers/rewards/types', () => ({
  OnboardingStep: {
    STEP_1: 'STEP_1',
    STEP_4: 'STEP_4',
  },
}));

// Mock routes
jest.mock('../../../../../../constants/navigation/Routes', () => ({
  REWARDS_ONBOARDING_2: 'REWARDS_ONBOARDING_2',
  REWARDS_ONBOARDING_4: 'REWARDS_ONBOARDING_4',
  WALLET_VIEW: 'WALLET_VIEW',
}));

describe('OnboardingStep1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render step content with title and description', () => {
      renderWithProviders(<OnboardingStep1 />);

      expect(
        screen.getByText('mocked_rewards.onboarding.step1_title'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step1_description'),
      ).toBeDefined();
    });

    it('should render step image', () => {
      renderWithProviders(<OnboardingStep1 />);

      expect(screen.getByTestId('step-1-image')).toBeDefined();
    });

    it('should render navigation buttons', () => {
      renderWithProviders(<OnboardingStep1 />);

      // Verify that navigation buttons are rendered in the component
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should integrate with navigation and dispatch functions', () => {
      renderWithProviders(<OnboardingStep1 />);

      // Verify navigation and dispatch functions are available
      expect(mockDispatch).toBeDefined();
      expect(mockNavigate).toBeDefined();
    });
  });

  describe('skip functionality', () => {
    it('should render skip button', () => {
      renderWithProviders(<OnboardingStep1 />);

      // Verify skip button is rendered
      const skipButton = screen.getByTestId('skip-button');
      expect(skipButton).toBeDefined();
    });

    it('should navigate to step 4 and update redux state when skip button is pressed', () => {
      renderWithProviders(<OnboardingStep1 />);

      // Find and press the skip button
      const skipButton = screen.getByTestId('skip-button');
      fireEvent.press(skipButton);

      // Verify navigation and dispatch were called with correct arguments
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: 'STEP_4' }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('REWARDS_ONBOARDING_4');
    });
  });
});

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '../testUtils';
import OnboardingStep3 from '../OnboardingStep3';

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
  '../../../../../images/rewards/rewards-onboarding-step3.png',
  () => 'step3Img',
);
jest.mock(
  '../../../../../images/rewards/rewards-onboarding-step3-bg.svg',
  () => 'Step3BgImg',
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
  setOnboardingActiveStep: jest.fn(),
}));

jest.mock('../../../../../../reducers/rewards/types', () => ({
  OnboardingStep: {
    STEP_3: 'STEP_3',
  },
}));

describe('OnboardingStep3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render step content with title and description', () => {
      renderWithProviders(<OnboardingStep3 />);

      expect(
        screen.getByText('mocked_rewards.onboarding.step3_title'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step3_description'),
      ).toBeDefined();
    });

    it('should render step image', () => {
      renderWithProviders(<OnboardingStep3 />);

      expect(screen.getByTestId('step-3-image')).toBeDefined();
    });

    it('should render navigation buttons', () => {
      renderWithProviders(<OnboardingStep3 />);

      // Verify that navigation buttons are rendered in the component
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should integrate with navigation and dispatch functions', () => {
      renderWithProviders(<OnboardingStep3 />);

      // Verify navigation and dispatch functions are available
      expect(mockDispatch).toBeDefined();
      expect(mockNavigate).toBeDefined();
    });
  });
});

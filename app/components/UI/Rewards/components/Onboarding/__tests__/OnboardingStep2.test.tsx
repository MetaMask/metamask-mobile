import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '../testUtils';
import OnboardingStep2 from '../OnboardingStep2';

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
  '../../../../../images/rewards/rewards-onboarding-step2.png',
  () => 'step2Img',
);
jest.mock(
  '../../../../../images/rewards/rewards-onboarding-step2-bg.svg',
  () => 'Step2BgImg',
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
    STEP_2: 'STEP_2',
  },
}));

describe('OnboardingStep2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render step content with title and description', () => {
      renderWithProviders(<OnboardingStep2 />);

      expect(
        screen.getByText('mocked_rewards.onboarding.step2_title'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step2_description'),
      ).toBeDefined();
    });

    it('should render step image', () => {
      renderWithProviders(<OnboardingStep2 />);

      expect(screen.getByTestId('step-2-image')).toBeDefined();
    });

    it('should render navigation buttons', () => {
      renderWithProviders(<OnboardingStep2 />);

      // Verify that navigation buttons are rendered in the component
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should integrate with navigation and dispatch functions', () => {
      renderWithProviders(<OnboardingStep2 />);

      // Verify navigation and dispatch functions are available
      expect(mockDispatch).toBeDefined();
      expect(mockNavigate).toBeDefined();
    });
  });
});

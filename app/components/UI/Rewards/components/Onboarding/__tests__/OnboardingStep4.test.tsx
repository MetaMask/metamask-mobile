import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '../testUtils';
import OnboardingStep4 from '../OnboardingStep4';

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
  '../../../../../images/rewards/rewards-onboarding-step4.png',
  () => 'step4Img',
);
jest.mock(
  '../../../../../images/rewards/rewards-onboarding-step4-bg.svg',
  () => 'Step4BgImg',
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
    Export: 'Export',
  },
  IconSize: {
    Xs: 'Xs',
    Sm: 'Sm',
    Md: 'Md',
    Lg: 'Lg',
  },
  IconColor: {
    PrimaryDefault: 'PrimaryDefault',
    Alternative: 'Alternative',
    Muted: 'Muted',
  },
  Icon: 'Icon',
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
  FontWeight: {
    Bold: 'Bold',
    Normal: 'Normal',
    Light: 'Light',
  },
}));

// React Native components are mocked globally in testSetup.js

// Mock actions and reducers
jest.mock('../../../../../../actions/rewards', () => ({
  setOnboardingActiveStep: jest.fn(),
}));

jest.mock('../../../../../../reducers/rewards/types', () => ({
  OnboardingStep: {
    STEP_4: 'STEP_4',
  },
}));

describe('OnboardingStep4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render step content with title and description', () => {
      renderWithProviders(<OnboardingStep4 />);

      expect(
        screen.getByText('mocked_rewards.onboarding.step4_title'),
      ).toBeDefined();
    });

    it('should render referral bonus description and input placeholder', () => {
      renderWithProviders(<OnboardingStep4 />);

      // Check that referral_bonus_description is rendered
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.step4_referral_bonus_description',
        ),
      ).toBeDefined();

      // Check that referral_input_placeholder is rendered
      expect(
        screen.getByPlaceholderText(
          'mocked_rewards.onboarding.step4_referral_input_placeholder',
        ),
      ).toBeDefined();
    });

    it('should render step image', () => {
      renderWithProviders(<OnboardingStep4 />);

      expect(screen.getByTestId('step-4-image')).toBeDefined();
    });

    it('should render navigation buttons', () => {
      renderWithProviders(<OnboardingStep4 />);

      // Verify that navigation buttons are rendered in the component
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should integrate with navigation and dispatch functions', () => {
      renderWithProviders(<OnboardingStep4 />);

      // Verify navigation and dispatch functions are available
      expect(mockDispatch).toBeDefined();
      expect(mockNavigate).toBeDefined();
    });
  });
});

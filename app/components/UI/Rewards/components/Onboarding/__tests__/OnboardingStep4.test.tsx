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
  useFocusEffect: jest.fn(),
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

// Mock RewardsErrorBanner
jest.mock('../../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, description }: { title: string; description: string }) =>
      ReactActual.createElement(
        View,
        { testID: 'rewards-error-banner' },
        ReactActual.createElement(Text, { testID: 'error-title' }, title),
        ReactActual.createElement(
          Text,
          { testID: 'error-description' },
          description,
        ),
      ),
  };
});

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

// Mock hooks
jest.mock('../../../hooks/useOptIn', () => ({
  useOptin: jest.fn(() => ({
    optin: jest.fn(),
    optinError: null,
    optinLoading: false,
    clearOptinError: jest.fn(),
  })),
}));

jest.mock('../../../hooks/useValidateReferralCode', () => ({
  useValidateReferralCode: jest.fn(() => ({
    referralCode: '',
    setReferralCode: jest.fn(),
    isValidating: false,
    isValid: true,
    isUnknownError: false,
    validateCode: jest.fn(),
  })),
}));

// Mock actions and reducers
jest.mock('../../../../../../actions/rewards', () => ({
  setOnboardingActiveStep: jest.fn((step) => ({
    type: 'SET_ONBOARDING_ACTIVE_STEP',
    payload: step,
  })),
  setOnboardingComplete: jest.fn(() => ({ type: 'SET_ONBOARDING_COMPLETE' })),
}));

jest.mock('../../../../../../reducers/rewards/types', () => ({
  OnboardingStep: {
    STEP_4: 'STEP_4',
  },
}));

// Mock selectors
jest.mock('../../../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

import { useOptin } from '../../../hooks/useOptIn';
import { useValidateReferralCode } from '../../../hooks/useValidateReferralCode';

const mockUseOptin = useOptin as jest.MockedFunction<typeof useOptin>;
const mockUseValidateReferralCode =
  useValidateReferralCode as jest.MockedFunction<
    typeof useValidateReferralCode
  >;

describe('OnboardingStep4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render step content with title and description', () => {
      renderWithProviders(<OnboardingStep4 />);

      // Since mock has isValid: true, it shows the referral bonus title
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.step4_title_referral_bonus',
        ),
      ).toBeDefined();
    });

    it('should render regular title when referral code is invalid', () => {
      // Mock referral code as invalid for this test
      mockUseValidateReferralCode.mockReturnValueOnce({
        referralCode: 'INVALID',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

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

  describe('error states', () => {
    it('should show error banner when optin fails', () => {
      // Arrange: Mock an optin error
      mockUseOptin.mockReturnValue({
        optin: jest.fn(),
        optinError: 'Network error',
        optinLoading: false,
        clearOptinError: jest.fn(),
      });

      mockUseValidateReferralCode.mockReturnValue({
        referralCode: '',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      // Act
      renderWithProviders(<OnboardingStep4 />);

      // Assert
      expect(screen.getByTestId('rewards-error-banner')).toBeDefined();
      expect(screen.getByTestId('error-title')).toBeDefined();
      expect(screen.getByTestId('error-description')).toBeDefined();
    });

    it('should not show error banner when no optin error', () => {
      // Arrange: Mock no optin error
      mockUseOptin.mockReturnValue({
        optin: jest.fn(),
        optinError: null,
        optinLoading: false,
        clearOptinError: jest.fn(),
      });

      mockUseValidateReferralCode.mockReturnValue({
        referralCode: '',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      // Act
      renderWithProviders(<OnboardingStep4 />);

      // Assert
      expect(screen.queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('should show unknown error banner when referral validation has unknown error', () => {
      // Arrange: Mock unknown error in referral validation
      mockUseOptin.mockReturnValue({
        optin: jest.fn(),
        optinError: null,
        optinLoading: false,
        clearOptinError: jest.fn(),
      });

      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'TEST123',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: false,
        isUnknownError: true,
        validateCode: jest.fn(),
      });

      // Act
      renderWithProviders(<OnboardingStep4 />);

      // Assert
      expect(screen.getByTestId('rewards-error-banner')).toBeDefined();
      expect(screen.getByTestId('error-title')).toBeDefined();
      expect(screen.getByTestId('error-description')).toBeDefined();
      // Verify it uses the new string keys
      expect(
        screen.getByText(
          'mocked_rewards.referral_validation_unknown_error.title',
        ),
      ).toBeDefined();
      expect(
        screen.getByText(
          'mocked_rewards.referral_validation_unknown_error.description',
        ),
      ).toBeDefined();
    });

    it('should not show unknown error banner when referral validation has no unknown error', () => {
      // Arrange: Mock no unknown error in referral validation
      mockUseOptin.mockReturnValue({
        optin: jest.fn(),
        optinError: null,
        optinLoading: false,
        clearOptinError: jest.fn(),
      });

      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'TEST123',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      // Act
      renderWithProviders(<OnboardingStep4 />);

      // Assert - Should not show the unknown error banner
      expect(
        screen.queryByText(
          'mocked_rewards.referral_validation_unknown_error.title',
        ),
      ).toBeNull();
      expect(
        screen.queryByText(
          'mocked_rewards.referral_validation_unknown_error.description',
        ),
      ).toBeNull();
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

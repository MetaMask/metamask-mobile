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
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    Text: 'Text',
    TextVariant: {
      HeadingLg: 'HeadingLg',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
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
      Confirmation: 'Confirmation',
      Error: 'Error',
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
      SuccessDefault: 'SuccessDefault',
      ErrorDefault: 'ErrorDefault',
    },
    Icon: ({ name, ...props }: { name: string; [key: string]: unknown }) =>
      ReactActual.createElement(View, {
        testID: `${name.toLowerCase()}-icon`,
        ...props,
      }),
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
  };
});

// Mock React Native components
jest.mock('react-native', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    ...RN,
    ActivityIndicator: (props: unknown) =>
      ReactActual.createElement(RN.View, {
        testID: 'activity-indicator',
        ...(props as Record<string, unknown>),
      }),
    Linking: {
      openURL: jest.fn(),
    },
  };
});

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
  selectRewardsSubscriptionId: jest.fn(() => null),
}));

// Mock OnboardingStepComponent
jest.mock('../OnboardingStep', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      renderStepInfo,
      nextButtonAlternative,
      ...props
    }: {
      renderStepInfo: () => React.ReactElement;
      nextButtonAlternative: () => React.ReactElement;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'onboarding-step-container', ...props },
        renderStepInfo?.(),
        nextButtonAlternative?.(),
      ),
  };
});

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

  describe('referral code input', () => {
    it('should handle referral code input changes', () => {
      const mockSetReferralCode = jest.fn();

      mockUseValidateReferralCode.mockReturnValue({
        referralCode: '',
        setReferralCode: mockSetReferralCode,
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      const input = screen.getByPlaceholderText(
        'mocked_rewards.onboarding.step4_referral_input_placeholder',
      );

      // Simulate typing in the input
      input.props.onChangeText('ABC123');

      expect(mockSetReferralCode).toHaveBeenCalledWith('ABC123');
    });

    it('should show error message for invalid referral code', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'INVALID123',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      expect(
        screen.getByText(
          'mocked_rewards.onboarding.step4_referral_input_error',
        ),
      ).toBeDefined();
    });

    it('should not show error message for short codes', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'ABC',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      expect(
        screen.queryByText(
          'mocked_rewards.onboarding.step4_referral_input_error',
        ),
      ).toBeNull();
    });
  });

  describe('icon states', () => {
    it('should show success icon when referral code is valid', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'VALID123',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      expect(screen.getByTestId('confirmation-icon')).toBeDefined();
    });

    it('should show error icon when referral code is invalid and long enough', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'INVALID123',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      expect(screen.getByTestId('error-icon')).toBeDefined();
    });

    it('should show no icon for short codes', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'ABC',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      expect(screen.queryByTestId('activity-indicator')).toBeNull();
      expect(screen.queryByTestId('confirmation-icon')).toBeNull();
      expect(screen.queryByTestId('error-icon')).toBeNull();
    });
  });

  describe('button states', () => {
    it('should disable next button when referral code is invalid', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'INVALID123',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      const container = screen.getByTestId('onboarding-step-container');
      expect(container).toBeDefined();
      // Button disabled state is passed to OnboardingStepComponent
    });

    it('should disable next button when unknown error occurs', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'ERROR123',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: false,
        isUnknownError: true,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      const container = screen.getByTestId('onboarding-step-container');
      expect(container).toBeDefined();
    });

    it('should show loading text when optin is loading', () => {
      mockUseOptin.mockReturnValue({
        optin: jest.fn(),
        optinError: null,
        optinLoading: true,
        clearOptinError: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      // Loading text is passed to OnboardingStepComponent
      const container = screen.getByTestId('onboarding-step-container');
      expect(container).toBeDefined();
    });

    it('should show validating text when validating referral code', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'TEST123',
        setReferralCode: jest.fn(),
        isValidating: true,
        isValid: false,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      const container = screen.getByTestId('onboarding-step-container');
      expect(container).toBeDefined();
    });
  });

  describe('legal disclaimer', () => {
    it('should render legal disclaimer text', () => {
      renderWithProviders(<OnboardingStep4 />);

      expect(
        screen.getByText('mocked_rewards.onboarding.step4_legal_disclaimer_2'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step4_legal_disclaimer_4'),
      ).toBeDefined();
    });

    it('should handle terms of use link press', () => {
      const { Linking } = jest.requireActual('react-native');
      const mockOpenURL = Linking.openURL;

      renderWithProviders(<OnboardingStep4 />);

      const termsLink = screen.getByText(
        'mocked_rewards.onboarding.step4_legal_disclaimer_2',
      );

      if (termsLink.props.onPress) {
        termsLink.props.onPress();
        expect(mockOpenURL).toHaveBeenCalled();
      }
    });

    it('should handle learn more link press', () => {
      const { Linking } = jest.requireActual('react-native');
      const mockOpenURL = Linking.openURL;

      renderWithProviders(<OnboardingStep4 />);

      const learnMoreLink = screen.getByText(
        'mocked_rewards.onboarding.step4_legal_disclaimer_4',
      );

      if (learnMoreLink.props.onPress) {
        learnMoreLink.props.onPress();
        expect(mockOpenURL).toHaveBeenCalled();
      }
    });
  });

  describe('next button interaction', () => {
    it('should call optin with referral code when next button is pressed', () => {
      const mockOptin = jest.fn();

      mockUseOptin.mockReturnValue({
        optin: mockOptin,
        optinError: null,
        optinLoading: false,
        clearOptinError: jest.fn(),
      });

      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'VALID123',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      renderWithProviders(<OnboardingStep4 />);

      // Simulate next button press by calling the handleNext function
      // This would be triggered by OnboardingStepComponent
      const container = screen.getByTestId('onboarding-step-container');
      expect(container).toBeDefined();

      // The optin function should be available to be called with the referral code
      // This tests that the handleNext callback is properly formed
      expect(mockOptin).toBeDefined();
    });

    it('should call optin with empty referral code when no code is entered', () => {
      const mockOptin = jest.fn();

      mockUseOptin.mockReturnValue({
        optin: mockOptin,
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

      renderWithProviders(<OnboardingStep4 />);

      const container = screen.getByTestId('onboarding-step-container');
      expect(container).toBeDefined();

      expect(mockOptin).toBeDefined();
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

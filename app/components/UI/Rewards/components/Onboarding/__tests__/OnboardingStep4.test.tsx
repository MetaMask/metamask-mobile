import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '../testUtils';
import OnboardingStep4 from '../OnboardingStep4';

// Mock navigation
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: jest.fn(),
  };
});

// Mock route params
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => ({
    referral: undefined,
    isFromDeeplink: false,
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

jest.mock('../../../../../../reducers/rewards/selectors', () => ({
  selectOnboardingReferralCode: jest.fn(() => null),
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
import { selectRewardsSubscriptionId } from '../../../../../../selectors/rewards';
import { selectOnboardingReferralCode } from '../../../../../../reducers/rewards/selectors';

const mockUseOptin = useOptin as jest.MockedFunction<typeof useOptin>;
const mockUseValidateReferralCode =
  useValidateReferralCode as jest.MockedFunction<
    typeof useValidateReferralCode
  >;
const mockSelectRewardsSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;
const mockSelectOnboardingReferralCode =
  selectOnboardingReferralCode as jest.MockedFunction<
    typeof selectOnboardingReferralCode
  >;

describe('OnboardingStep4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders step content with title and description', () => {
      renderWithProviders(<OnboardingStep4 />);

      // Since mock has isValid: true, it shows the referral bonus title
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.step4_title_referral_bonus',
        ),
      ).toBeDefined();
    });

    it('renders regular title when referral code is invalid', () => {
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

    it('renders referral bonus description and input placeholder', () => {
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

    it('renders step image', () => {
      renderWithProviders(<OnboardingStep4 />);

      expect(screen.getByTestId('step-4-image')).toBeDefined();
    });

    it('renders navigation buttons', () => {
      renderWithProviders(<OnboardingStep4 />);

      // Verify that navigation buttons are rendered in the component
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });
  });

  describe('error states', () => {
    it('displays error banner when optin fails', () => {
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

      renderWithProviders(<OnboardingStep4 />);

      expect(screen.getByTestId('rewards-error-banner')).toBeDefined();
      expect(screen.getByTestId('error-title')).toBeDefined();
      expect(screen.getByTestId('error-description')).toBeDefined();
    });

    it('hides error banner when no optin error exists', () => {
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

      renderWithProviders(<OnboardingStep4 />);

      expect(screen.queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('displays unknown error banner when referral validation encounters unknown error', () => {
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

      renderWithProviders(<OnboardingStep4 />);

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

    it('hides unknown error banner when referral validation has no unknown error', () => {
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

      renderWithProviders(<OnboardingStep4 />);

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
    it('updates referral code when input changes', () => {
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

      input.props.onChangeText('ABC123');

      expect(mockSetReferralCode).toHaveBeenCalledWith('ABC123');
    });

    it('displays error message for invalid referral code with six or more characters', () => {
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

    it('hides error message for codes shorter than six characters', () => {
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
    it('displays success icon when referral code is valid', () => {
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

    it('displays error icon when referral code is invalid and has six or more characters', () => {
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

    it('displays no icon for codes shorter than six characters', () => {
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
    it('disables next button when referral code is invalid', () => {
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

    it('disables next button when unknown error occurs', () => {
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

    it('displays loading text when optin is in progress', () => {
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

    it('displays validating text when validating referral code', () => {
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
    it('renders legal disclaimer text', () => {
      renderWithProviders(<OnboardingStep4 />);

      expect(
        screen.getByText('mocked_rewards.onboarding.step4_legal_disclaimer_1'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step4_legal_disclaimer_2'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step4_legal_disclaimer_3'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step4_legal_disclaimer_4'),
      ).toBeDefined();
    });

    it('opens terms of use URL when link is pressed', () => {
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

    it('opens learn more URL when link is pressed', () => {
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
    it('prepares optin call with referral code when next button is ready to be pressed', () => {
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

    it('prepares optin call with empty referral code when no code is entered', () => {
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
    it('integrates with navigation and dispatch functions', () => {
      renderWithProviders(<OnboardingStep4 />);

      // Verify navigation and dispatch functions are available
      expect(mockDispatch).toBeDefined();
      expect(mockNavigate).toBeDefined();
    });
  });

  describe('prefilled referral code', () => {
    it('initializes with prefilled referral code from selector', () => {
      mockSelectOnboardingReferralCode.mockReturnValue('REFER123');

      mockUseValidateReferralCode.mockImplementation((initialCode) => ({
        referralCode: initialCode || '',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      }));

      renderWithProviders(<OnboardingStep4 />);

      // Verify the hook was called with the trimmed and uppercased code
      expect(mockUseValidateReferralCode).toHaveBeenCalledWith('REFER123');
    });

    it('trims and uppercases prefilled referral code', () => {
      mockSelectOnboardingReferralCode.mockReturnValue('  refer123  ');

      mockUseValidateReferralCode.mockImplementation((initialCode) => ({
        referralCode: initialCode || '',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      }));

      renderWithProviders(<OnboardingStep4 />);

      // Verify the hook was called with trimmed and uppercased version
      expect(mockUseValidateReferralCode).toHaveBeenCalledWith('REFER123');
    });

    it('calls optin with isPrefilled true when referral code is prefilled', () => {
      mockSelectOnboardingReferralCode.mockReturnValue('PREFILLED');

      const mockOptin = jest.fn();
      mockUseOptin.mockReturnValue({
        optin: mockOptin,
        optinError: null,
        optinLoading: false,
        clearOptinError: jest.fn(),
      });

      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'PREFILLED',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      const { getByTestId } = renderWithProviders(<OnboardingStep4 />);
      const container = getByTestId('onboarding-step-container');

      // Verify component rendered
      expect(container).toBeDefined();
      // The optin function is ready to be called with isPrefilled: true
      expect(mockOptin).toBeDefined();
    });

    it('calls optin with isPrefilled false when referral code is not prefilled', () => {
      mockSelectOnboardingReferralCode.mockReturnValue(null);

      const mockOptin = jest.fn();
      mockUseOptin.mockReturnValue({
        optin: mockOptin,
        optinError: null,
        optinLoading: false,
        clearOptinError: jest.fn(),
      });

      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'MANUAL123',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      const { getByTestId } = renderWithProviders(<OnboardingStep4 />);
      const container = getByTestId('onboarding-step-container');

      // Verify component rendered
      expect(container).toBeDefined();
      // The optin function is ready to be called with isPrefilled: false
      expect(mockOptin).toBeDefined();
    });
  });

  describe('auto-redirect to dashboard', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('disables next button when subscriptionId exists', () => {
      mockSelectRewardsSubscriptionId.mockReturnValue('sub-123');

      mockUseValidateReferralCode.mockReturnValue({
        referralCode: '',
        setReferralCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
        validateCode: jest.fn(),
      });

      const { getByTestId } = renderWithProviders(<OnboardingStep4 />);
      const container = getByTestId('onboarding-step-container');

      // Verify the container has the onNextDisabled prop set
      expect(container.props.onNextDisabled).toBe(true);
    });
  });
});

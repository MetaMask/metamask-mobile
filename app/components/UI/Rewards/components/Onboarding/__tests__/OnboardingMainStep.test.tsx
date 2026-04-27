import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderWithProviders, createMockDispatch } from '../testUtils';
import OnboardingMainStep from '../OnboardingMainStep';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  REWARDS_ONBOARD_TERMS_URL,
  REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
} from '../constants';
import { selectRewardsSubscriptionId } from '../../../../../../selectors/rewards';
import {
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
  selectCandidateSubscriptionId,
  selectOptinAllowedForGeoError,
  selectOnboardingReferralCode,
} from '../../../../../../reducers/rewards/selectors';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../../selectors/multichainAccounts/accountTreeController';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = effect();
        return cleanup;
      });
    },
  };
});

const mockDispatch = createMockDispatch();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((styles) => ({
      testID: `tw-${Array.isArray(styles) ? styles.join('-') : styles}`,
    })),
  }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => `mocked_${key}`,
}));

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

const mockRewardsLegalDisclaimer = jest.fn();
jest.mock('../RewardsLegalDisclaimer', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const { View, Text: RNText, Pressable } = RN;
  const MockedRN = jest.requireMock('react-native');
  const {
    REWARDS_ONBOARD_TERMS_URL: MOCK_TERMS_URL,
    REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL: MOCK_LEARN_MORE_URL,
  } = jest.requireActual('../constants');
  return {
    __esModule: true,
    default: ({
      disclaimerPart1,
      disclaimerPart2,
      disclaimerPart3,
      disclaimerPart4,
    }: {
      disclaimerPart1: string;
      disclaimerPart2: string;
      disclaimerPart3: string;
      disclaimerPart4: string;
    }) => {
      mockRewardsLegalDisclaimer({
        disclaimerPart1,
        disclaimerPart2,
        disclaimerPart3,
        disclaimerPart4,
      });
      return ReactActual.createElement(
        View,
        { testID: 'rewards-legal-disclaimer' },
        ReactActual.createElement(
          RNText,
          { testID: 'disclaimer-part-1' },
          disclaimerPart1,
        ),
        ReactActual.createElement(
          Pressable,
          {
            testID: 'terms-link',
            onPress: () => {
              MockedRN.Linking.openURL(MOCK_TERMS_URL);
            },
          },
          ReactActual.createElement(RNText, {}, disclaimerPart2),
        ),
        ReactActual.createElement(
          RNText,
          { testID: 'disclaimer-part-3' },
          disclaimerPart3,
        ),
        ReactActual.createElement(
          Pressable,
          {
            testID: 'learn-more-link',
            onPress: () => {
              MockedRN.Linking.openURL(MOCK_LEARN_MORE_URL);
            },
          },
          ReactActual.createElement(RNText, {}, disclaimerPart4),
        ),
      );
    },
  };
});

jest.mock(
  '../../../../../images/rewards/rewards-onboarding-step1.png',
  () => 'step1Img',
);

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');

  return {
    Text: ({
      children,
      onPress,
      ...props
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      [key: string]: unknown;
    }) => {
      if (onPress) {
        return ReactActual.createElement(
          Pressable,
          { onPress, testID: props.testID || 'text' },
          ReactActual.createElement(RNText, props, children),
        );
      }
      return ReactActual.createElement(
        RNText,
        { ...props, testID: props.testID || 'text' },
        children,
      );
    },
    TextVariant: {
      HeadingLg: 'HeadingLg',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    Box: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        View,
        { ...props, testID: props.testID || 'box' },
        children,
      ),
    BoxAlignItems: { Center: 'Center' },
    BoxFlexDirection: { Row: 'Row' },
    ButtonVariant: { Primary: 'Primary' },
    FontWeight: { Medium: 'Medium', Bold: 'Bold' },
    IconSize: { Lg: 'Lg' },
    Icon: () => ReactActual.createElement(View, { testID: 'icon' }),
    IconName: { Confirmation: 'Confirmation', Error: 'Error' },
    IconColor: {
      SuccessDefault: 'SuccessDefault',
      ErrorDefault: 'ErrorDefault',
    },
    TextField: (props: {
      testID?: string;
      value?: string;
      onChangeText?: (text: string) => void;
      placeholder?: string;
      isDisabled?: boolean;
      [key: string]: unknown;
    }) => {
      const { TextInput: RNTextInput } = jest.requireActual('react-native');
      return ReactActual.createElement(
        View,
        { testID: props.testID || 'text-field' },
        ReactActual.createElement(RNTextInput, {
          testID: `${props.testID || 'text-field'}-input`,
          value: props.value,
          onChangeText: props.onChangeText,
          placeholder: props.placeholder,
          editable: !props.isDisabled,
        }),
      );
    },
  };
});

jest.mock('react-native', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    ...RN,
    Image: (props: { testID?: string; [key: string]: unknown }) =>
      ReactActual.createElement(RN.View, {
        testID: props.testID || 'image',
        ...props,
      }),
    Linking: {
      openURL: jest.fn(),
    },
    ActivityIndicator: () =>
      ReactActual.createElement(RN.View, { testID: 'activity-indicator' }),
  };
});

jest.mock(
  '../../../../../../component-library/components-temp/Skeleton',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      Skeleton: () =>
        ReactActual.createElement(View, { testID: 'skeleton-loader' }),
    };
  },
);

const mockOptin = jest.fn();
const mockUseOptin = {
  optin: mockOptin,
  optinError: null as string | null,
  optinLoading: false,
};

jest.mock('../../../hooks/useOptIn', () => ({
  useOptin: () => mockUseOptin,
}));

const mockUseValidateReferralCode = {
  referralCode: '',
  setReferralCode: jest.fn(),
  isValidating: false,
  isValid: false,
  isUnknownError: false,
  validateCode: jest.fn(),
};

jest.mock('../../../hooks/useValidateReferralCode', () => ({
  useValidateReferralCode: () => mockUseValidateReferralCode,
}));

jest.mock('../../../hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: () => ({ fetchGeoRewardsMetadata: jest.fn() }),
}));

jest.mock('../../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

jest.mock('../../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(() => true),
  },
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({ build: () => 'mock-event' }));
jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
}));

jest.mock('../OnboardingStep', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      renderStepInfo,
      renderStepImage,
      renderAboveCTA,
      renderBelowCTA,
      renderLegalDisclaimer,
      onNext,
      onNextDisabled,
      onNextLoading,
      onNextLoadingText,
      nextButtonText,
      ...props
    }: {
      renderStepInfo: () => React.ReactElement;
      renderStepImage?: () => React.ReactElement;
      renderAboveCTA?: () => React.ReactElement | null;
      renderBelowCTA?: () => React.ReactElement;
      renderLegalDisclaimer?: () => React.ReactElement;
      onNext: () => void;
      onNextDisabled?: boolean;
      onNextLoading?: boolean;
      onNextLoadingText?: string;
      nextButtonText?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        View,
        {
          testID: 'onboarding-step-container',
          ...props,
        },
        renderStepInfo?.(),
        renderStepImage?.(),
        renderAboveCTA?.(),
        renderLegalDisclaimer?.(),
        ReactActual.createElement(
          View,
          {
            testID: 'next-button',
            onPress: onNext,
            disabled: onNextDisabled || onNextLoading,
          },
          nextButtonText || 'Next',
        ),
        renderBelowCTA?.(),
        onNextLoadingText &&
          ReactActual.createElement(
            View,
            { testID: 'loading-text' },
            onNextLoadingText,
          ),
      ),
  };
});

const defaultSelectorMap = new Map<unknown, unknown>([
  [selectRewardsSubscriptionId, null],
  [selectOptinAllowedForGeo, true],
  [selectOptinAllowedForGeoLoading, false],
  [selectCandidateSubscriptionId, null],
  [selectOptinAllowedForGeoError, false],
  [selectOnboardingReferralCode, null],
  [selectSelectedAccountGroupInternalAccounts, [{ address: '0x123' }]],
]);

function setupSelectors(overrides: Map<unknown, unknown> = new Map()) {
  const merged = new Map([...defaultSelectorMap, ...overrides]);
  const mockUseSelector = jest.requireMock('react-redux')
    .useSelector as jest.Mock;
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (merged.has(selector)) {
      return merged.get(selector);
    }
    return undefined;
  });
}

describe('OnboardingMainStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptin.optinError = null;
    mockUseOptin.optinLoading = false;
    mockUseValidateReferralCode.referralCode = '';
    mockUseValidateReferralCode.isValidating = false;
    mockUseValidateReferralCode.isValid = false;
    mockUseValidateReferralCode.isUnknownError = false;
    mockRewardsLegalDisclaimer.mockClear();
    setupSelectors();
  });

  describe('rendering', () => {
    it('renders title and description', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(screen.getByText('mocked_rewards.onboarding.title')).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.description'),
      ).toBeDefined();
    });

    it('renders the main image', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(screen.getByTestId('onboarding-main-image')).toBeDefined();
    });

    it('renders the onboarding step container', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });

    it('renders the referral prompt', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(screen.getAllByTestId('referral-prompt').length).toBeGreaterThan(
        0,
      );
      expect(
        screen.getByText('mocked_rewards.onboarding.referral_prompt'),
      ).toBeDefined();
    });
  });

  describe('skeleton loading', () => {
    it('shows skeleton when candidateSubscriptionId is pending', () => {
      setupSelectors(new Map([[selectCandidateSubscriptionId, 'pending']]));

      renderWithProviders(<OnboardingMainStep />);

      expect(screen.getByTestId('skeleton-loader')).toBeDefined();
    });

    it('shows skeleton when subscriptionId exists', () => {
      setupSelectors(new Map([[selectRewardsSubscriptionId, 'sub-123']]));

      renderWithProviders(<OnboardingMainStep />);

      expect(screen.getByTestId('skeleton-loader')).toBeDefined();
    });
  });

  describe('error states', () => {
    it('displays error banner when optin fails', () => {
      mockUseOptin.optinError = 'Network error';

      renderWithProviders(<OnboardingMainStep />);

      expect(screen.getByTestId('rewards-error-banner')).toBeDefined();
    });

    it('hides error banner when no optin error exists', () => {
      mockUseOptin.optinError = null;

      renderWithProviders(<OnboardingMainStep />);

      expect(screen.queryByTestId('rewards-error-banner')).toBeNull();
    });
  });

  describe('loading states', () => {
    it('displays loading text when optin is in progress', () => {
      mockUseOptin.optinLoading = true;

      renderWithProviders(<OnboardingMainStep />);

      const loadingElement = screen.getByTestId('loading-text');
      expect(loadingElement).toBeDefined();
      expect(loadingElement.props.children).toBe(
        'mocked_rewards.onboarding.sign_up_loading',
      );
    });

    it('displays geo loading text when geoLoading is true', () => {
      setupSelectors(new Map([[selectOptinAllowedForGeoLoading, true]]));

      renderWithProviders(<OnboardingMainStep />);

      const loadingElement = screen.getByTestId('loading-text');
      expect(loadingElement).toBeDefined();
      expect(loadingElement.props.children).toBe(
        'mocked_rewards.onboarding.intro_confirm_geo_loading',
      );
    });

    it('displays referral validating text when validating referral code', () => {
      mockUseValidateReferralCode.isValidating = true;

      renderWithProviders(<OnboardingMainStep />);

      const loadingElement = screen.getByTestId('loading-text');
      expect(loadingElement).toBeDefined();
      expect(loadingElement.props.children).toBe(
        'mocked_rewards.onboarding.step4_title_referral_validating',
      );
    });

    it('prioritizes optin loading text over other loading states', () => {
      mockUseOptin.optinLoading = true;
      mockUseValidateReferralCode.isValidating = true;

      renderWithProviders(<OnboardingMainStep />);

      const loadingElement = screen.getByTestId('loading-text');
      expect(loadingElement.props.children).toBe(
        'mocked_rewards.onboarding.sign_up_loading',
      );
    });

    it('hides loading text when nothing is loading', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(screen.queryByTestId('loading-text')).toBeNull();
    });
  });

  describe('next button interaction', () => {
    it('calls optin with bulkLink true and empty referralCode by default', () => {
      renderWithProviders(<OnboardingMainStep />);

      const nextButton = screen.getByTestId('next-button');
      fireEvent.press(nextButton);

      expect(mockOptin).toHaveBeenCalledWith({
        referralCode: '',
        isPrefilled: false,
        bulkLink: true,
      });
    });

    it('does not call optin when canContinue returns false (geo restricted)', () => {
      setupSelectors(new Map([[selectOptinAllowedForGeo, false]]));

      renderWithProviders(<OnboardingMainStep />);

      const nextButton = screen.getByTestId('next-button');
      fireEvent.press(nextButton);

      expect(mockOptin).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          title: 'mocked_rewards.onboarding.not_supported_region_title',
        }),
      );
    });
  });

  describe('referral code', () => {
    it('does not show referral input by default', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(screen.queryByTestId('referral-input')).toBeNull();
    });

    it('shows referral input when prompt is pressed', () => {
      renderWithProviders(<OnboardingMainStep />);

      fireEvent.press(screen.getAllByTestId('referral-prompt')[0]);

      expect(screen.getByTestId('referral-input')).toBeDefined();
    });

    it('shows hide code text when referral input is visible', () => {
      renderWithProviders(<OnboardingMainStep />);

      fireEvent.press(screen.getAllByTestId('referral-prompt')[0]);

      expect(screen.getAllByTestId('referral-prompt').length).toBeGreaterThan(
        0,
      );
      expect(
        screen.getByText('mocked_rewards.onboarding.referral_hide'),
      ).toBeDefined();
      expect(screen.getByTestId('referral-input')).toBeDefined();
    });

    it('disables next button when referral code is invalid', () => {
      mockUseValidateReferralCode.referralCode = 'ABCDEF';
      mockUseValidateReferralCode.isValid = false;

      renderWithProviders(<OnboardingMainStep />);

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton.props.disabled).toBe(true);
    });

    it('disables next button when referral has unknown error', () => {
      mockUseValidateReferralCode.referralCode = 'ABCDEF';
      mockUseValidateReferralCode.isUnknownError = true;

      renderWithProviders(<OnboardingMainStep />);

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton.props.disabled).toBe(true);
    });
  });

  describe('legal disclaimer', () => {
    it('renders RewardsLegalDisclaimer with correct props', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(mockRewardsLegalDisclaimer).toHaveBeenCalledWith({
        disclaimerPart1: 'mocked_rewards.onboarding.legal_disclaimer_1',
        disclaimerPart2: 'mocked_rewards.onboarding.legal_disclaimer_2',
        disclaimerPart3: 'mocked_rewards.onboarding.legal_disclaimer_3',
        disclaimerPart4: 'mocked_rewards.onboarding.legal_disclaimer_4',
      });
    });

    it('opens terms of use URL when link is pressed', () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL');

      renderWithProviders(<OnboardingMainStep />);

      const termsLink = screen.getByTestId('terms-link');
      fireEvent.press(termsLink);

      expect(mockOpenURL).toHaveBeenCalledWith(REWARDS_ONBOARD_TERMS_URL);
    });

    it('opens learn more URL when link is pressed', () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL');

      renderWithProviders(<OnboardingMainStep />);

      const learnMoreLink = screen.getByTestId('learn-more-link');
      fireEvent.press(learnMoreLink);

      expect(mockOpenURL).toHaveBeenCalledWith(
        REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
      );
    });
  });

  describe('auto-redirect to dashboard', () => {
    it('navigates to dashboard when subscriptionId exists on focus', () => {
      setupSelectors(new Map([[selectRewardsSubscriptionId, 'sub-123']]));

      renderWithProviders(<OnboardingMainStep />);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    });

    it('does not navigate when subscriptionId does not exist', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    });
  });

  describe('component props', () => {
    it('passes correct props to OnboardingStepComponent', () => {
      renderWithProviders(<OnboardingMainStep />);

      const container = screen.getByTestId('onboarding-step-container');
      expect(container).toBeDefined();
      expect(container.props.disableSwipe).toBe(true);
      expect(container.props.showProgressIndicator).toBe(false);
    });

    it('renders step image through renderStepImage prop', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(screen.getByTestId('onboarding-main-image')).toBeDefined();
    });

    it('renders legal disclaimer through renderLegalDisclaimer prop', () => {
      renderWithProviders(<OnboardingMainStep />);

      expect(screen.getByTestId('rewards-legal-disclaimer')).toBeDefined();
    });
  });
});

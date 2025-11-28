import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderWithProviders, createMockDispatch } from '../testUtils';
import OnboardingNoActiveSeasonStep from '../OnboardingNoActiveSeasonStep';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  REWARDS_ONBOARD_TERMS_URL,
  REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
} from '../constants';
import { selectRewardsSubscriptionId } from '../../../../../../selectors/rewards';

// Mock navigation
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = effect();
        return cleanup;
      });
    },
  };
});

// Mock redux
const mockDispatch = createMockDispatch();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
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

// Mock RewardsLegalDisclaimer
const mockRewardsLegalDisclaimer = jest.fn();
jest.mock('../RewardsLegalDisclaimer', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const { View, Text: RNText, Pressable } = RN;
  // Import the mocked react-native to use mocked Linking
  const MockedRN = jest.requireMock('react-native');
  const {
    REWARDS_ONBOARD_TERMS_URL,
    REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
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
              MockedRN.Linking.openURL(REWARDS_ONBOARD_TERMS_URL);
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
              MockedRN.Linking.openURL(
                REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
              );
            },
          },
          ReactActual.createElement(RNText, {}, disclaimerPart4),
        ),
      );
    },
  };
});

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
    BoxAlignItems: {
      Center: 'Center',
    },
    BoxFlexDirection: {
      Row: 'Row',
    },
  };
});

// Mock React Native components
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
    useWindowDimensions: () => ({
      width: 375,
      height: 812,
    }),
  };
});

// Mock hooks
const mockOptin = jest.fn();
const mockUseOptin = {
  optin: mockOptin,
  optinError: null as string | null,
  optinLoading: false,
};

jest.mock('../../../hooks/useOptIn', () => ({
  useOptin: () => mockUseOptin,
}));

// Mock OnboardingStepComponent
jest.mock('../OnboardingStep', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      renderStepInfo,
      renderStepImage,
      nextButtonAlternative,
      onNext,
      onNextDisabled,
      onNextLoading,
      onNextLoadingText,
      nextButtonText,
      ...props
    }: {
      renderStepInfo: () => React.ReactElement;
      renderStepImage?: () => React.ReactElement;
      nextButtonAlternative?: () => React.ReactElement;
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
        nextButtonAlternative?.(),
        ReactActual.createElement(
          View,
          {
            testID: 'next-button',
            onPress: onNext,
            disabled: onNextDisabled || onNextLoading,
          },
          nextButtonText || 'Next',
        ),
        onNextLoadingText &&
          ReactActual.createElement(
            View,
            {
              testID: 'loading-text',
            },
            onNextLoadingText,
          ),
      ),
  };
});

describe('OnboardingNoActiveSeasonStep', () => {
  const mockCanContinue = jest.fn(() => true);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOptin.optinError = null;
    mockUseOptin.optinLoading = false;
    mockCanContinue.mockReturnValue(true);
    mockRewardsLegalDisclaimer.mockClear();

    // Set up default useSelector mock
    const mockUseSelector = jest.requireMock('react-redux')
      .useSelector as jest.Mock;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return null;
      }
      return undefined;
    });
  });

  describe('rendering', () => {
    it('renders step content with title and description', () => {
      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(
        screen.getByText('mocked_rewards.onboarding.no_active_season.title'),
      ).toBeDefined();
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.no_active_season.description',
        ),
      ).toBeDefined();
    });

    it('renders step image', () => {
      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(screen.getByTestId('step-1-image')).toBeDefined();
    });

    it('renders navigation container', () => {
      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });
  });

  describe('error states', () => {
    it('displays error banner when optin fails', () => {
      mockUseOptin.optinError = 'Network error';

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(screen.getByTestId('rewards-error-banner')).toBeDefined();
    });

    it('hides error banner when no optin error exists', () => {
      mockUseOptin.optinError = null;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(screen.queryByTestId('rewards-error-banner')).toBeNull();
    });
  });

  describe('loading states', () => {
    it('displays loading text when optin is in progress', () => {
      mockUseOptin.optinLoading = true;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const loadingElement = screen.getByTestId('loading-text');
      expect(loadingElement).toBeDefined();
      expect(loadingElement.props.children).toBe(
        'mocked_rewards.onboarding.no_active_season.sign_up_loading',
      );
    });

    it('hides loading text when optin is not in progress', () => {
      mockUseOptin.optinLoading = false;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(
        screen.queryByText(
          'mocked_rewards.onboarding.no_active_season.sign_up_loading',
        ),
      ).toBeNull();
    });

    it('displays geo loading text when geoLoading is true and optin is not loading', () => {
      mockUseOptin.optinLoading = false;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep
          canContinue={mockCanContinue}
          geoLoading
        />,
      );

      const loadingElement = screen.getByTestId('loading-text');
      expect(loadingElement).toBeDefined();
      expect(loadingElement.props.children).toBe(
        'mocked_rewards.onboarding.intro_confirm_geo_loading',
      );
    });

    it('prioritizes optin loading text when both optinLoading and geoLoading are true', () => {
      mockUseOptin.optinLoading = true;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep
          canContinue={mockCanContinue}
          geoLoading
        />,
      );

      const loadingElement = screen.getByTestId('loading-text');
      expect(loadingElement).toBeDefined();
      expect(loadingElement.props.children).toBe(
        'mocked_rewards.onboarding.no_active_season.sign_up_loading',
      );
    });

    it('hides loading text when neither optinLoading nor geoLoading are true', () => {
      mockUseOptin.optinLoading = false;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(screen.queryByTestId('loading-text')).toBeNull();
    });
  });

  describe('button states', () => {
    it('disables next button when subscriptionId exists', () => {
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return 'sub-123';
        }
        return undefined;
      });

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton.props.disabled).toBe(true);
    });

    it('enables next button when subscriptionId does not exist', () => {
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return null;
        }
        return undefined;
      });

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton.props.disabled).toBe(false);
    });

    it('disables next button when optin is loading', () => {
      mockUseOptin.optinLoading = true;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton.props.disabled).toBe(true);
    });

    it('disables next button when geoLoading is true', () => {
      mockUseOptin.optinLoading = false;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep
          canContinue={mockCanContinue}
          geoLoading
        />,
      );

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton.props.disabled).toBe(true);
    });

    it('disables next button when both optinLoading and geoLoading are true', () => {
      mockUseOptin.optinLoading = true;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep
          canContinue={mockCanContinue}
          geoLoading
        />,
      );

      const nextButton = screen.getByTestId('next-button');
      expect(nextButton.props.disabled).toBe(true);
    });
  });

  describe('legal disclaimer', () => {
    it('renders RewardsLegalDisclaimer with correct props', () => {
      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(mockRewardsLegalDisclaimer).toHaveBeenCalledWith({
        disclaimerPart1:
          'mocked_rewards.onboarding.no_active_season.legal_disclaimer_1',
        disclaimerPart2:
          'mocked_rewards.onboarding.no_active_season.legal_disclaimer_2',
        disclaimerPart3:
          'mocked_rewards.onboarding.no_active_season.legal_disclaimer_3',
        disclaimerPart4:
          'mocked_rewards.onboarding.no_active_season.legal_disclaimer_4',
      });
    });

    it('renders legal disclaimer text', () => {
      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(screen.getByTestId('rewards-legal-disclaimer')).toBeDefined();
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.no_active_season.legal_disclaimer_1',
        ),
      ).toBeDefined();
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.no_active_season.legal_disclaimer_2',
        ),
      ).toBeDefined();
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.no_active_season.legal_disclaimer_3',
        ),
      ).toBeDefined();
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.no_active_season.legal_disclaimer_4',
        ),
      ).toBeDefined();
    });

    it('opens terms of use URL when link is pressed', () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL');

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const termsLink = screen.getByTestId('terms-link');
      fireEvent.press(termsLink);

      expect(mockOpenURL).toHaveBeenCalledWith(REWARDS_ONBOARD_TERMS_URL);
    });

    it('opens learn more URL when link is pressed', () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL');

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const learnMoreLink = screen.getByTestId('learn-more-link');
      fireEvent.press(learnMoreLink);

      expect(mockOpenURL).toHaveBeenCalledWith(
        REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
      );
    });
  });

  describe('next button interaction', () => {
    it('calls optin with empty object when next button is pressed and canContinue returns true', () => {
      mockCanContinue.mockReturnValue(true);

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const nextButton = screen.getByTestId('next-button');
      fireEvent.press(nextButton);

      expect(mockCanContinue).toHaveBeenCalled();
      expect(mockOptin).toHaveBeenCalledWith({});
    });

    it('does not call optin when canContinue returns false', () => {
      mockCanContinue.mockReturnValue(false);

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const nextButton = screen.getByTestId('next-button');
      fireEvent.press(nextButton);

      expect(mockCanContinue).toHaveBeenCalled();
      expect(mockOptin).not.toHaveBeenCalled();
    });
  });

  describe('auto-redirect to dashboard', () => {
    it('navigates to dashboard when subscriptionId exists on focus', () => {
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return 'sub-123';
        }
        return undefined;
      });

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    });

    it('does not navigate when subscriptionId does not exist', () => {
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return null;
        }
        return undefined;
      });

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    });
  });

  describe('component props', () => {
    it('passes correct props to OnboardingStepComponent', () => {
      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const container = screen.getByTestId('onboarding-step-container');
      expect(container).toBeDefined();
      expect(container.props.disableSwipe).toBe(true);
      expect(container.props.showProgressIndicator).toBe(false);
    });

    it('renders step image through renderStepImage prop', () => {
      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(screen.getByTestId('step-1-image')).toBeDefined();
    });

    it('renders legal disclaimer through nextButtonAlternative prop', () => {
      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(screen.getByTestId('rewards-legal-disclaimer')).toBeDefined();
      expect(mockRewardsLegalDisclaimer).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles canContinue callback being called multiple times', () => {
      mockCanContinue.mockReturnValue(true);

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const nextButton = screen.getByTestId('next-button');
      fireEvent.press(nextButton);
      fireEvent.press(nextButton);

      expect(mockCanContinue).toHaveBeenCalledTimes(2);
    });

    it('handles optin error state with loading state', () => {
      mockUseOptin.optinError = 'Error occurred';
      mockUseOptin.optinLoading = true;

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      expect(screen.getByTestId('rewards-error-banner')).toBeDefined();
      const loadingElement = screen.getByTestId('loading-text');
      expect(loadingElement).toBeDefined();
      expect(loadingElement.props.children).toBe(
        'mocked_rewards.onboarding.no_active_season.sign_up_loading',
      );
    });

    it('handles subscriptionId state correctly', () => {
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return 'existing-subscription';
        }
        return undefined;
      });

      renderWithProviders(
        <OnboardingNoActiveSeasonStep canContinue={mockCanContinue} />,
      );

      const nextButton = screen.getByTestId('next-button');
      // Button should be disabled when subscriptionId exists
      expect(nextButton.props.disabled).toBe(true);
    });
  });
});

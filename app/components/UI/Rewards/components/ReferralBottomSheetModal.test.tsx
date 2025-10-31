import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReferralBottomSheetModal from './ReferralBottomSheetModal';
import Routes from '../../../../constants/navigation/Routes';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock Redux
const mockSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockSelector(selector),
}));

// Mock useReferralDetails hook
const mockFetchReferralDetails = jest.fn();
jest.mock('../hooks/useReferralDetails', () => ({
  useReferralDetails: () => ({
    fetchReferralDetails: mockFetchReferralDetails,
  }),
}));

// Mock Routes
jest.mock('../../../../constants/navigation/Routes', () => ({
  SETTINGS_VIEW: 'SettingsView',
}));

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn(() => ({})),
  })),
}));

// Mock BottomSheet
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (props: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback: () => void) => {
            callback();
          },
        }));

        return ReactActual.createElement(
          View,
          { testID: 'bottom-sheet' },
          props.children,
        );
      },
    );
  },
);

interface ComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface ButtonIconProps extends ComponentProps {
  onPress?: () => void;
  iconName?: string;
  iconProps?: Record<string, unknown>;
}

interface ButtonProps extends ComponentProps {
  onPress?: () => void;
  variant?: string;
  size?: string;
  isFullWidth?: boolean;
}

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNText,
    View,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Text: ({ children, ...props }: ComponentProps) =>
      ReactActual.createElement(RNText, props, children),
    Box: ({ children, ...props }: ComponentProps) =>
      ReactActual.createElement(View, props, children),
    ButtonIcon: ({ onPress, iconName, iconProps, ...props }: ButtonIconProps) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID: 'button-icon',
          ...props,
        },
        ReactActual.createElement(
          View,
          {
            testID: `button-icon-${iconName}`,
            ...iconProps,
          },
          ReactActual.createElement(RNText, {}, 'ButtonIcon'),
        ),
      ),
    Button: ({ children, onPress, variant, size, ...props }: ButtonProps) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID: 'primary-button',
          'data-variant': variant,
          'data-size': size,
          ...props,
        },
        ReactActual.createElement(RNText, {}, children),
      ),
    TextVariant: {
      HeadingLg: 'HeadingLg',
      BodySm: 'BodySm',
      BodyMd: 'BodyMd',
    },
    BoxAlignItems: {
      Center: 'center',
      Start: 'start',
    },
    BoxJustifyContent: {
      Center: 'center',
      End: 'end',
    },
    BoxFlexDirection: {
      Column: 'column',
      Row: 'row',
    },
    IconName: {
      Close: 'Close',
    },
    IconColor: {
      IconDefault: 'icon-default',
    },
    ButtonVariant: {
      Primary: 'primary',
      Secondary: 'secondary',
    },
    ButtonSize: {
      Lg: 'lg',
      Md: 'md',
      Sm: 'sm',
    },
  };
});

// Mock RewardsErrorBanner component
jest.mock('./RewardsErrorBanner', () => {
  const mockReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockRewardsErrorBanner(props: {
    title?: string;
    description?: string;
    onConfirm?: () => void;
    confirmButtonLabel?: string;
  }) {
    return mockReact.createElement(
      View,
      {
        testID: 'rewards-error-banner',
        'data-title': props.title,
        'data-description': props.description,
      },
      [
        mockReact.createElement(
          Text,
          { key: 'title', testID: 'error-banner-title' },
          props.title,
        ),
        mockReact.createElement(
          Text,
          { key: 'description', testID: 'error-banner-description' },
          props.description,
        ),
      ],
    );
  };
});

// Mock ReferralStatsSection component
jest.mock('./ReferralDetails/ReferralStatsSection', () => {
  const mockReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockReferralStatsSection(props: {
    earnedPointsFromReferees?: number;
    refereeCount?: number;
    earnedPointsFromRefereesLoading?: boolean;
    refereeCountLoading?: boolean;
    refereeCountError?: boolean;
  }) {
    return mockReact.createElement(
      View,
      {
        testID: 'referral-stats-section',
        'data-earned-points': props.earnedPointsFromReferees,
        'data-referee-count': props.refereeCount,
        'data-earned-points-loading': props.earnedPointsFromRefereesLoading,
        'data-referee-count-loading': props.refereeCountLoading,
        'data-referee-count-error': props.refereeCountError,
      },
      mockReact.createElement(Text, {}, 'ReferralStatsSection'),
    );
  };
});

// Mock SVG image
jest.mock('../../../../images/rewards/metamask-rewards-points.svg', () => {
  const mockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockMetamaskRewardsPointsImage(props: ComponentProps) {
    return mockReact.createElement(
      View,
      {
        testID: 'metamask-rewards-points-image',
        ...props,
      },
      null,
    );
  };
});

// Mock i18n strings
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.ways_to_earn.referrals.sheet.title': 'Refer friends',
      'rewards.ways_to_earn.referrals.sheet.points': '+500 Points',
      'rewards.ways_to_earn.referrals.sheet.cta_label': 'Refer a friend',
      'rewards.referral.info.description':
        'Invite friends to earn rewards together.',
      'rewards.season_status_error.error_fetching_title': 'Season Status Error',
      'rewards.season_status_error.error_fetching_description':
        'Failed to load season status',
      'rewards.referral_details_error.error_fetching_title':
        'Referral Details Error',
      'rewards.referral_details_error.error_fetching_description':
        'Failed to load referral details',
      'rewards.referral_details_error.retry_button': 'Retry',
    };
    return translations[key] || key;
  }),
}));

describe('ReferralBottomSheetModal', () => {
  const defaultSelectorValues = {
    referralCode: 'TEST123',
    refereeCount: 5,
    balanceRefereePortion: 100,
    seasonStatusLoading: false,
    seasonStatusError: null,
    seasonStartDate: '2024-01-01',
    referralDetailsLoading: false,
    referralDetailsError: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default selector return values
    mockSelector.mockImplementation((selector) => {
      const selectorMap = new Map([
        ['selectReferralCode', defaultSelectorValues.referralCode],
        ['selectReferralCount', defaultSelectorValues.refereeCount],
        [
          'selectBalanceRefereePortion',
          defaultSelectorValues.balanceRefereePortion,
        ],
        [
          'selectSeasonStatusLoading',
          defaultSelectorValues.seasonStatusLoading,
        ],
        ['selectSeasonStatusError', defaultSelectorValues.seasonStatusError],
        ['selectSeasonStartDate', defaultSelectorValues.seasonStartDate],
        [
          'selectReferralDetailsLoading',
          defaultSelectorValues.referralDetailsLoading,
        ],
        [
          'selectReferralDetailsError',
          defaultSelectorValues.referralDetailsError,
        ],
      ] as [string, string | number | boolean | null][]);
      // Return the value based on selector function name
      const key = selector.name || selector.toString();
      return selectorMap.get(key) ?? null;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      // Act & Assert
      expect(() => render(<ReferralBottomSheetModal />)).not.toThrow();
    });

    it('should render BottomSheet component', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('should render close button', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByTestId('button-icon')).toBeOnTheScreen();
      expect(getByTestId('button-icon-Close')).toBeOnTheScreen();
    });

    it('should render title text', () => {
      // Act
      const { getByText } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByText('Refer friends')).toBeOnTheScreen();
    });

    it('should render points badge text', () => {
      // Act
      const { getByText } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByText('+500 Points')).toBeOnTheScreen();
    });

    it('should render MetaMask rewards points image', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByTestId('metamask-rewards-points-image')).toBeOnTheScreen();
    });

    it('should render description text', () => {
      // Act
      const { getByText } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(
        getByText('Invite friends to earn rewards together.'),
      ).toBeOnTheScreen();
    });

    it('should render ReferralStatsSection when no errors', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByTestId('referral-stats-section')).toBeOnTheScreen();
    });

    it('should render primary CTA button', () => {
      // Act
      const { getByTestId, getByText } = render(<ReferralBottomSheetModal />);

      // Assert
      expect(getByTestId('primary-button')).toBeOnTheScreen();
      expect(getByText('Refer a friend')).toBeOnTheScreen();
    });
  });

  describe('close button interaction', () => {
    it('should call navigation.goBack when close button is pressed', () => {
      // Arrange
      const { getByTestId } = render(<ReferralBottomSheetModal />);
      const closeButton = getByTestId('button-icon');

      // Act
      fireEvent.press(closeButton);

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('should call navigation.goBack only once per press', () => {
      // Arrange
      const { getByTestId } = render(<ReferralBottomSheetModal />);
      const closeButton = getByTestId('button-icon');

      // Act
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(2);
    });
  });

  describe('primary CTA button interaction', () => {
    it('should navigate to settings when CTA button is pressed', () => {
      // Arrange
      const { getByTestId } = render(<ReferralBottomSheetModal />);
      const ctaButton = getByTestId('primary-button');

      // Act
      fireEvent.press(ctaButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REFERRAL_REWARDS_VIEW);
    });

    it('should call navigation.navigate only once per press', () => {
      // Arrange
      const { getByTestId } = render(<ReferralBottomSheetModal />);
      const ctaButton = getByTestId('primary-button');

      // Act
      fireEvent.press(ctaButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should not render error banner when no errors exist', () => {
      // Act
      const { queryByTestId, getByTestId } = render(
        <ReferralBottomSheetModal />,
      );

      // Assert
      expect(queryByTestId('rewards-error-banner')).not.toBeOnTheScreen();
      expect(getByTestId('referral-stats-section')).toBeOnTheScreen();
    });
  });

  describe('component structure', () => {
    it('should render all main sections in correct order', () => {
      // Act
      const { getByTestId, getByText } = render(<ReferralBottomSheetModal />);

      // Assert - Verify all sections exist
      expect(getByTestId('button-icon')).toBeOnTheScreen();
      expect(getByText('Refer friends')).toBeOnTheScreen();
      expect(getByText('+500 Points')).toBeOnTheScreen();
      expect(
        getByText('Invite friends to earn rewards together.'),
      ).toBeOnTheScreen();
      expect(getByTestId('referral-stats-section')).toBeOnTheScreen();
      expect(getByTestId('primary-button')).toBeOnTheScreen();
    });

    it('should use Box components for layout', () => {
      // Act & Assert
      expect(() => render(<ReferralBottomSheetModal />)).not.toThrow();
    });
  });

  describe('ReferralStatsSection integration', () => {
    it('passes correct props to ReferralStatsSection', () => {
      // Arrange & Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);
      const statsSection = getByTestId('referral-stats-section');

      // Assert
      expect(statsSection.props['data-earned-points']).toBe(
        defaultSelectorValues.balanceRefereePortion,
      );
      expect(statsSection.props['data-referee-count']).toBe(
        defaultSelectorValues.refereeCount,
      );
      expect(statsSection.props['data-earned-points-loading']).toBe(
        defaultSelectorValues.referralDetailsLoading,
      );
      expect(statsSection.props['data-referee-count-loading']).toBe(
        defaultSelectorValues.referralDetailsLoading,
      );
      expect(statsSection.props['data-referee-count-error']).toBe(
        defaultSelectorValues.referralDetailsError,
      );
    });
  });

  describe('localization', () => {
    it('should use correct translation keys for title', () => {
      // Arrange
      const { strings } = jest.requireMock('../../../../../locales/i18n');

      // Act
      render(<ReferralBottomSheetModal />);

      // Assert
      expect(strings).toHaveBeenCalledWith(
        'rewards.ways_to_earn.referrals.sheet.title',
      );
    });

    it('should use correct translation keys for points', () => {
      // Arrange
      const { strings } = jest.requireMock('../../../../../locales/i18n');

      // Act
      render(<ReferralBottomSheetModal />);

      // Assert
      expect(strings).toHaveBeenCalledWith(
        'rewards.ways_to_earn.referrals.sheet.points',
      );
    });

    it('should use correct translation keys for description', () => {
      // Arrange
      const { strings } = jest.requireMock('../../../../../locales/i18n');

      // Act
      render(<ReferralBottomSheetModal />);

      // Assert
      expect(strings).toHaveBeenCalledWith('rewards.referral.info.description');
    });

    it('should use correct translation keys for CTA button', () => {
      // Arrange
      const { strings } = jest.requireMock('../../../../../locales/i18n');

      // Act
      render(<ReferralBottomSheetModal />);

      // Assert
      expect(strings).toHaveBeenCalledWith(
        'rewards.ways_to_earn.referrals.sheet.cta_label',
      );
    });
  });

  describe('accessibility', () => {
    it('should render all interactive elements', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert - Both buttons should be accessible
      const closeButton = getByTestId('button-icon');
      const ctaButton = getByTestId('primary-button');
      expect(closeButton).toBeOnTheScreen();
      expect(ctaButton).toBeOnTheScreen();
    });

    it('should have proper icon configuration for close button', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);

      // Assert - Verify icon name is correct
      expect(getByTestId('button-icon-Close')).toBeOnTheScreen();
    });

    it('should have proper variant for primary button', () => {
      // Act
      const { getByTestId } = render(<ReferralBottomSheetModal />);
      const ctaButton = getByTestId('primary-button');

      // Assert - Verify button variant is primary
      expect(ctaButton.props['data-variant']).toBe('primary');
    });
  });
});

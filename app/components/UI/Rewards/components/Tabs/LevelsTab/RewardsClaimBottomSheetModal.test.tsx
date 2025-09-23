import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
// Mock dependencies
import RewardsClaimBottomSheetModal from './RewardsClaimBottomSheetModal';
import { SeasonRewardType } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { IconName } from '@metamask/design-system-react-native';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';

// Mock useClaimReward hook
const mockClaimReward = jest.fn();
const mockClearClaimRewardError = jest.fn();

// Create a mutable mock state
const mockUseClaimRewardState: {
  claimReward: jest.Mock;
  isClaimingReward: boolean;
  claimRewardError: string | undefined;
  clearClaimRewardError: jest.Mock;
} = {
  claimReward: mockClaimReward,
  isClaimingReward: false,
  claimRewardError: undefined,
  clearClaimRewardError: mockClearClaimRewardError,
};

jest.mock('../../../hooks/useClaimReward', () => ({
  __esModule: true,
  default: () => mockUseClaimRewardState,
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock Linking
jest.mock('react-native', () => {
  const reactNative = jest.requireActual('react-native');
  return {
    ...reactNative,
    Linking: {
      ...reactNative.Linking,
      openURL: jest.fn(),
    },
  };
});

// Mock strings
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.upcoming_rewards.cta_label': 'Got it',
      'rewards.unlocked_rewards.cta_label': 'Claim Reward',
      'rewards.unlocked_rewards.cta_request_invite': 'Request Invite',
    };
    return translations[key] || key;
  }),
}));

// Mock BottomSheet component
jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const React = jest.requireActual('react');
    return React.forwardRef(({ children }: { children: React.ReactNode }) =>
      React.createElement('View', { testID: 'bottom-sheet' }, children),
    );
  },
);

// Mock TextField component
jest.mock(
  '../../../../../../component-library/components/Form/TextField',
  () => {
    const React = jest.requireActual('react');
    const TextFieldComponent = ({
      placeholder,
      onChangeText,
      value,
    }: {
      placeholder: string;
      onChangeText: (text: string) => void;
      value: string;
    }) =>
      React.createElement('TextInput', {
        testID: 'text-field',
        placeholder,
        onChangeText,
        value,
      });

    TextFieldComponent.Size = {
      Lg: 'lg',
    };

    return {
      __esModule: true,
      default: TextFieldComponent,
      TextFieldSize: {
        Lg: 'lg',
      },
    };
  },
);

// Mock BannerAlert component
jest.mock(
  '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert',
  () => {
    const React = jest.requireActual('react');
    return ({
      severity,
      description,
      style,
      testID,
    }: {
      severity: string;
      description: string;
      style: unknown;
      testID: string;
    }) => {
      const { View, Text } = jest.requireActual('react-native');
      return React.createElement(
        View,
        {
          testID,
          'data-severity': severity,
          style,
        },
        React.createElement(Text, {}, description),
      );
    };
  },
);

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const {
    View,
    Text: RNText,
    TouchableOpacity,
  } = jest.requireActual('react-native');
  return {
    ButtonVariant: {
      Primary: 'primary',
      Secondary: 'secondary',
    },
    ButtonSize: {
      Lg: 'lg',
    },
    BoxFlexDirection: {
      Column: 'column',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Center: 'center',
    },
    TextVariant: {
      HeadingLg: 'headingLg',
      BodyMd: 'bodyMd',
      BodySm: 'bodySm',
    },
    IconName: {
      Lock: 'lock',
      Export: 'export',
    },
    IconSize: {
      Lg: 'lg',
      Sm: 'sm',
    },
    Box: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, props, children),
    Button: ({
      children,
      onPress,
      disabled,
      testID,
    }: {
      children: React.ReactNode;
      onPress: () => void;
      disabled: boolean;
      testID: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        {
          testID,
          onPress,
          disabled,
          accessibilityState: disabled ? { disabled: true } : undefined,
        },
        React.createElement(RNText, {}, children),
      ),
    Text: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(RNText, props, children),
    Icon: ({ name, ...props }: { name: string }) =>
      React.createElement(View, {
        testID: `icon-${name}`,
        ...props,
      }),
  };
});

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn().mockImplementation((...args) => ({ ...args })),
  }),
}));

interface TestRouteParams {
  title: string;
  description: string;
  rewardId: string;
  rewardType: SeasonRewardType;
  isLocked: boolean;
  hasClaimed: boolean;
  icon: IconName;
  claimUrl?: string;
  showInput?: boolean;
  inputPlaceholder?: string;
}

const defaultRoute: { params: TestRouteParams } = {
  params: {
    title: 'Test Reward',
    description: 'Test Description',
    rewardId: 'reward-123',
    rewardType: SeasonRewardType.GENERIC,
    isLocked: false,
    hasClaimed: false,
    icon: IconName.Lock,
    showInput: false,
  },
};

// Routes for different reward types
const routeWithGenericReward = {
  ...defaultRoute,
  params: {
    ...defaultRoute.params,
    rewardType: SeasonRewardType.GENERIC,
  },
};

const routeWithPerpsDiscountReward = {
  ...defaultRoute,
  params: {
    ...defaultRoute.params,
    rewardType: SeasonRewardType.PERPS_DISCOUNT,
    claimUrl: 'https://example.com',
  },
};

const routeWithPointsBoostReward = {
  ...defaultRoute,
  params: {
    ...defaultRoute.params,
    rewardType: SeasonRewardType.POINTS_BOOST,
  },
};

const routeWithAlphaFoxInviteReward = {
  ...defaultRoute,
  params: {
    ...defaultRoute.params,
    rewardType: SeasonRewardType.ALPHA_FOX_INVITE,
    showInput: true,
    inputPlaceholder: 'Enter your Telegram handle',
  },
};

const routeWithClaimedReward = {
  ...defaultRoute,
  params: {
    ...defaultRoute.params,
    hasClaimed: true,
  },
};

describe('RewardsClaimBottomSheetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseClaimRewardState.isClaimingReward = false;
    mockUseClaimRewardState.claimRewardError = undefined;
  });

  it('should render correctly with minimal required props', () => {
    expect(() =>
      render(<RewardsClaimBottomSheetModal route={defaultRoute} />),
    ).not.toThrow();
  });

  it('should render the bottom sheet', () => {
    const { getByTestId } = render(
      <RewardsClaimBottomSheetModal route={defaultRoute} />,
    );

    expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
  });

  it('should render the reward icon', () => {
    const { getByTestId } = render(
      <RewardsClaimBottomSheetModal route={defaultRoute} />,
    );

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TIER_REWARD_ICON),
    ).toBeOnTheScreen();
  });

  it('should render the correct title and description', () => {
    const { getByText } = render(
      <RewardsClaimBottomSheetModal route={defaultRoute} />,
    );

    expect(getByText('Test Reward')).toBeOnTheScreen();
    expect(getByText('Test Description')).toBeOnTheScreen();
  });

  describe('Locked rewards', () => {
    it('should show "Got it" button for locked rewards', () => {
      const lockedRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          isLocked: true,
        },
      };

      const { getByText } = render(
        <RewardsClaimBottomSheetModal route={lockedRoute} />,
      );

      expect(getByText('Got it')).toBeOnTheScreen();
    });

    it('should call navigation.goBack when "Got it" is pressed for locked rewards', () => {
      const lockedRoute = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          isLocked: true,
        },
      };

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={lockedRoute} />,
      );

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Unlocked rewards', () => {
    it('should render the claim button when the reward is not locked and not claimed', () => {
      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={defaultRoute} />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON),
      ).toBeOnTheScreen();
    });

    it('should handle generic reward type correctly', () => {
      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={routeWithGenericReward} />,
      );

      const claimButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      expect(claimButton).toBeOnTheScreen();

      fireEvent.press(claimButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should handle perps discount reward type correctly', () => {
      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={routeWithPerpsDiscountReward} />,
      );

      const claimButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      expect(claimButton).toBeOnTheScreen();

      fireEvent.press(claimButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should handle points boost reward type correctly', () => {
      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={routeWithPointsBoostReward} />,
      );

      const claimButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      expect(claimButton).toBeOnTheScreen();

      fireEvent.press(claimButton);

      expect(mockClaimReward).toHaveBeenCalledWith('reward-123', {});
    });

    it('should handle alpha fox invite reward type correctly', () => {
      const { getByTestId, getByPlaceholderText } = render(
        <RewardsClaimBottomSheetModal route={routeWithAlphaFoxInviteReward} />,
      );

      const inputField = getByPlaceholderText('Enter your Telegram handle');
      fireEvent.changeText(inputField, '@user123');

      const claimButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      expect(claimButton).toBeOnTheScreen();

      fireEvent.press(claimButton);

      expect(mockClaimReward).toHaveBeenCalledWith('reward-123', {
        data: { telegramHandle: '@user123' },
      });
    });
  });

  describe('Loading and error states', () => {
    it('should disable the button when claiming reward', () => {
      mockUseClaimRewardState.isClaimingReward = true;

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={routeWithPointsBoostReward} />,
      );

      const claimButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      expect(claimButton).toBeDisabled();

      mockUseClaimRewardState.isClaimingReward = false;
    });

    it('should show error message when claim fails', () => {
      mockUseClaimRewardState.claimRewardError = 'Claim failed';

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={routeWithPointsBoostReward} />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_ERROR_MESSAGE),
      ).toBeOnTheScreen();

      mockUseClaimRewardState.claimRewardError = undefined;
    });

    it('should keep modal open when claim fails', async () => {
      mockClaimReward.mockRejectedValue('Claim failed');

      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={routeWithPointsBoostReward} />,
      );

      const claimButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      fireEvent.press(claimButton);

      await waitFor(() => {
        expect(mockGoBack).not.toHaveBeenCalled();
      });

      mockClaimReward.mockReset();
    });
  });

  describe('Claimed rewards', () => {
    it('should show view button for claimed rewards', () => {
      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal route={routeWithClaimedReward} />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('Default reward type', () => {
    it('should show claim button for unknown reward types', () => {
      const { getByTestId } = render(
        <RewardsClaimBottomSheetModal
          route={{
            ...defaultRoute,
            params: {
              ...defaultRoute.params,
              rewardType: 'unknown' as SeasonRewardType,
            },
          }}
        />,
      );

      const button = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      expect(button).toBeTruthy();
    });
  });

  describe('Route params passing', () => {
    it('should pass title, description and icon from route params', () => {
      const routeWithExtraParams = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          title: 'Custom Title',
          description: 'Custom Description',
          icon: IconName.Lock,
          showInput: false,
        },
      };

      const { getByText } = render(
        <RewardsClaimBottomSheetModal route={routeWithExtraParams} />,
      );

      expect(getByText('Custom Title')).toBeOnTheScreen();
      expect(getByText('Custom Description')).toBeOnTheScreen();
    });

    it('should override confirmAction and error in route params', () => {
      const routeWithConflictingParams = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          confirmAction: {
            label: 'Original Action',
            onPress: jest.fn(),
          },
          error: 'Original Error',
        },
      };

      // The component should override these with its own values
      expect(() =>
        render(
          <RewardsClaimBottomSheetModal route={routeWithConflictingParams} />,
        ),
      ).not.toThrow();
    });
  });
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PreviousSeasonUnlockedRewards from './PreviousSeasonUnlockedRewards';
import {
  RewardDto,
  SeasonRewardDto,
  SeasonRewardType,
  RewardClaimStatus,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  selectUnlockedRewards,
  selectSeasonTiers,
  selectUnlockedRewardLoading,
  selectUnlockedRewardError,
  selectCurrentTier,
} from '../../../../../reducers/rewards/selectors';
import { useUnlockedRewards } from '../../hooks/useUnlockedRewards';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock selectors
jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectUnlockedRewards: jest.fn(),
  selectSeasonTiers: jest.fn(),
  selectSeasonShouldInstallNewVersion: jest.fn(),
  selectUnlockedRewardLoading: jest.fn(),
  selectUnlockedRewardError: jest.fn(),
  selectCurrentTier: jest.fn(),
}));

// Mock useUnlockedRewards hook
jest.mock('../../hooks/useUnlockedRewards', () => ({
  useUnlockedRewards: jest.fn(),
}));

const mockUseUnlockedRewards = useUnlockedRewards as jest.MockedFunction<
  typeof useUnlockedRewards
>;

// Mock useTheme
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    themeAppearance: 'light',
    colors: {
      background: {
        default: '#FFFFFF',
      },
      text: {
        muted: '#999999',
      },
    },
  }),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.unlocked_rewards.title': 'Unlocked Rewards',
      'rewards.unlocked_rewards_error.error_fetching_title':
        'Error Fetching Rewards',
      'rewards.unlocked_rewards_error.error_fetching_description':
        'Unable to load rewards. Please try again.',
      'rewards.unlocked_rewards_error.retry_button': 'Retry',
      'rewards.previous_season_summary.no_end_of_season_rewards':
        "You didn't earn rewards this season, but there's always next time.",
      'rewards.previous_season_summary.verifying_rewards':
        "We're making sure everything's correct before you claim your rewards.",
      'rewards.end_of_season_rewards.success_description':
        'Redeem claim success description',
      'rewards.end_of_season_rewards.confirm_label_default': 'Redeem',
      'rewards.end_of_season_rewards.arriving_soon': 'Arriving soon',
      'rewards.end_of_season_rewards.check_back_soon':
        'Check back soon to claim',
      'rewards.metal_card_claim.description':
        'Enter your email to claim your metal card.',
      'rewards.metal_card_claim.contact_info':
        'We will contact you with delivery details.',
    };
    return translations[key] || key;
  }),
}));

// Mock Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    Object.assign(mockTw, {
      style: jest.fn((styles) => {
        if (Array.isArray(styles)) {
          return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
        }
        return styles || {};
      }),
    });
    return mockTw;
  },
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  const Box = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactActual.createElement(View, props, children);

  const TextComponent = ({
    children,
    onPress,
    ...props
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) =>
    onPress
      ? ReactActual.createElement(
          TouchableOpacity,
          { onPress, ...props },
          ReactActual.createElement(Text, {}, children),
        )
      : ReactActual.createElement(Text, props, children);

  const Icon = ({ name, ...props }: { name: string; [key: string]: unknown }) =>
    ReactActual.createElement(
      View,
      { testID: `icon-${name}`, ...props },
      ReactActual.createElement(Text, {}, `Icon-${name}`),
    );

  return {
    Box,
    Text: TextComponent,
    Icon,
    BoxFlexDirection: {
      Row: 'row',
      Column: 'column',
    },
    BoxAlignItems: {
      Center: 'center',
      Start: 'start',
    },
    BoxJustifyContent: {
      Center: 'center',
      Between: 'space-between',
    },
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
    },
    IconName: {
      Danger: 'Danger',
      Question: 'Question',
    },
    IconSize: {
      Sm: 'Sm',
      Md: 'Md',
    },
    IconColor: {
      IconAlternative: 'IconAlternative',
      PrimaryAlternative: 'PrimaryAlternative',
    },
  };
});

// Mock Skeleton
jest.mock('../../../../../component-library/components/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    Skeleton: ({
      style,
      ...props
    }: {
      style?: unknown;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(View, {
        testID: 'skeleton',
        style,
        ...props,
      }),
  };
});

// Mock RewardItem
jest.mock('../RewardItem/RewardItem', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      reward,
      seasonReward,
      testID,
      isLocked,
      isEndOfSeasonReward,
      isLast,
      compact,
      onPress,
      endOfSeasonClaimedDescription,
      claimCtaLabel,
    }: {
      reward: RewardDto;
      seasonReward: SeasonRewardDto;
      testID?: string;
      isLocked?: boolean;
      isEndOfSeasonReward?: boolean;
      isLast?: boolean;
      compact?: boolean;
      onPress?: (reward: RewardDto, sr: SeasonRewardDto) => void;
      endOfSeasonClaimedDescription?: string;
      claimCtaLabel?: string;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          testID: testID || `reward-item-${reward.id}`,
          accessibilityLabel: `isLocked:${isLocked},isEndOfSeasonReward:${isEndOfSeasonReward},isLast:${isLast},compact:${compact},endOfSeasonClaimedDescription:${endOfSeasonClaimedDescription},claimCtaLabel:${claimCtaLabel}`,
          onPress: () => onPress?.(reward, seasonReward),
        },
        ReactActual.createElement(Text, {}, seasonReward.name),
      ),
  };
});

// Mock RewardsErrorBanner
jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      description,
      onConfirm,
      confirmButtonLabel,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'rewards-error-banner' },
        ReactActual.createElement(Text, { testID: 'error-title' }, title),
        ReactActual.createElement(
          Text,
          { testID: 'error-description' },
          description,
        ),
        onConfirm &&
          ReactActual.createElement(
            TouchableOpacity,
            {
              onPress: onConfirm,
              testID: 'error-retry-button',
            },
            ReactActual.createElement(
              Text,
              {},
              confirmButtonLabel || 'Confirm',
            ),
          ),
      ),
  };
});

// Mock SVG component
jest.mock(
  '../../../../../images/rewards/rewards-season-ended-no-unlocked-rewards.svg',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const RewardsSeasonEndedNoUnlockedRewardsImage = () =>
      ReactActual.createElement(View, {
        testID: 'rewards-season-ended-no-unlocked-rewards-image',
      });
    return {
      __esModule: true,
      default: RewardsSeasonEndedNoUnlockedRewardsImage,
    };
  },
);

describe('PreviousSeasonUnlockedRewards', () => {
  const mockFetchUnlockedRewards = jest.fn();

  const mockSeasonReward1: SeasonRewardDto = {
    id: 'season-reward-1',
    name: 'End of Season Reward 1',
    shortDescription: 'Short description 1',
    longDescription: 'Long description 1',
    shortUnlockedDescription: 'Short unlocked description 1',
    longUnlockedDescription: 'Long unlocked description 1',
    iconName: 'Star',
    rewardType: SeasonRewardType.GENERIC,
    isEndOfSeasonReward: true,
  };

  const mockSeasonReward2: SeasonRewardDto = {
    id: 'season-reward-2',
    name: 'End of Season Reward 2',
    shortDescription: 'Short description 2',
    longDescription: 'Long description 2',
    shortUnlockedDescription: 'Short unlocked description 2',
    longUnlockedDescription: 'Long unlocked description 2',
    iconName: 'Gift',
    rewardType: SeasonRewardType.GENERIC,
    isEndOfSeasonReward: true,
  };

  const mockRegularSeasonReward: SeasonRewardDto = {
    id: 'season-reward-3',
    name: 'Regular Reward',
    shortDescription: 'Short description 3',
    longDescription: 'Long description 3',
    shortUnlockedDescription: 'Short unlocked description 3',
    longUnlockedDescription: 'Long unlocked description 3',
    iconName: 'Coin',
    rewardType: SeasonRewardType.GENERIC,
    isEndOfSeasonReward: false,
  };

  const mockMetalCardSeasonReward: SeasonRewardDto = {
    id: 'season-reward-metal-card',
    name: 'Metal Card Reward',
    shortDescription: 'Metal card description',
    longDescription: 'Metal card long description',
    shortUnlockedDescription: 'Metal card short unlocked',
    longUnlockedDescription: 'Metal card long unlocked',
    iconName: 'Card',
    rewardType: SeasonRewardType.METAL_CARD,
    isEndOfSeasonReward: true,
  };

  const mockNansenSeasonReward: SeasonRewardDto = {
    id: 'season-reward-nansen',
    name: 'Nansen Reward',
    shortDescription: 'Nansen description',
    longDescription: 'Nansen long description',
    shortUnlockedDescription: 'Nansen short unlocked',
    longUnlockedDescription: 'Nansen long unlocked',
    iconName: 'Chart',
    rewardType: SeasonRewardType.NANSEN,
    isEndOfSeasonReward: true,
  };

  const mockLineaTokensSeasonReward: SeasonRewardDto = {
    id: 'season-reward-linea-tokens',
    name: 'Linea Tokens Reward',
    shortDescription: 'Linea tokens description',
    longDescription: 'Linea tokens long description',
    shortUnlockedDescription: 'Linea tokens short unlocked',
    longUnlockedDescription: 'Linea tokens long unlocked',
    iconName: 'Token',
    rewardType: SeasonRewardType.LINEA_TOKENS,
    isEndOfSeasonReward: true,
  };

  const mockOthersideSeasonReward: SeasonRewardDto = {
    id: 'season-reward-otherside',
    name: 'Otherside Reward',
    shortDescription: 'Otherside description',
    longDescription: 'Otherside long description',
    shortUnlockedDescription: 'Otherside short unlocked',
    longUnlockedDescription: 'Otherside long unlocked',
    iconName: 'World',
    rewardType: SeasonRewardType.OTHERSIDE,
    isEndOfSeasonReward: true,
  };

  const mockUnlockedReward1: RewardDto = {
    id: 'reward-1',
    seasonRewardId: 'season-reward-1',
    claimStatus: RewardClaimStatus.UNCLAIMED,
  };

  const mockUnlockedReward2: RewardDto = {
    id: 'reward-2',
    seasonRewardId: 'season-reward-2',
    claimStatus: RewardClaimStatus.CLAIMED,
  };

  const mockUnlockedReward3: RewardDto = {
    id: 'reward-3',
    seasonRewardId: 'season-reward-3',
    claimStatus: RewardClaimStatus.UNCLAIMED,
  };

  const mockMetalCardUnlockedReward: RewardDto = {
    id: 'reward-metal-card',
    seasonRewardId: 'season-reward-metal-card',
    claimStatus: RewardClaimStatus.UNCLAIMED,
  };

  const mockNansenUnlockedRewardWithUrl: RewardDto = {
    id: 'reward-nansen-with-url',
    seasonRewardId: 'season-reward-nansen',
    claimStatus: RewardClaimStatus.UNCLAIMED,
    claim: {
      id: 'claim-1',
      rewardId: 'reward-nansen-with-url',
      accountId: 'account-1',
      data: {
        url: 'https://nansen.ai/claim/abc123',
      },
    },
  };

  const mockNansenUnlockedRewardWithoutUrl: RewardDto = {
    id: 'reward-nansen-without-url',
    seasonRewardId: 'season-reward-nansen',
    claimStatus: RewardClaimStatus.UNCLAIMED,
  };

  const mockLineaTokensUnlockedReward: RewardDto = {
    id: 'reward-linea-tokens',
    seasonRewardId: 'season-reward-linea-tokens',
    claimStatus: RewardClaimStatus.UNCLAIMED,
  };

  const mockOthersideUnlockedRewardWithUrl: RewardDto = {
    id: 'reward-otherside-with-url',
    seasonRewardId: 'season-reward-otherside',
    claimStatus: RewardClaimStatus.UNCLAIMED,
    claim: {
      id: 'claim-otherside',
      rewardId: 'reward-otherside-with-url',
      accountId: 'account-1',
      data: {
        url: 'https://otherside.xyz/claim/xyz789',
      },
    },
  };

  const mockOthersideUnlockedRewardWithoutUrl: RewardDto = {
    id: 'reward-otherside-without-url',
    seasonRewardId: 'season-reward-otherside',
    claimStatus: RewardClaimStatus.UNCLAIMED,
  };

  const mockSeasonTiers = [
    {
      id: 'tier-1',
      name: 'Tier 1',
      pointsNeeded: 0,
      image: {
        lightModeUrl: 'https://example.com/light.png',
        darkModeUrl: 'https://example.com/dark.png',
      },
      levelNumber: 'Level 1',
      rewards: [
        mockSeasonReward1,
        mockSeasonReward2,
        mockRegularSeasonReward,
        mockMetalCardSeasonReward,
        mockNansenSeasonReward,
        mockLineaTokensSeasonReward,
        mockOthersideSeasonReward,
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseUnlockedRewards.mockReturnValue({
      fetchUnlockedRewards: mockFetchUnlockedRewards,
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });
  });

  it('renders error banner when there is an error and not loading and endOfSeasonRewards is null', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return null;
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return true;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId, getByText } = render(
      <PreviousSeasonUnlockedRewards />,
    );

    expect(getByTestId('rewards-error-banner')).toBeOnTheScreen();
    expect(getByText('Error Fetching Rewards')).toBeOnTheScreen();
    expect(
      getByText('Unable to load rewards. Please try again.'),
    ).toBeOnTheScreen();
  });

  it('calls fetchUnlockedRewards when retry button is pressed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return null;
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return true;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const retryButton = getByTestId('error-retry-button');
    retryButton.props.onPress();

    expect(mockFetchUnlockedRewards).toHaveBeenCalledTimes(1);
  });

  it('renders loading skeleton when loading', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [];
      if (selector === selectUnlockedRewardLoading) return true;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    expect(getByTestId('skeleton')).toBeOnTheScreen();
  });

  it('renders loading skeleton when endOfSeasonRewards is null', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return null;
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    expect(getByTestId('skeleton')).toBeOnTheScreen();
  });

  it('renders end of season rewards when available', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockUnlockedReward1, mockUnlockedReward2];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonUnlockedRewards />);

    expect(getByText('End of Season Reward 1')).toBeOnTheScreen();
    expect(getByText('End of Season Reward 2')).toBeOnTheScreen();
    expect(getByText('Unlocked Rewards')).toBeOnTheScreen();
  });

  it('filters out non-end-of-season rewards', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockUnlockedReward1, mockUnlockedReward2, mockUnlockedReward3];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByText, queryByText } = render(
      <PreviousSeasonUnlockedRewards />,
    );

    expect(getByText('End of Season Reward 1')).toBeOnTheScreen();
    expect(getByText('End of Season Reward 2')).toBeOnTheScreen();
    expect(queryByText('Regular Reward')).not.toBeOnTheScreen();
  });

  it('shows verifying rewards message when currentTier has pointsNeeded and no end of season rewards', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId, getByText } = render(
      <PreviousSeasonUnlockedRewards />,
    );

    expect(
      getByTestId('rewards-season-ended-no-unlocked-rewards-image'),
    ).toBeOnTheScreen();
    expect(
      getByText(
        "We're making sure everything's correct before you claim your rewards.",
      ),
    ).toBeOnTheScreen();
  });

  it('renders skeleton when unlockedRewards is undefined and currentTier has pointsNeeded', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return undefined;
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    expect(getByTestId('skeleton')).toBeOnTheScreen();
  });

  it('does not show error banner when loading', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return null;
      if (selector === selectUnlockedRewardLoading) return true;
      if (selector === selectUnlockedRewardError) return true;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { queryByTestId, getByTestId } = render(
      <PreviousSeasonUnlockedRewards />,
    );

    expect(queryByTestId('rewards-error-banner')).not.toBeOnTheScreen();
    expect(getByTestId('skeleton')).toBeOnTheScreen();
  });

  it('does not show error banner when endOfSeasonRewards is not null', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return true;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { queryByTestId } = render(<PreviousSeasonUnlockedRewards />);

    expect(queryByTestId('rewards-error-banner')).not.toBeOnTheScreen();
  });

  it('passes isLocked=true for GENERIC end of season rewards without URL', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-1');
    // GENERIC rewards without URL and not requiring manual claim are locked
    expect(rewardItem.props.accessibilityLabel).toContain('isLocked:true');
  });

  it('passes isLocked=false for METAL_CARD end of season rewards', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockMetalCardUnlockedReward];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-metal-card');
    expect(rewardItem.props.accessibilityLabel).toContain('isLocked:false');
  });

  it('passes arriving_soon description for METAL_CARD rewards', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockMetalCardUnlockedReward];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-metal-card');
    expect(rewardItem.props.accessibilityLabel).toContain(
      'endOfSeasonClaimedDescription:Arriving soon',
    );
  });

  it('passes undefined redeem props for non-METAL_CARD rewards', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-1');
    expect(rewardItem.props.accessibilityLabel).toContain(
      'endOfSeasonClaimedDescription:undefined',
    );
    expect(rewardItem.props.accessibilityLabel).toContain(
      'claimCtaLabel:undefined',
    );
  });

  it('passes isEndOfSeasonReward=true to RewardItem', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-1');
    expect(rewardItem.props.accessibilityLabel).toContain(
      'isEndOfSeasonReward:true',
    );
  });

  it('passes compact=true to RewardItem', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-1');
    expect(rewardItem.props.accessibilityLabel).toContain('compact:true');
  });

  it('passes isLast=true to last RewardItem in list', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockUnlockedReward1, mockUnlockedReward2];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const firstRewardItem = getByTestId('reward-item-reward-1');
    const lastRewardItem = getByTestId('reward-item-reward-2');

    expect(firstRewardItem.props.accessibilityLabel).toContain('isLast:false');
    expect(lastRewardItem.props.accessibilityLabel).toContain('isLast:true');
  });

  it('navigates to end of season claim sheet when METAL_CARD reward is pressed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockMetalCardUnlockedReward];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-metal-card');
    rewardItem.props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith('EndOfSeasonClaimBottomSheet', {
      rewardId: mockMetalCardUnlockedReward.id,
      seasonRewardId: 'season-reward-metal-card',
      title: 'Metal Card Reward',
      description: 'Enter your email to claim your metal card.',
      contactInfo: 'We will contact you with delivery details.',
      rewardType: SeasonRewardType.METAL_CARD,
      showEmail: 'required',
      showTelegram: 'optional',
    });
  });

  it('does not pass onPress handler for non-METAL_CARD rewards', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-1');
    rewardItem.props.onPress();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('passes isLocked=true and undefined description for NANSEN reward without URL', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockNansenUnlockedRewardWithoutUrl];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-nansen-without-url');
    // NANSEN without URL is locked since there's no URL to claim and it's not a redeemable reward
    expect(rewardItem.props.accessibilityLabel).toContain('isLocked:true');
    expect(rewardItem.props.accessibilityLabel).toContain(
      'endOfSeasonClaimedDescription:undefined',
    );
  });

  it('passes isLocked=false for NANSEN reward with URL', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockNansenUnlockedRewardWithUrl];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-nansen-with-url');
    expect(rewardItem.props.accessibilityLabel).toContain('isLocked:false');
  });

  it('navigates to end of season claim sheet when NANSEN reward without URL is pressed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockNansenUnlockedRewardWithoutUrl];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-nansen-without-url');
    rewardItem.props.onPress();

    // NANSEN requires manual claim, so it navigates even without URL
    expect(mockNavigate).toHaveBeenCalledWith('EndOfSeasonClaimBottomSheet', {
      rewardId: mockNansenUnlockedRewardWithoutUrl.id,
      seasonRewardId: 'season-reward-nansen',
      title: 'Nansen Reward',
      description: 'Nansen long unlocked',
      url: undefined,
      rewardType: SeasonRewardType.NANSEN,
    });
  });

  it('navigates to end of season claim sheet when NANSEN reward with URL is pressed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockNansenUnlockedRewardWithUrl];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-nansen-with-url');
    rewardItem.props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith('EndOfSeasonClaimBottomSheet', {
      rewardId: mockNansenUnlockedRewardWithUrl.id,
      seasonRewardId: 'season-reward-nansen',
      title: 'Nansen Reward',
      description: 'Nansen long unlocked',
      url: 'https://nansen.ai/claim/abc123',
      rewardType: SeasonRewardType.NANSEN,
    });
  });

  it('navigates to end of season claim sheet when LINEA_TOKENS reward is pressed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockLineaTokensUnlockedReward];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-linea-tokens');
    rewardItem.props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith('EndOfSeasonClaimBottomSheet', {
      rewardId: mockLineaTokensUnlockedReward.id,
      seasonRewardId: 'season-reward-linea-tokens',
      title: 'Linea Tokens Reward',
      rewardType: SeasonRewardType.LINEA_TOKENS,
      showAccount: true,
    });
  });

  it('passes isLocked=false and arriving_soon description for LINEA_TOKENS reward', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockLineaTokensUnlockedReward];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-linea-tokens');
    // LINEA_TOKENS requires manual claim, so isLocked is false
    expect(rewardItem.props.accessibilityLabel).toContain('isLocked:false');
    expect(rewardItem.props.accessibilityLabel).toContain(
      'endOfSeasonClaimedDescription:Arriving soon',
    );
  });

  it('navigates to end of season claim sheet when OTHERSIDE reward with URL is pressed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockOthersideUnlockedRewardWithUrl];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-otherside-with-url');
    rewardItem.props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith('EndOfSeasonClaimBottomSheet', {
      rewardId: mockOthersideUnlockedRewardWithUrl.id,
      seasonRewardId: 'season-reward-otherside',
      title: 'Otherside Reward',
      description: 'Otherside long unlocked',
      url: 'https://otherside.xyz/claim/xyz789',
      rewardType: SeasonRewardType.OTHERSIDE,
    });
  });

  it('passes isLocked=false for OTHERSIDE reward with URL', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockOthersideUnlockedRewardWithUrl];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-otherside-with-url');
    // OTHERSIDE requires manual claim, so isLocked is false
    expect(rewardItem.props.accessibilityLabel).toContain('isLocked:false');
  });

  it('passes isLocked=true for OTHERSIDE reward without URL', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockOthersideUnlockedRewardWithoutUrl];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-otherside-without-url');
    // OTHERSIDE without URL is locked since there's no URL to claim and it's not a redeemable reward
    expect(rewardItem.props.accessibilityLabel).toContain('isLocked:true');
  });

  it('navigates to end of season claim sheet when OTHERSIDE reward without URL is pressed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards)
        return [mockOthersideUnlockedRewardWithoutUrl];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonUnlockedRewards />);

    const rewardItem = getByTestId('reward-item-reward-otherside-without-url');
    rewardItem.props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith('EndOfSeasonClaimBottomSheet', {
      rewardId: mockOthersideUnlockedRewardWithoutUrl.id,
      seasonRewardId: 'season-reward-otherside',
      title: 'Otherside Reward',
      description: 'Otherside long unlocked',
      url: undefined,
      rewardType: SeasonRewardType.OTHERSIDE,
    });
  });

  it('shows no rewards message when currentTier has no pointsNeeded and empty unlocked rewards', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 0 };
      return undefined;
    });

    const { getByTestId, getByText } = render(
      <PreviousSeasonUnlockedRewards />,
    );

    expect(
      getByTestId('rewards-season-ended-no-unlocked-rewards-image'),
    ).toBeOnTheScreen();
    expect(
      getByText(
        "You didn't earn rewards this season, but there's always next time.",
      ),
    ).toBeOnTheScreen();
  });
});

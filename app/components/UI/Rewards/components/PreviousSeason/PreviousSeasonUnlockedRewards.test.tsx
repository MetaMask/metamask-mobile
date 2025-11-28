import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
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
  selectSeasonShouldInstallNewVersion,
  selectUnlockedRewardLoading,
  selectUnlockedRewardError,
  selectCurrentTier,
} from '../../../../../reducers/rewards/selectors';
import { useUnlockedRewards } from '../../hooks/useUnlockedRewards';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  MM_APP_STORE_LINK,
  MM_PLAY_STORE_LINK,
} from '../../../../../constants/urls';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

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

// Mock useMetrics hook
jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    REWARDS_PAGE_BUTTON_CLICKED: 'rewards_page_button_clicked',
  },
}));

const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'rewards.unlocked_rewards.title': 'Unlocked Rewards',
      'rewards.unlocked_rewards_error.error_fetching_title':
        'Error Fetching Rewards',
      'rewards.unlocked_rewards_error.error_fetching_description':
        'Unable to load rewards. Please try again.',
      'rewards.unlocked_rewards_error.retry_button': 'Retry',
      'rewards.previous_season_summary.update_metamask_version':
        'Update MetaMask to version {version}',
      'rewards.previous_season_summary.update_metamask': 'Update MetaMask',
      'rewards.previous_season_summary.no_end_of_season_rewards':
        "You didn't earn rewards this season, but there's always next time.",
      'rewards.previous_season_summary.verifying_rewards':
        "We're making sure everything's correct before you claim your rewards.",
    };
    let result = translations[key] || key;
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        result = result.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return result;
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
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactActual.createElement(Text, props, children);

  const TextButton = ({
    children,
    onPress,
    ...props
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) =>
    ReactActual.createElement(
      TouchableOpacity,
      { onPress, ...props },
      ReactActual.createElement(Text, {}, children),
    );

  return {
    Box,
    Text: TextComponent,
    TextButton,
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
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
    },
    IconName: {
      Warning: 'Warning',
    },
    IconSize: {
      Md: 'Md',
    },
    IconColor: {
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
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      seasonReward,
      testID,
    }: {
      seasonReward: SeasonRewardDto;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: testID || 'reward-item' },
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

// Mock generateDeviceAnalyticsMetaData
jest.mock('../../../../../util/metrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    device_type: 'mobile',
    platform: 'ios',
  })),
}));

// Mock Linking
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      ...RN.Linking,
      openURL: jest.fn(() => Promise.resolve()),
    },
  };
});

const mockLinkingOpenURL = Linking.openURL as jest.MockedFunction<
  typeof Linking.openURL
>;

describe('PreviousSeasonUnlockedRewards', () => {
  const mockFetchUnlockedRewards = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn(() => ({
    addProperties: jest.fn(() => ({
      build: jest.fn(() => ({})),
    })),
  }));

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
      rewards: [mockSeasonReward1, mockSeasonReward2, mockRegularSeasonReward],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseUnlockedRewards.mockReturnValue({
      fetchUnlockedRewards: mockFetchUnlockedRewards,
    });

    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
      return undefined;
    });

    mockLinkingOpenURL.mockResolvedValue(undefined);
  });

  it('renders error banner when there is an error and not loading and endOfSeasonRewards is null', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return null;
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return true;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
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
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
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
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
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
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
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
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
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
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
      return undefined;
    });

    const { getByText, queryByText } = render(
      <PreviousSeasonUnlockedRewards />,
    );

    expect(getByText('End of Season Reward 1')).toBeOnTheScreen();
    expect(getByText('End of Season Reward 2')).toBeOnTheScreen();
    expect(queryByText('Regular Reward')).not.toBeOnTheScreen();
  });

  it('renders update MetaMask button when no version specified', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonUnlockedRewards />);

    expect(getByText('Update MetaMask')).toBeOnTheScreen();
  });

  it('renders update MetaMask version button when version is specified', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return '1.2.3';
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonUnlockedRewards />);

    expect(getByText('Update MetaMask to version 1.2.3')).toBeOnTheScreen();
  });

  it('opens iOS app store when button is pressed on iOS', () => {
    Platform.OS = 'ios';

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonUnlockedRewards />);

    const updateButton = getByText('Update MetaMask');
    fireEvent.press(updateButton);

    expect(mockLinkingOpenURL).toHaveBeenCalledWith(MM_APP_STORE_LINK);
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('opens Android play store when button is pressed on Android', () => {
    Platform.OS = 'android';

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonUnlockedRewards />);

    const updateButton = getByText('Update MetaMask');
    fireEvent.press(updateButton);

    expect(mockLinkingOpenURL).toHaveBeenCalledWith(MM_PLAY_STORE_LINK);
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks analytics event when app store button is pressed', () => {
    Platform.OS = 'ios';

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonUnlockedRewards />);

    const updateButton = getByText('Update MetaMask');
    fireEvent.press(updateButton);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('handles Linking.openURL error gracefully', () => {
    Platform.OS = 'ios';
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {
        // Do nothing
      });

    mockLinkingOpenURL.mockRejectedValue(new Error('Failed to open URL'));

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [mockUnlockedReward1];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonUnlockedRewards />);

    const updateButton = getByText('Update MetaMask');
    fireEvent.press(updateButton);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Error opening MetaMask store:',
          expect.any(Error),
        );
        consoleWarnSpy.mockRestore();
        resolve();
      }, 0);
    });
  });

  it('returns empty array when unlockedRewards is undefined and currentTier has no pointsNeeded', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return undefined;
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: undefined };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
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

  it('shows verifying rewards message when currentTier has pointsNeeded and no end of season rewards', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return [];
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
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

  it('returns null when unlockedRewards is undefined and currentTier has pointsNeeded', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectUnlockedRewards) return undefined;
      if (selector === selectUnlockedRewardLoading) return false;
      if (selector === selectUnlockedRewardError) return false;
      if (selector === selectSeasonTiers) return mockSeasonTiers;
      if (selector === selectCurrentTier) return { pointsNeeded: 100 };
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
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
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
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
      if (selector === selectSeasonShouldInstallNewVersion) return undefined;
      return undefined;
    });

    const { queryByTestId } = render(<PreviousSeasonUnlockedRewards />);

    expect(queryByTestId('rewards-error-banner')).not.toBeOnTheScreen();
  });
});

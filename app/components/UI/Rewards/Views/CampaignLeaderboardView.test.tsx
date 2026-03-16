import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import CampaignLeaderboardView, {
  CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS,
} from './CampaignLeaderboardView';
import {
  selectCampaignUserLeaderboardEntry,
  selectCampaignParticipantCount,
} from '../../../../reducers/rewards/selectors';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignUserLeaderboardEntry: jest.fn(),
  selectCampaignParticipantCount: jest.fn(),
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        title,
        onBack,
        endButtonIconProps,
      }: {
        title: string;
        onBack: () => void;
        endButtonIconProps?: { onPress: () => void; testID?: string }[];
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
          ...(endButtonIconProps ?? []).map(
            (btn: { onPress: () => void; testID?: string }, i: number) =>
              ReactActual.createElement(Pressable, {
                key: i,
                onPress: btn.onPress,
                testID: btn.testID ?? `header-end-button-${i}`,
              }),
          ),
        ),
    };
  },
);

jest.mock('../components/Campaigns/CampaignLeaderboard', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ showInternalHeader }: { showInternalHeader?: boolean }) => (
      <View
        testID="mock-campaign-leaderboard"
        accessibilityLabel={
          showInternalHeader === false ? 'no-header' : 'with-header'
        }
      />
    ),
  };
});

jest.mock('../../../Views/ErrorBoundary', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
      style,
    }: {
      children: React.ReactNode;
      testID?: string;
      style?: unknown;
    }) => (
      <View testID={testID} style={style}>
        {children}
      </View>
    ),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      'rewards.campaign_leaderboard.title': 'Pending Leaderboard',
      'rewards.campaign_leaderboard.qualifying_deposits': 'Qualifying Deposits',
      'rewards.campaign_leaderboard.rank_of_total': `of ${params?.count ?? ''}`,
    };
    return map[key] || key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectUserEntry =
  selectCampaignUserLeaderboardEntry as jest.MockedFunction<
    typeof selectCampaignUserLeaderboardEntry
  >;
const mockSelectParticipantCount =
  selectCampaignParticipantCount as jest.MockedFunction<
    typeof selectCampaignParticipantCount
  >;

const CAMPAIGN_ID = 'campaign-1';

function setupSelectors({
  userEntry = { rank: 5, totalScore: '15821.50' },
  participantCount = 21385,
}: {
  userEntry?: { rank: number; totalScore: string } | null;
  participantCount?: number | null;
} = {}) {
  const userEntrySelector = jest.fn().mockReturnValue(userEntry);
  const participantCountSelector = jest.fn().mockReturnValue(participantCount);
  mockSelectUserEntry.mockReturnValue(userEntrySelector);
  mockSelectParticipantCount.mockReturnValue(participantCountSelector);
  mockUseSelector.mockImplementation((selector) => {
    if (selector === userEntrySelector) return userEntry;
    if (selector === participantCountSelector) return participantCount;
    return undefined;
  });
}

describe('CampaignLeaderboardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
      navigate: mockNavigate,
    });
    (useRoute as jest.Mock).mockReturnValue({
      params: { campaignId: CAMPAIGN_ID },
    });
    setupSelectors();
  });

  it('renders the container', () => {
    const { getByTestId } = render(<CampaignLeaderboardView />);
    expect(
      getByTestId(CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.CONTAINER),
    ).toBeDefined();
  });

  it('renders the header title', () => {
    const { getByTestId } = render(<CampaignLeaderboardView />);
    expect(getByTestId('header')).toHaveTextContent('Pending Leaderboard');
  });

  it('renders qualifying deposits label', () => {
    const { getByTestId } = render(<CampaignLeaderboardView />);
    expect(
      getByTestId(CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.QUALIFYING_DEPOSITS_LABEL),
    ).toHaveTextContent('Qualifying Deposits');
  });

  it('renders user score formatted as dollars', () => {
    const { getByTestId } = render(<CampaignLeaderboardView />);
    expect(
      getByTestId(
        CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.QUALIFYING_DEPOSITS_AMOUNT,
      ),
    ).toHaveTextContent('$15,821');
  });

  it('renders dash when user entry is null', () => {
    setupSelectors({ userEntry: null });
    const { getByTestId } = render(<CampaignLeaderboardView />);
    expect(
      getByTestId(
        CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.QUALIFYING_DEPOSITS_AMOUNT,
      ),
    ).toHaveTextContent('—');
  });

  it('renders user rank', () => {
    const { getByTestId } = render(<CampaignLeaderboardView />);
    expect(
      getByTestId(CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.RANK_LABEL),
    ).toHaveTextContent('#5');
  });

  it('renders participant count in rank total', () => {
    const { getByTestId } = render(<CampaignLeaderboardView />);
    expect(
      getByTestId(CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.RANK_TOTAL),
    ).toHaveTextContent('of 21,385');
  });

  it('does not render rank when user entry is null', () => {
    setupSelectors({ userEntry: null });
    const { queryByTestId } = render(<CampaignLeaderboardView />);
    expect(
      queryByTestId(CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.RANK_LABEL),
    ).toBeNull();
  });

  it('does not render rank total when participantCount is null', () => {
    setupSelectors({ participantCount: null });
    const { queryByTestId } = render(<CampaignLeaderboardView />);
    expect(
      queryByTestId(CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.RANK_TOTAL),
    ).toBeNull();
  });

  it('renders the leaderboard without internal header', () => {
    const { getByTestId } = render(<CampaignLeaderboardView />);
    expect(
      getByTestId('mock-campaign-leaderboard').props.accessibilityLabel,
    ).toBe('no-header');
  });

  it('navigates to Mechanics when question button is pressed', () => {
    const { getByTestId } = render(<CampaignLeaderboardView />);
    fireEvent.press(getByTestId('campaign-leaderboard-view-mechanics-button'));
    expect(mockNavigate).toHaveBeenCalledWith('CampaignMechanics', {
      campaignId: CAMPAIGN_ID,
    });
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(<CampaignLeaderboardView />);
    fireEvent.press(getByTestId('header-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('calls selectors with campaignId from route params', () => {
    render(<CampaignLeaderboardView />);
    expect(mockSelectUserEntry).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(mockSelectParticipantCount).toHaveBeenCalledWith(CAMPAIGN_ID);
  });
});

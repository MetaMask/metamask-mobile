import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import OndoCampaignWinningView, {
  ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS,
} from './OndoCampaignWinningView';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useOndoCampaignWinnerCode } from '../hooks/useOndoCampaignWinnerCode';

jest.mock('../../../../images/rewards/campaign_winning.png', () => ({
  __esModule: true,
  default: 1,
}));

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({
    params: { campaignId: 'campaign-ondo-1', campaignName: 'Ondo Campaign' },
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (...args: unknown[]) => args;
  tw.style = (...args: unknown[]) => args;
  return { useTailwind: () => tw };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

jest.mock('../hooks/useTrackRewardsPageView', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    REWARDS_PAGE_BUTTON_CLICKED: 'REWARDS_PAGE_BUTTON_CLICKED',
  },
}));

jest.mock('../utils', () => ({
  RewardsMetricsButtons: {
    COPY_REFERRAL_CODE: 'copy_referral_code',
  },
}));

jest.mock('../hooks/useOndoCampaignWinnerCode', () => ({
  useOndoCampaignWinnerCode: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({}));
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: () => ({ build: mockBuild }),
    }),
  }),
}));

const mockPosition = {
  projectedTier: 'MID',
  rank: 3,
  totalInTier: 100,
  rateOfReturn: 0.2823,
  currentUsdValue: 2000,
  totalUsdDeposited: 1000,
  netDeposit: 900,
  qualifiedDays: 10,
  qualified: true,
  neighbors: [],
  computedAt: '2024-01-01T00:00:00.000Z',
};

jest.mock('../hooks/useGetOndoLeaderboardPosition', () => ({
  useGetOndoLeaderboardPosition: jest.fn(),
}));

const mockUseGetOndoLeaderboardPosition =
  useGetOndoLeaderboardPosition as jest.MockedFunction<
    typeof useGetOndoLeaderboardPosition
  >;

const mockUseOndoCampaignWinnerCode =
  useOndoCampaignWinnerCode as jest.MockedFunction<
    typeof useOndoCampaignWinnerCode
  >;

jest.mock('../components/ReferralDetails/CopyableField', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      value,
      onCopy,
    }: {
      label: string;
      value?: string | null;
      onCopy?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'copyable-field' },
        ReactActual.createElement(Text, null, label),
        ReactActual.createElement(
          Text,
          { testID: 'copyable-value' },
          value ?? '',
        ),
        ReactActual.createElement(Pressable, {
          testID: 'copyable-trigger',
          onPress: onCopy,
        }),
      ),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(
    (key: string, params?: { place?: string; code?: string }) => {
      const map: Record<string, string> = {
        'rewards.ondo_campaign_winning.you_won': 'You won',
        'rewards.ondo_campaign_winning.email_instructions':
          'Email ondocampaign@consensys.net with your code to claim your prize.',
        'rewards.ondo_campaign_winning.open_mail': 'Open mail',
        'rewards.ondo_campaign_winning.skip_for_now': 'Skip for now',
        'rewards.ondo_campaign_winning.mail_subject':
          'Ondo campaign prize claim',
        'rewards.ondo_campaign_winning.mail_body': `My winning code: ${params?.code ?? ''}`,
        'rewards.ondo_campaign_winning.winning_code': 'Winning code',
        'rewards.ondo_campaign_winning.close_a11y': 'Close',
      };
      if (key === 'rewards.ondo_campaign_winning.rank_label' && params?.place) {
        return `${params.place} place`;
      }
      return map[key] ?? key;
    },
  ),
}));

describe('OndoCampaignWinningView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetOndoLeaderboardPosition.mockReturnValue({
      position: mockPosition,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
    mockUseOndoCampaignWinnerCode.mockReturnValue({
      code: 'LVL346',
      isLoading: false,
    });
  });

  it('renders the main container', () => {
    const { getByTestId } = render(<OndoCampaignWinningView />);
    expect(
      getByTestId(ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER),
    ).toBeTruthy();
  });

  it('shows you won, rank place, and rate from leaderboard position', () => {
    const { getByText } = render(<OndoCampaignWinningView />);
    expect(getByText('You won')).toBeTruthy();
    expect(getByText('3rd place')).toBeTruthy();
    expect(getByText('+28.23%')).toBeTruthy();
  });

  it('calls goBack when Skip for now is pressed', () => {
    const { getByText } = render(<OndoCampaignWinningView />);
    fireEvent.press(getByText('Skip for now'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('calls goBack when close is pressed', () => {
    const { getByLabelText } = render(<OndoCampaignWinningView />);
    fireEvent.press(getByLabelText('Close'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('copies referral code and tracks analytics when copy is triggered', () => {
    const setStringSpy = jest.spyOn(Clipboard, 'setString');
    const { getByTestId } = render(<OndoCampaignWinningView />);
    fireEvent.press(getByTestId('copyable-trigger'));
    expect(setStringSpy).toHaveBeenCalledWith('LVL346');
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('opens mailto when Open mail is pressed', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { getByText } = render(<OndoCampaignWinningView />);
    fireEvent.press(getByText('Open mail'));
    expect(openSpy).toHaveBeenCalled();
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain('mailto:ondocampaign@consensys.net');
    expect(url).toContain(encodeURIComponent('LVL346'));
    openSpy.mockRestore();
  });
});

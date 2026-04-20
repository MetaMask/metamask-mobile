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
        'rewards.ondo_campaign_winning.error_title':
          'Could not load your winning code',
        'rewards.ondo_campaign_winning.error_description':
          'Something went wrong while fetching your code. Please try again later or contact support.',
        'rewards.ondo_campaign_winning.error_retry': 'Try again',
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
      hasFetched: true,
      hasError: false,
      retry: jest.fn(),
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

  describe('auto-redirect when user is not a winner', () => {
    it('calls goBack when code is null after a successful fetch', () => {
      mockUseOndoCampaignWinnerCode.mockReturnValue({
        code: null,
        isLoading: false,
        hasFetched: true,
        hasError: false,
        retry: jest.fn(),
      });
      render(<OndoCampaignWinningView />);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call goBack while the fetch is still in progress', () => {
      mockUseOndoCampaignWinnerCode.mockReturnValue({
        code: null,
        isLoading: true,
        hasFetched: false,
        hasError: false,
        retry: jest.fn(),
      });
      render(<OndoCampaignWinningView />);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not call goBack when fetch errored (error takes precedence)', () => {
      mockUseOndoCampaignWinnerCode.mockReturnValue({
        code: null,
        isLoading: false,
        hasFetched: true,
        hasError: true,
        retry: jest.fn(),
      });
      render(<OndoCampaignWinningView />);
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('shows a skeleton while winning code is loading', () => {
      mockUseOndoCampaignWinnerCode.mockReturnValue({
        code: null,
        isLoading: true,
        hasFetched: false,
        hasError: false,
        retry: jest.fn(),
      });
      const { queryByTestId } = render(<OndoCampaignWinningView />);
      expect(queryByTestId('copyable-field')).toBeNull();
    });

    it('shows CopyableField once winning code has loaded', () => {
      const { getByTestId } = render(<OndoCampaignWinningView />);
      expect(getByTestId('copyable-field')).toBeTruthy();
    });

    it('hides rank and rate text while position is loading', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: true,
        hasError: false,
        hasFetched: false,
        refetch: jest.fn(),
      });
      const { queryByText } = render(<OndoCampaignWinningView />);
      expect(queryByText('3rd place')).toBeNull();
      expect(queryByText('+28.23%')).toBeNull();
    });
  });

  describe('error states', () => {
    it('shows the error banner when winning code fetch fails', () => {
      mockUseOndoCampaignWinnerCode.mockReturnValue({
        code: null,
        isLoading: false,
        hasFetched: true,
        hasError: true,
        retry: jest.fn(),
      });
      const { queryByTestId } = render(<OndoCampaignWinningView />);
      expect(queryByTestId('copyable-field')).toBeNull();
      expect(queryByTestId('copyable-trigger')).toBeNull();
    });

    it('calls retry when Try again is pressed in the error banner', () => {
      const mockRetry = jest.fn();
      mockUseOndoCampaignWinnerCode.mockReturnValue({
        code: null,
        isLoading: false,
        hasFetched: true,
        hasError: true,
        retry: mockRetry,
      });
      const { getByText } = render(<OndoCampaignWinningView />);
      fireEvent.press(getByText('Try again'));
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('shows the position error banner when position fetch fails', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: false,
        hasError: true,
        hasFetched: true,
        refetch: jest.fn(),
      });
      const { queryByText } = render(<OndoCampaignWinningView />);
      expect(queryByText('3rd place')).toBeNull();
      expect(queryByText('+28.23%')).toBeNull();
    });
  });

  describe('null position display', () => {
    it('shows em-dash placeholders when position is null and not loading', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: jest.fn(),
      });
      const { getAllByText } = render(<OndoCampaignWinningView />);
      expect(getAllByText('—').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('mailto URL construction', () => {
    it('appends the winning code to the mail subject', async () => {
      const openSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByText } = render(<OndoCampaignWinningView />);
      fireEvent.press(getByText('Open mail'));
      const url = openSpy.mock.calls[0][0] as string;
      expect(url).toContain(
        encodeURIComponent('Ondo campaign prize claim - LVL346'),
      );
      openSpy.mockRestore();
    });

    it('uses the base subject when winning code is not yet available', async () => {
      // hasFetched=false: no redirect triggered, no error banner, Open mail is visible
      mockUseOndoCampaignWinnerCode.mockReturnValue({
        code: null,
        isLoading: false,
        hasFetched: false,
        hasError: false,
        retry: jest.fn(),
      });
      const openSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByText } = render(<OndoCampaignWinningView />);
      fireEvent.press(getByText('Open mail'));
      const url = openSpy.mock.calls[0][0] as string;
      expect(url).toContain(encodeURIComponent('Ondo campaign prize claim'));
      expect(url).not.toContain(encodeURIComponent(' - '));
      openSpy.mockRestore();
    });
  });
});

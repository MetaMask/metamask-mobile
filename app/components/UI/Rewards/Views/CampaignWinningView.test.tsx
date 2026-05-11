import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import CampaignWinningView, {
  CampaignWinningViewProps,
} from './CampaignWinningView';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';

jest.mock('../../../../images/rewards/campaign_winning.png', () => ({
  __esModule: true,
  default: 1,
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = (..._args: unknown[]) => ({});
  return { useTailwind: () => tw };
});

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  default: () => ({ width: 390, height: 844 }),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  };
});

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
    COPY_WINNER_VERIFICATION_CODE: 'copy_winner_verification_code',
  },
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
    (
      key: string,
      params?: {
        code?: string;
        campaignName?: string;
        email?: string;
      },
    ) => {
      if (
        key === 'rewards.campaign_winning.mail_subject' &&
        params?.campaignName
      )
        return `${params.campaignName} prize claim`;
      if (key === 'rewards.campaign_winning.mail_body' && params?.code)
        return `My winning code: ${params.code}`;
      if (
        key === 'rewards.campaign_winning.email_instructions' &&
        params?.email
      )
        return `Email ${params.email} with your code`;
      const map: Record<string, string> = {
        'rewards.campaign_winning.you_won': 'You won',
        'rewards.campaign_winning.open_mail': 'Open mail',
        'rewards.campaign_winning.skip_for_now': 'Skip for now',
        'rewards.campaign_winning.winning_code': 'Winning code',
        'rewards.campaign_winning.close_a11y': 'Close',
      };
      return map[key] ?? key;
    },
  ),
}));

const PRIZE_EMAIL = 'test@consensys.net';
const CAMPAIGN_NAME = 'Test Campaign';
const CAMPAIGN_ID = 'campaign-test-1';
const WINNING_CODE = 'WIN-123';
const mockUseTrackRewardsPageView =
  useTrackRewardsPageView as jest.MockedFunction<
    typeof useTrackRewardsPageView
  >;

const defaultProps: CampaignWinningViewProps = {
  testID: 'test-winning-view',
  viewName: 'TestWinningView',
  prizeEmail: PRIZE_EMAIL,
  campaignName: CAMPAIGN_NAME,
  campaignId: CAMPAIGN_ID,
  analyticsPageType: 'test_campaign_winning',
  winningCode: WINNING_CODE,
  hasOutcomeLoaded: true,
  isLoading: false,
  rankDisplay: null,
};

describe('CampaignWinningView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main container with the provided testID', () => {
    const { getByTestId } = render(<CampaignWinningView {...defaultProps} />);
    expect(getByTestId('test-winning-view')).toBeTruthy();
  });

  it('renders "You won" text', () => {
    const { getByText } = render(<CampaignWinningView {...defaultProps} />);
    expect(getByText('You won')).toBeTruthy();
  });

  it('renders email instructions with the prizeEmail', () => {
    const { getByText } = render(<CampaignWinningView {...defaultProps} />);
    expect(getByText(`Email ${PRIZE_EMAIL} with your code`)).toBeTruthy();
  });

  it('tracks page view with the campaign id', () => {
    render(<CampaignWinningView {...defaultProps} />);
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'test_campaign_winning',
      campaign_id: CAMPAIGN_ID,
    });
  });

  it('renders rank and result display when provided', () => {
    const { getByText } = render(
      <CampaignWinningView
        {...defaultProps}
        rankDisplay="3rd"
        resultDisplay="+12.34%"
      />,
    );
    expect(getByText('3rd')).toBeTruthy();
    expect(getByText('+12.34%')).toBeTruthy();
  });

  it('calls goBack when Skip for now is pressed', () => {
    const { getByText } = render(<CampaignWinningView {...defaultProps} />);
    fireEvent.press(getByText('Skip for now'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('calls goBack when Close button is pressed', () => {
    const { getByLabelText } = render(
      <CampaignWinningView {...defaultProps} />,
    );
    fireEvent.press(getByLabelText('Close'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('copies winning code and fires analytics when copy is triggered', () => {
    const setStringSpy = jest.spyOn(Clipboard, 'setString');
    const { getByTestId } = render(<CampaignWinningView {...defaultProps} />);
    fireEvent.press(getByTestId('copyable-trigger'));
    expect(setStringSpy).toHaveBeenCalledWith(WINNING_CODE);
    expect(mockTrackEvent).toHaveBeenCalled();
    setStringSpy.mockRestore();
  });

  it('opens mailto with the correct email and code when Open mail is pressed', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { getByText } = render(<CampaignWinningView {...defaultProps} />);
    fireEvent.press(getByText('Open mail'));
    expect(openSpy).toHaveBeenCalled();
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain(`mailto:${PRIZE_EMAIL}`);
    expect(url).toContain(encodeURIComponent(WINNING_CODE));
    openSpy.mockRestore();
  });

  it('navigates to fallback route when outcome loads without a winning code', () => {
    const fallbackRoute = {
      route: 'CampaignDetails',
      params: { campaignId: CAMPAIGN_ID },
    };

    render(
      <CampaignWinningView
        {...defaultProps}
        winningCode={null}
        hasOutcomeLoaded
        isLoading={false}
        fallbackRoute={fallbackRoute}
      />,
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      fallbackRoute.route,
      fallbackRoute.params,
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('falls back to goBack when outcome loads without a winning code and no fallback route is provided', () => {
    render(
      <CampaignWinningView
        {...defaultProps}
        winningCode={null}
        hasOutcomeLoaded
        isLoading={false}
      />,
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call goBack before outcome has loaded', () => {
    render(
      <CampaignWinningView
        {...defaultProps}
        winningCode={null}
        hasOutcomeLoaded={false}
        isLoading={false}
      />,
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not call goBack while still loading', () => {
    render(
      <CampaignWinningView
        {...defaultProps}
        winningCode={null}
        hasOutcomeLoaded
        isLoading
      />,
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

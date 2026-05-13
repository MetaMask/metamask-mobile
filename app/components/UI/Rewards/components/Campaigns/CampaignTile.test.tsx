import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import CampaignTile from './CampaignTile';
import { reminderStorageKeyForComposite } from '../../hooks/useCampaignReminderActions';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  getCampaignStatusInfo,
  isCampaignTypeSupported,
} from './CampaignTile.utils';
import useGetCampaignParticipantStatus from '../../hooks/useGetCampaignParticipantStatus';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../../util/notifications/constants';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockShowToast = jest.fn();
const mockEnableNotifications = jest.fn();
const mockEnableNotificationsNudge = jest.fn(
  (linkButtonOptions: { label: string; onPress: () => Promise<void> }) => ({
    variant: 'Plain',
    hasNoTimeout: true,
    linkButtonOptions,
    closeButtonOptions: {
      onPress: jest.fn(),
    },
  }),
);
let mockEnableNotificationsLoading = false;

const TEST_REWARDS_SUBSCRIPTION_ID = 'test-rewards-sub-id';

const mockGetItemSync = jest.fn((_key: string): string | null => null);
const mockSetItem = jest.fn(
  (_key: string, _value: string): Promise<void> => Promise.resolve(),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: (key: string) => mockGetItemSync(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: jest.fn((title: string, subtitle?: string) => ({
        variant: 'success',
        title,
        subtitle,
      })),
      error: jest.fn((title: string, subtitle?: string) => ({
        variant: 'error',
        title,
        subtitle,
      })),
      enableNotificationsNudge: mockEnableNotificationsNudge,
      entriesClosed: jest.fn(),
      loading: jest.fn((title: string, subtitle?: string) => ({
        variant: 'loading',
        title,
        subtitle,
      })),
    },
  })),
}));

jest.mock('../../../../../util/notifications/hooks/useNotifications', () => ({
  useEnableNotifications: jest.fn(() => ({
    enableNotifications: mockEnableNotifications,
    loading: mockEnableNotificationsLoading,
  })),
}));

jest.mock('../../../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn().mockReturnValue({
    navigate: (...args: unknown[]) => mockNavigate(...args),
  }),
}));

jest.mock('../../hooks/useGetCampaignParticipantStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseGetCampaignParticipantStatus =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../hooks/useGetCampaignParticipantStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./CampaignTile.utils', () => ({
  getCampaignStatusInfo: jest.fn().mockReturnValue({
    status: 'active',
    statusLabel: 'Active',
    dateLabel: 'Ends Mar 15, 2:30 PM',
    dateLabelIcon: 'Clock',
  }),
  isCampaignTypeSupported: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign.enter': 'Enter',
      'rewards.campaign.entered': 'Entered',
      'rewards.campaign.notify_me': 'Notify me',
      'rewards.campaign.remind_me_success_toast': 'We will notify you.',
      'rewards.campaign.remind_me_save_error': 'Save failed.',
      'rewards.notifications_nudge.turn_on_button': 'Turn on',
    };
    return translations[key] || key;
  },
}));

const createTestCampaign = (overrides = {}): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2027-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  showUpcomingDate: false,
  ...overrides,
});

function setupParticipantStatus(optedIn: boolean) {
  mockUseGetCampaignParticipantStatus.mockReturnValue({
    status: { optedIn, participantCount: 0 },
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
  });
}

describe('CampaignTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableNotifications.mockResolvedValue(undefined);
    mockEnableNotificationsLoading = false;
    mockGetItemSync.mockReturnValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return TEST_REWARDS_SUBSCRIPTION_ID;
      }
      if (
        selector === selectIsMetamaskNotificationsEnabled ||
        selector === selectIsMetaMaskPushNotificationsEnabled
      ) {
        return true;
      }
      return undefined;
    });
    mockCreateEventBuilder.mockImplementation(() => {
      const builder = {
        addProperties: jest.fn(),
        build: jest.fn(),
      };
      builder.addProperties.mockImplementation(() => builder);
      builder.build.mockImplementation(() => ({ category: 'test-event' }));
      return builder;
    });
    (getCampaignStatusInfo as jest.Mock).mockReturnValue({
      status: 'active',
      statusLabel: 'Active',
      dateLabel: 'Ends Mar 15, 2:30 PM',
      dateLabelIcon: 'Clock',
    });
    (isCampaignTypeSupported as jest.Mock).mockReturnValue(true);
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: null,
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
  });

  it('renders campaign name via campaign-tile-name testID', () => {
    const campaign = createTestCampaign({ name: 'My Campaign' });

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);

    expect(getByTestId('campaign-tile-name')).toHaveTextContent('My Campaign');
  });

  it('renders date info label via campaign-tile-date-info testID', () => {
    const campaign = createTestCampaign();

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);

    expect(getByTestId('campaign-tile-date-info')).toBeDefined();
  });

  it('renders status label via campaign-tile-status-label testID', () => {
    const campaign = createTestCampaign();

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);

    expect(getByTestId('campaign-tile-status-label')).toHaveTextContent(
      /Active/,
    );
  });

  it('renders background image via campaign-tile-background testID', () => {
    const campaign = createTestCampaign({
      image: {
        lightModeUrl: 'https://example.com/light.png',
        darkModeUrl: 'https://example.com/dark.png',
      },
    });

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);

    expect(getByTestId('campaign-tile-background')).toBeDefined();
  });

  it('calls getCampaignStatusInfo with campaign', () => {
    const campaign = createTestCampaign();

    render(<CampaignTile campaign={campaign} />);

    expect(getCampaignStatusInfo).toHaveBeenCalledWith(campaign);
  });

  describe('date label', () => {
    it('renders date label for active campaign', () => {
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'Ends Mar 15, 2:30 PM',
      );
    });

    it('renders date label for upcoming campaign when showUpcomingDate is true', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({ showUpcomingDate: true });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'Starts June 1',
      );
    });

    it('renders date label for complete campaign', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'complete',
        statusLabel: 'Complete',
        dateLabel: 'December 31',
        dateLabelIcon: 'Confirmation',
      });
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'December 31',
      );
    });
  });

  describe('showUpcomingDate', () => {
    it('hides date label and bullet for upcoming campaign when showUpcomingDate is false', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({ showUpcomingDate: false });

      const { queryByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(queryByTestId('campaign-tile-date-info')).toBeNull();
    });

    it('shows date label for upcoming campaign when showUpcomingDate is true', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({ showUpcomingDate: true });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'Starts June 1',
      );
    });

    it('always shows date label for active campaign regardless of showUpcomingDate', () => {
      const campaign = createTestCampaign({ showUpcomingDate: false });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'Ends Mar 15, 2:30 PM',
      );
    });

    it('always shows date label for complete campaign regardless of showUpcomingDate', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'complete',
        statusLabel: 'Complete',
        dateLabel: 'December 31',
        dateLabelIcon: 'Confirmation',
      });
      const campaign = createTestCampaign({ showUpcomingDate: false });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'December 31',
      );
    });
  });

  describe('entered label', () => {
    it('shows "Entered" label when participant is opted in', () => {
      setupParticipantStatus(true);
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-entered-label')).toHaveTextContent(
        'Entered',
      );
    });

    it('shows status label when participant is not opted in', () => {
      setupParticipantStatus(false);
      const campaign = createTestCampaign();

      const { queryByTestId, getByTestId } = render(
        <CampaignTile campaign={campaign} />,
      );

      expect(queryByTestId('campaign-tile-entered-label')).toBeNull();
      expect(getByTestId('campaign-tile-status-label')).toHaveTextContent(
        /Active/,
      );
    });

    it('shows "Entered" label alongside date label when opted in', () => {
      setupParticipantStatus(true);
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-entered-label')).toHaveTextContent(
        'Entered',
      );
      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'Ends Mar 15, 2:30 PM',
      );
    });
  });

  describe('participant status hook call conditions', () => {
    it('calls hook with campaign.id when campaign is active and ONDO_HOLDING type', () => {
      const campaign = createTestCampaign({
        id: 'ondo-active',
        type: CampaignType.ONDO_HOLDING,
      });

      render(<CampaignTile campaign={campaign} />);

      expect(mockUseGetCampaignParticipantStatus).toHaveBeenCalledWith(
        'ondo-active',
      );
    });

    it('calls hook with undefined when campaign is upcoming', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'ondo-upcoming',
        type: CampaignType.ONDO_HOLDING,
      });

      render(<CampaignTile campaign={campaign} />);

      expect(mockUseGetCampaignParticipantStatus).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('calls hook with undefined when campaign is complete', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'complete',
        statusLabel: 'Complete',
        dateLabel: 'December 31',
        dateLabelIcon: 'Confirmation',
      });
      const campaign = createTestCampaign({
        id: 'ondo-complete',
        type: CampaignType.ONDO_HOLDING,
      });

      render(<CampaignTile campaign={campaign} />);

      expect(mockUseGetCampaignParticipantStatus).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('calls hook with undefined when campaign is active but not ONDO_HOLDING type', () => {
      const campaign = createTestCampaign({
        id: 'season-active',
        type: CampaignType.SEASON_1,
      });

      render(<CampaignTile campaign={campaign} />);

      expect(mockUseGetCampaignParticipantStatus).toHaveBeenCalledWith(
        undefined,
      );
    });
  });

  describe('navigation', () => {
    it('navigates to Ondo campaign details for ONDO_HOLDING type', () => {
      const campaign = createTestCampaign({
        id: 'camp-ondo',
        type: CampaignType.ONDO_HOLDING,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-ondo'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
        {
          campaignId: 'camp-ondo',
        },
      );
    });

    it('navigates to season one campaign details for SEASON_1 type', () => {
      const campaign = createTestCampaign({
        id: 'camp-season',
        type: CampaignType.SEASON_1,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-season'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW,
        {
          campaignId: 'camp-season',
        },
      );
    });

    it('calls custom onPress handler instead of navigating when provided', () => {
      const campaign = createTestCampaign({ id: 'camp-custom' });
      const mockOnPress = jest.fn();

      const { getByTestId } = render(
        <CampaignTile campaign={campaign} onPress={mockOnPress} />,
      );
      fireEvent.press(getByTestId('campaign-tile-camp-custom'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate for unsupported campaign type without onPress', () => {
      (isCampaignTypeSupported as jest.Mock).mockReturnValue(false);
      const campaign = createTestCampaign({
        id: 'camp-unsupported',
        type: 'UNKNOWN_TYPE' as CampaignType,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-unsupported'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('calls onPress for unsupported campaign type when onPress is provided', () => {
      (isCampaignTypeSupported as jest.Mock).mockReturnValue(false);
      const campaign = createTestCampaign({
        id: 'camp-unsupported-press',
        type: 'UNKNOWN_TYPE' as CampaignType,
      });
      const mockOnPress = jest.fn();

      const { getByTestId } = render(
        <CampaignTile campaign={campaign} onPress={mockOnPress} />,
      );
      fireEvent.press(getByTestId('campaign-tile-camp-unsupported-press'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate for any campaign type when status is upcoming', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-ondo-upcoming',
        type: CampaignType.ONDO_HOLDING,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-ondo-upcoming'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not call onPress for any campaign type when status is upcoming', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-season-upcoming',
        type: CampaignType.SEASON_1,
      });
      const mockOnPress = jest.fn();

      const { getByTestId } = render(
        <CampaignTile campaign={campaign} onPress={mockOnPress} />,
      );
      fireEvent.press(getByTestId('campaign-tile-camp-season-upcoming'));

      expect(mockOnPress).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates for ONDO_HOLDING campaign when status is active', () => {
      const campaign = createTestCampaign({
        id: 'camp-ondo-active',
        type: CampaignType.ONDO_HOLDING,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-ondo-active'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
        { campaignId: 'camp-ondo-active' },
      );
    });
  });

  describe('campaign reminder', () => {
    it('shows Notify me for upcoming supported campaign', async () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-upcoming-remind',
        type: CampaignType.ONDO_HOLDING,
        startDate: '2028-06-01T12:00:00.000Z',
      });

      const { getByTestId, getByLabelText } = render(
        <CampaignTile campaign={campaign} />,
      );

      await waitFor(() => {
        expect(
          getByTestId('campaign-tile-remind-me-camp-upcoming-remind'),
        ).toBeTruthy();
      });
      expect(getByLabelText('Notify me')).toBeTruthy();
    });

    it('does not show Notify me for upcoming unsupported campaign type', () => {
      (isCampaignTypeSupported as jest.Mock).mockReturnValue(false);
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-upcoming-unsupported',
        type: 'UNKNOWN_TYPE' as CampaignType,
      });

      const { queryByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(
        queryByTestId('campaign-tile-remind-me-camp-upcoming-unsupported'),
      ).toBeNull();
    });

    it('tracks reminder subscribed and shows toast when Notify me is pressed', async () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-remind-analytics',
        type: CampaignType.PERPS_TRADING,
        startDate: '2028-07-15T00:00:00.000Z',
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      await waitFor(() => {
        expect(
          getByTestId('campaign-tile-remind-me-camp-remind-analytics'),
        ).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(
          getByTestId('campaign-tile-remind-me-camp-remind-analytics'),
        );
      });

      expect(mockSetItem).toHaveBeenCalledWith(
        reminderStorageKeyForComposite(
          `${TEST_REWARDS_SUBSCRIPTION_ID}:camp-remind-analytics`,
        ),
        '1',
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_CAMPAIGN_REMINDER_SUBSCRIBED,
      );
      const builder = mockCreateEventBuilder.mock.results[0]?.value as {
        addProperties: jest.Mock;
      };
      expect(builder.addProperties).toHaveBeenCalledWith({
        campaign_id: 'camp-remind-analytics',
        campaign_starts_at: '2028-07-15T00:00:00.000Z',
      });
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('prompts for notifications and tracks only after push notifications are enabled', async () => {
      let notificationsEnabled = false;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return TEST_REWARDS_SUBSCRIPTION_ID;
        }
        if (
          selector === selectIsMetamaskNotificationsEnabled ||
          selector === selectIsMetaMaskPushNotificationsEnabled
        ) {
          return notificationsEnabled;
        }
        return undefined;
      });
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-remind-notifications',
        type: CampaignType.PERPS_TRADING,
        startDate: '2028-07-15T00:00:00.000Z',
      });

      const { getByTestId, rerender } = render(
        <CampaignTile campaign={campaign} />,
      );
      await waitFor(() => {
        expect(
          getByTestId('campaign-tile-remind-me-camp-remind-notifications'),
        ).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(
          getByTestId('campaign-tile-remind-me-camp-remind-notifications'),
        );
      });

      expect(mockEnableNotificationsNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Turn on',
          onPress: expect.any(Function),
        }),
      );
      expect(mockSetItem).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();

      const linkButtonOptions = mockEnableNotificationsNudge.mock
        .calls[0][0] as {
        onPress: () => Promise<void>;
      };
      await act(async () => {
        await linkButtonOptions.onPress();
      });
      expect(mockEnableNotifications).toHaveBeenCalledTimes(1);

      notificationsEnabled = true;
      rerender(<CampaignTile campaign={campaign} />);

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith(
          reminderStorageKeyForComposite(
            `${TEST_REWARDS_SUBSCRIPTION_ID}:camp-remind-notifications`,
          ),
          '1',
        );
      });
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_CAMPAIGN_REMINDER_SUBSCRIBED,
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('cancels pending reminder subscription when the notifications nudge is dismissed', async () => {
      let notificationsEnabled = false;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return TEST_REWARDS_SUBSCRIPTION_ID;
        }
        if (
          selector === selectIsMetamaskNotificationsEnabled ||
          selector === selectIsMetaMaskPushNotificationsEnabled
        ) {
          return notificationsEnabled;
        }
        return undefined;
      });
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-dismiss-nudge',
        type: CampaignType.PERPS_TRADING,
        startDate: '2028-07-15T00:00:00.000Z',
      });

      const { getByTestId, rerender } = render(
        <CampaignTile campaign={campaign} />,
      );
      await waitFor(() => {
        expect(
          getByTestId('campaign-tile-remind-me-camp-dismiss-nudge'),
        ).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(
          getByTestId('campaign-tile-remind-me-camp-dismiss-nudge'),
        );
      });

      const toastConfig = mockShowToast.mock.calls[0][0] as {
        closeButtonOptions: { onPress: () => void };
      };
      act(() => {
        toastConfig.closeButtonOptions.onPress();
      });

      notificationsEnabled = true;
      rerender(<CampaignTile campaign={campaign} />);

      expect(mockSetItem).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not show Notify me when the notifications feature flag is off', async () => {
      (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(false);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) {
          return TEST_REWARDS_SUBSCRIPTION_ID;
        }
        if (
          selector === selectIsMetamaskNotificationsEnabled ||
          selector === selectIsMetaMaskPushNotificationsEnabled
        ) {
          return true;
        }
        return undefined;
      });
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-cannot-prompt',
        type: CampaignType.PERPS_TRADING,
      });

      const { queryByTestId } = render(<CampaignTile campaign={campaign} />);

      await waitFor(() => {
        expect(
          queryByTestId('campaign-tile-remind-me-camp-cannot-prompt'),
        ).toBeNull();
      });
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('does not show Notify me when storage already has subscription:campaign composite', async () => {
      mockGetItemSync.mockImplementation((key: string) =>
        key ===
        reminderStorageKeyForComposite(
          `${TEST_REWARDS_SUBSCRIPTION_ID}:camp-already-reminded`,
        )
          ? '1'
          : null,
      );
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-already-reminded',
        type: CampaignType.ONDO_HOLDING,
      });

      const { queryByTestId } = render(<CampaignTile campaign={campaign} />);

      await waitFor(() => {
        expect(
          queryByTestId('campaign-tile-remind-me-camp-already-reminded'),
        ).toBeNull();
      });
    });

    it('hides Notify me CTA after a successful subscribe', async () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-hide-after',
        type: CampaignType.ONDO_HOLDING,
        startDate: '2028-08-01T00:00:00.000Z',
      });

      const { getByTestId, queryByTestId } = render(
        <CampaignTile campaign={campaign} />,
      );
      await waitFor(() => {
        expect(
          getByTestId('campaign-tile-remind-me-camp-hide-after'),
        ).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('campaign-tile-remind-me-camp-hide-after'));
      });

      await waitFor(() => {
        expect(
          queryByTestId('campaign-tile-remind-me-camp-hide-after'),
        ).toBeNull();
      });
    });

    it('shows error toast when storage setItem fails', async () => {
      mockSetItem.mockRejectedValueOnce(new Error('disk full'));
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-save-fail',
        type: CampaignType.ONDO_HOLDING,
        startDate: '2028-09-01T00:00:00.000Z',
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      await waitFor(() => {
        expect(
          getByTestId('campaign-tile-remind-me-camp-save-fail'),
        ).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('campaign-tile-remind-me-camp-save-fail'));
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Save failed.',
        }),
      );
    });
  });
});

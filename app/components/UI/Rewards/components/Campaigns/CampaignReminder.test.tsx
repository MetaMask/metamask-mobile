import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import CampaignReminder from './CampaignReminder';
import {
  buildCampaignReminderCompositeKey,
  reminderStorageKeyForComposite,
} from '../../hooks/useCampaignReminderActions';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../../util/notifications/constants';

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
      loading: jest.fn((title: string, subtitle?: string) => ({
        variant: 'loading',
        title,
        subtitle,
      })),
      entriesClosed: jest.fn(),
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

jest.mock(
  '../../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: { openSystemSettings: jest.fn() },
    getPushPermission: jest.fn().mockResolvedValue('authorized'),
  }),
);

jest.mock('../../../../../images/rewards/notification.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-reminder-svg' }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign.up_next': 'Up next',
      'rewards.campaign.notify_me': 'Notify me',
      'rewards.campaign.remind_me_success_toast': 'We will notify you.',
      'rewards.campaign.remind_me_save_error': 'Save failed.',
      'rewards.notifications_nudge.turn_on_button': 'Turn on',
      'rewards.notifications_nudge.loading': 'Enabling notifications...',
      'rewards.notifications_nudge.loading_description':
        'This may take a moment.',
      'rewards.notifications_nudge.enable_error':
        'Failed to enable notifications',
    };
    return translations[key] || key;
  },
}));

const createTestCampaign = (overrides = {}): CampaignDto => ({
  id: 'campaign-reminder-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Preview Campaign',
  startDate: '2028-01-01T00:00:00.000Z',
  endDate: '2028-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  showUpcomingDate: false,
  ...overrides,
});

function mockSelectors({ notificationsEnabled = true } = {}) {
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
}

describe('CampaignReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableNotifications.mockResolvedValue(undefined);
    mockEnableNotificationsLoading = false;
    mockGetItemSync.mockReturnValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockSelectors();
    mockCreateEventBuilder.mockImplementation(() => {
      const builder = {
        addProperties: jest.fn(),
        build: jest.fn(() => ({})),
      };
      (builder.addProperties as jest.Mock).mockReturnValue(builder);
      return builder;
    });
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  it('renders up next label and campaign name', async () => {
    const campaign = createTestCampaign({ name: 'My Upcoming Campaign' });
    const { getByText, getByTestId } = render(
      <CampaignReminder campaign={campaign} />,
    );

    await waitFor(() => {
      expect(
        getByTestId('campaign-reminder-notify-campaign-reminder-1'),
      ).toBeOnTheScreen();
    });
    expect(getByText('Up next')).toBeOnTheScreen();
    expect(getByText('My Upcoming Campaign')).toBeOnTheScreen();
    expect(getByText('Notify me')).toBeOnTheScreen();
  });

  it('tracks reminder subscribed when Notify me is pressed', async () => {
    const campaign = createTestCampaign({ id: 'cr-analytics' });
    const { getByTestId } = render(<CampaignReminder campaign={campaign} />);

    await waitFor(() => {
      expect(
        getByTestId('campaign-reminder-notify-cr-analytics'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(getByTestId('campaign-reminder-notify-cr-analytics'));
    });

    const compositeKey = buildCampaignReminderCompositeKey(
      TEST_REWARDS_SUBSCRIPTION_ID,
      'cr-analytics',
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      reminderStorageKeyForComposite(compositeKey),
      '1',
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_CAMPAIGN_REMINDER_SUBSCRIBED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it('prompts for notifications and tracks only after push notifications are enabled', async () => {
    let notificationsEnabled = false;
    mockSelectors({ notificationsEnabled });
    const campaign = createTestCampaign({ id: 'cr-notifications' });
    const { getByTestId, rerender } = render(
      <CampaignReminder campaign={campaign} />,
    );

    await waitFor(() => {
      expect(
        getByTestId('campaign-reminder-notify-cr-notifications'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(getByTestId('campaign-reminder-notify-cr-notifications'));
    });

    expect(mockEnableNotificationsNudge).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Turn on',
        onPress: expect.any(Function),
      }),
    );
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });
    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);

    notificationsEnabled = true;
    mockSelectors({ notificationsEnabled });
    rerender(<CampaignReminder campaign={campaign} />);

    await waitFor(() => {
      const compositeKey = buildCampaignReminderCompositeKey(
        TEST_REWARDS_SUBSCRIPTION_ID,
        'cr-notifications',
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        reminderStorageKeyForComposite(compositeKey),
        '1',
      );
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_CAMPAIGN_REMINDER_SUBSCRIBED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not show Notify me when the notifications feature flag is off', async () => {
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(false);
    const campaign = createTestCampaign({ id: 'cr-feature-off' });
    const { queryByTestId } = render(<CampaignReminder campaign={campaign} />);

    await waitFor(() => {
      expect(
        queryByTestId('campaign-reminder-notify-cr-feature-off'),
      ).toBeNull();
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows Notify me CTA when notifications are disabled even if reminder was already stored', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockGetItemSync.mockReturnValue('1');
    const campaign = createTestCampaign({ id: 'cr-re-subscribe' });
    const { getByTestId } = render(<CampaignReminder campaign={campaign} />);

    await waitFor(() => {
      expect(
        getByTestId('campaign-reminder-notify-cr-re-subscribe'),
      ).toBeOnTheScreen();
    });
  });

  it('does not show Notify me CTA when notifications are enabled and reminder is already stored', async () => {
    mockSelectors({ notificationsEnabled: true });
    mockGetItemSync.mockReturnValue('1');
    const campaign = createTestCampaign({ id: 'cr-already-stored' });
    const { queryByTestId } = render(<CampaignReminder campaign={campaign} />);

    await waitFor(() => {
      expect(
        queryByTestId('campaign-reminder-notify-cr-already-stored'),
      ).toBeNull();
    });
  });
});

describe('campaign reminder storage helpers', () => {
  describe('reminderStorageKeyForComposite', () => {
    it('prefixes composite key for isolated MMKV rows', () => {
      expect(reminderStorageKeyForComposite('sub-1:camp-2')).toBe(
        'rewards_campaign_reminder_subscribed::sub-1:camp-2',
      );
    });
  });
});

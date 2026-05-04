import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  buildCampaignReminderCompositeKey,
  reminderStorageKeyForComposite,
  useCampaignReminderActions,
} from './useCampaignReminderActions';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications/constants';

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
const mockGetItemSync = jest.fn((_key: string): string | null => null);
const mockSetItem = jest.fn(
  (_key: string, _value: string): Promise<void> => Promise.resolve(),
);
let mockEnableNotificationsLoading = false;

const TEST_REWARDS_SUBSCRIPTION_ID = 'test-rewards-sub-id';
const TEST_CAMPAIGN_ID = 'test-campaign-id';
const TEST_CAMPAIGN_START_DATE = '2028-07-15T00:00:00.000Z';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: (key: string) => mockGetItemSync(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('./useRewardsToast', () => ({
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
    },
  })),
}));

jest.mock('../../../../util/notifications/hooks/useNotifications', () => ({
  useEnableNotifications: jest.fn(() => ({
    enableNotifications: mockEnableNotifications,
    loading: mockEnableNotificationsLoading,
  })),
}));

jest.mock('../../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign.remind_me_success_toast': 'We will notify you.',
      'rewards.campaign.remind_me_save_error': 'Save failed.',
      'rewards.notifications_nudge.turn_on_button': 'Turn on',
    };
    return translations[key] || key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const createCampaign = (overrides = {}): CampaignDto => ({
  id: TEST_CAMPAIGN_ID,
  type: CampaignType.PERPS_TRADING,
  name: 'Test Campaign',
  startDate: TEST_CAMPAIGN_START_DATE,
  endDate: '2028-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  showUpcomingDate: false,
  ...overrides,
});

function mockSelectors({
  subscriptionId = TEST_REWARDS_SUBSCRIPTION_ID,
  notificationsEnabled = true,
}: {
  subscriptionId?: string | null;
  notificationsEnabled?: boolean;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) {
      return subscriptionId;
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

describe('useCampaignReminderActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableNotifications.mockResolvedValue(undefined);
    mockEnableNotificationsLoading = false;
    mockGetItemSync.mockReturnValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockSelectors();
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);
    mockCreateEventBuilder.mockImplementation(() => {
      const builder = {
        addProperties: jest.fn(),
        build: jest.fn(() => ({ category: 'test-event' })),
      };
      builder.addProperties.mockReturnValue(builder);
      return builder;
    });
  });

  it('shows Remind Me CTA after storage hydration when reminder is enabled', async () => {
    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    await waitFor(() => {
      expect(result.current.showRemindMeCta).toBe(true);
    });
  });

  it('does not show Remind Me CTA when the reminder feature is disabled', async () => {
    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), false),
    );

    await waitFor(() => {
      expect(result.current.showRemindMeCta).toBe(false);
    });
  });

  it('does not show Remind Me CTA when storage already has the reminder', async () => {
    mockGetItemSync.mockReturnValueOnce('1');

    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    await waitFor(() => {
      expect(result.current.showRemindMeCta).toBe(false);
    });
  });

  it('does not show Remind Me CTA when subscription id is missing', async () => {
    mockSelectors({ subscriptionId: null });

    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    await waitFor(() => {
      expect(result.current.showRemindMeCta).toBe(false);
    });
  });

  it('does not show Remind Me CTA when the notifications feature flag is off', async () => {
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    await waitFor(() => {
      expect(result.current.showRemindMeCta).toBe(false);
    });
  });

  it('persists, tracks, and shows success toast when notifications are already enabled', async () => {
    const campaign = createCampaign();
    const { result } = renderHook(() =>
      useCampaignReminderActions(campaign, true),
    );

    await waitFor(() => {
      expect(result.current.showRemindMeCta).toBe(true);
    });

    await act(async () => {
      await result.current.handleRemindMePress();
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      reminderStorageKeyForComposite(
        `${TEST_REWARDS_SUBSCRIPTION_ID}:${TEST_CAMPAIGN_ID}`,
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
      campaign_id: TEST_CAMPAIGN_ID,
      campaign_starts_at: TEST_CAMPAIGN_START_DATE,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ category: 'test-event' });
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        title: 'We will notify you.',
      }),
    );
    expect(result.current.showRemindMeCta).toBe(false);
  });

  it('shows error toast and does not track when reminder storage fails', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    await waitFor(() => {
      expect(result.current.showRemindMeCta).toBe(true);
    });

    await act(async () => {
      await result.current.handleRemindMePress();
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        title: 'Save failed.',
      }),
    );
    expect(result.current.showRemindMeCta).toBe(true);
  });

  it('prompts for notifications and defers subscription until notifications are enabled', async () => {
    let notificationsEnabled = false;
    mockSelectors({ notificationsEnabled });
    const campaign = createCampaign();
    const { result, rerender } = renderHook(() =>
      useCampaignReminderActions(campaign, true),
    );

    await waitFor(() => {
      expect(result.current.showRemindMeCta).toBe(true);
    });

    await act(async () => {
      await result.current.handleRemindMePress();
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
    rerender();

    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        reminderStorageKeyForComposite(
          `${TEST_REWARDS_SUBSCRIPTION_ID}:${TEST_CAMPAIGN_ID}`,
        ),
        '1',
      );
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});

describe('campaign reminder storage helpers', () => {
  describe('buildCampaignReminderCompositeKey', () => {
    it('joins subscription and campaign with colon', () => {
      expect(buildCampaignReminderCompositeKey('sub-1', 'camp-2')).toBe(
        'sub-1:camp-2',
      );
    });
  });

  describe('reminderStorageKeyForComposite', () => {
    it('prefixes composite key for isolated MMKV rows', () => {
      expect(reminderStorageKeyForComposite('sub-1:camp-2')).toBe(
        'rewards_campaign_reminder_subscribed::sub-1:camp-2',
      );
    });
  });
});

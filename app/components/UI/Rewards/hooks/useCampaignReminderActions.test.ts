import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import {
  buildCampaignReminderCompositeKey,
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
import { subscribeCampaignReminder } from '../../../../reducers/rewards';
import { selectSubscribedCampaignReminders } from '../../../../reducers/rewards/selectors';

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
const mockDispatch = jest.fn();
let mockEnableNotificationsLoading = false;
let mockSubscribedCampaignReminders: Record<string, boolean> = {};

const TEST_REWARDS_SUBSCRIPTION_ID = 'test-rewards-sub-id';
const TEST_CAMPAIGN_ID = 'test-campaign-id';
const TEST_CAMPAIGN_START_DATE = '2028-07-15T00:00:00.000Z';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
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
      loading: jest.fn((title: string, subtitle?: string) => ({
        variant: 'loading',
        title,
        subtitle,
      })),
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
      'rewards.notifications_nudge.turn_on_button': 'Turn on',
    };
    return translations[key] || key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

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
  subscribedCampaignReminders = mockSubscribedCampaignReminders,
}: {
  subscriptionId?: string | null;
  notificationsEnabled?: boolean;
  subscribedCampaignReminders?: Record<string, boolean>;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) {
      return subscriptionId;
    }
    if (selector === selectSubscribedCampaignReminders) {
      return subscribedCampaignReminders;
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
    mockSubscribedCampaignReminders = {};
    mockUseDispatch.mockReturnValue(mockDispatch);
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

  it('shows Remind Me CTA when reminder is enabled and not yet subscribed', () => {
    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    expect(result.current.showRemindMeCta).toBe(true);
  });

  it('does not show Remind Me CTA when the reminder feature is disabled', () => {
    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), false),
    );

    expect(result.current.showRemindMeCta).toBe(false);
  });

  it('does not show Remind Me CTA when Redux already has the reminder subscription', () => {
    mockSubscribedCampaignReminders = {
      [`${TEST_REWARDS_SUBSCRIPTION_ID}:${TEST_CAMPAIGN_ID}`]: true,
    };
    mockSelectors({
      subscribedCampaignReminders: mockSubscribedCampaignReminders,
    });

    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    expect(result.current.showRemindMeCta).toBe(false);
  });

  it('does not show Remind Me CTA when subscription id is missing', () => {
    mockSelectors({ subscriptionId: null });

    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    expect(result.current.showRemindMeCta).toBe(false);
  });

  it('shows Remind Me CTA when notifications are disabled even if reminder is already subscribed', () => {
    mockSubscribedCampaignReminders = {
      [`${TEST_REWARDS_SUBSCRIPTION_ID}:${TEST_CAMPAIGN_ID}`]: true,
    };
    mockSelectors({
      notificationsEnabled: false,
      subscribedCampaignReminders: mockSubscribedCampaignReminders,
    });

    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    expect(result.current.showRemindMeCta).toBe(true);
  });

  it('does not show Remind Me CTA when notifications are enabled and reminder is already subscribed', () => {
    mockSubscribedCampaignReminders = {
      [`${TEST_REWARDS_SUBSCRIPTION_ID}:${TEST_CAMPAIGN_ID}`]: true,
    };
    mockSelectors({
      notificationsEnabled: true,
      subscribedCampaignReminders: mockSubscribedCampaignReminders,
    });

    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    expect(result.current.showRemindMeCta).toBe(false);
  });

  it('does not show Remind Me CTA when the notifications feature flag is off', () => {
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCampaignReminderActions(createCampaign(), true),
    );

    expect(result.current.showRemindMeCta).toBe(false);
  });

  it('dispatches subscribe action, tracks, and shows success toast when notifications are already enabled', async () => {
    const campaign = createCampaign();
    const { result } = renderHook(() =>
      useCampaignReminderActions(campaign, true),
    );

    expect(result.current.showRemindMeCta).toBe(true);

    await act(async () => {
      await result.current.handleRemindMePress();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      subscribeCampaignReminder({
        subscriptionId: TEST_REWARDS_SUBSCRIPTION_ID,
        campaignId: TEST_CAMPAIGN_ID,
      }),
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
  });

  it('prompts for notifications and defers subscription until notifications are enabled', async () => {
    let notificationsEnabled = false;
    mockSelectors({ notificationsEnabled });
    const campaign = createCampaign();
    const { result, rerender } = renderHook(() =>
      useCampaignReminderActions(campaign, true),
    );

    expect(result.current.showRemindMeCta).toBe(true);

    await act(async () => {
      await result.current.handleRemindMePress();
    });

    expect(mockEnableNotificationsNudge).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Turn on',
        onPress: expect.any(Function),
      }),
    );
    expect(mockDispatch).not.toHaveBeenCalled();
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

    expect(mockDispatch).toHaveBeenCalledWith(
      subscribeCampaignReminder({
        subscriptionId: TEST_REWARDS_SUBSCRIPTION_ID,
        campaignId: TEST_CAMPAIGN_ID,
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});

describe('buildCampaignReminderCompositeKey', () => {
  it('joins subscription and campaign with colon', () => {
    expect(buildCampaignReminderCompositeKey('sub-1', 'camp-2')).toBe(
      'sub-1:camp-2',
    );
  });
});

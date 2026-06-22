import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import type { INotification } from '@metamask/notification-services-controller/notification-services';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import {
  getPreferenceSectionForNotification,
  isNotificationSuppressedByPreferences,
} from './notification-preference-filter';
import Engine from '../../../Engine';

jest.mock('../../../Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

const mockControllerMessengerCall = jest.mocked(Engine.controllerMessenger.call);

/**
 * Helper to create a minimal INotification with the given type and optional data.
 */
function createMockNotification(
  type: TRIGGER_TYPES,
  data?: Record<string, unknown>,
): INotification {
  return {
    id: 'test-notification-id',
    type,
    data: data ?? {},
    createdAt: new Date().toISOString(),
    isRead: false,
  } as unknown as INotification;
}

/**
 * Helper to create mock NotificationPreferences.
 */
function createMockPreferences(
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences {
  return {
    walletActivity: {
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    },
    perps: {
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    },
    socialAI: {
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
      txAmountLimit: 100,
      mutedTraderProfileIds: [],
    },
    marketing: {
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    },
    ...overrides,
  } as NotificationPreferences;
}

describe('notification-preference-filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferenceSectionForNotification', () => {
    it.each([
      [TRIGGER_TYPES.ERC20_SENT, 'walletActivity'],
      [TRIGGER_TYPES.ERC20_RECEIVED, 'walletActivity'],
      [TRIGGER_TYPES.ERC721_SENT, 'walletActivity'],
      [TRIGGER_TYPES.ERC721_RECEIVED, 'walletActivity'],
      [TRIGGER_TYPES.ERC1155_SENT, 'walletActivity'],
      [TRIGGER_TYPES.ERC1155_RECEIVED, 'walletActivity'],
      [TRIGGER_TYPES.ETH_SENT, 'walletActivity'],
      [TRIGGER_TYPES.ETH_RECEIVED, 'walletActivity'],
      [TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED, 'walletActivity'],
      [TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED, 'walletActivity'],
      [TRIGGER_TYPES.LIDO_STAKE_COMPLETED, 'walletActivity'],
      [TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED, 'walletActivity'],
      [TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED, 'walletActivity'],
      [TRIGGER_TYPES.METAMASK_SWAP_COMPLETED, 'walletActivity'],
      [TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN, 'walletActivity'],
    ])(
      'maps on-chain trigger type %s to %s',
      (triggerType, expectedSection) => {
        const notification = createMockNotification(triggerType);
        expect(getPreferenceSectionForNotification(notification)).toBe(
          expectedSection,
        );
      },
    );

    it.each([
      'position_liquidated',
      'stop_loss_executed',
      'stop_loss_triggered',
      'take_profit_executed',
      'take_profit_triggered',
      'limit_order_filled',
    ])(
      'maps PLATFORM notification with perps kind "%s" to perps',
      (kind) => {
        const notification = createMockNotification(TRIGGER_TYPES.PLATFORM, {
          kind,
        });
        expect(getPreferenceSectionForNotification(notification)).toBe('perps');
      },
    );

    it.each([
      'social_trade',
      'trader_trade',
      'followed_trader_trade',
    ])(
      'maps PLATFORM notification with socialAI kind "%s" to socialAI',
      (kind) => {
        const notification = createMockNotification(TRIGGER_TYPES.PLATFORM, {
          kind,
        });
        expect(getPreferenceSectionForNotification(notification)).toBe(
          'socialAI',
        );
      },
    );

    it('returns null for PLATFORM notification with unknown kind', () => {
      const notification = createMockNotification(TRIGGER_TYPES.PLATFORM, {
        kind: 'unknown_kind',
      });
      expect(getPreferenceSectionForNotification(notification)).toBeNull();
    });

    it('returns null for PLATFORM notification with no kind', () => {
      const notification = createMockNotification(TRIGGER_TYPES.PLATFORM);
      expect(getPreferenceSectionForNotification(notification)).toBeNull();
    });

    it('returns null for FEATURES_ANNOUNCEMENT', () => {
      const notification = createMockNotification(
        TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
      );
      expect(getPreferenceSectionForNotification(notification)).toBeNull();
    });

    it('extracts kind from nested metadata object', () => {
      const notification = createMockNotification(TRIGGER_TYPES.PLATFORM, {
        metadata: { kind: 'take_profit_executed' },
      });
      expect(getPreferenceSectionForNotification(notification)).toBe('perps');
    });
  });

  describe('isNotificationSuppressedByPreferences', () => {
    it('returns false when preferences are not available', async () => {
      mockControllerMessengerCall.mockResolvedValue(null as never);

      const notification = createMockNotification(TRIGGER_TYPES.ETH_SENT);
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(false);
    });

    it('returns false when preferences fetch throws', async () => {
      mockControllerMessengerCall.mockRejectedValue(
        new Error('fetch failed'),
      );

      const notification = createMockNotification(TRIGGER_TYPES.ETH_SENT);
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(false);
    });

    it('returns false when section push notifications are enabled', async () => {
      const preferences = createMockPreferences();
      mockControllerMessengerCall.mockResolvedValue(preferences as never);

      const notification = createMockNotification(TRIGGER_TYPES.ETH_SENT);
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(false);
    });

    it('returns true when walletActivity push notifications are disabled', async () => {
      const preferences = createMockPreferences({
        walletActivity: {
          pushNotificationsEnabled: false,
          inAppNotificationsEnabled: true,
        },
      });
      mockControllerMessengerCall.mockResolvedValue(preferences as never);

      const notification = createMockNotification(TRIGGER_TYPES.ETH_SENT);
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(true);
    });

    it('returns true when perps push notifications are disabled', async () => {
      const preferences = createMockPreferences({
        perps: {
          pushNotificationsEnabled: false,
          inAppNotificationsEnabled: true,
        },
      });
      mockControllerMessengerCall.mockResolvedValue(preferences as never);

      const notification = createMockNotification(TRIGGER_TYPES.PLATFORM, {
        kind: 'take_profit_executed',
      });
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(true);
    });

    it('returns true when socialAI push notifications are disabled', async () => {
      const preferences = createMockPreferences({
        socialAI: {
          pushNotificationsEnabled: false,
          inAppNotificationsEnabled: true,
          txAmountLimit: 100,
          mutedTraderProfileIds: [],
        },
      });
      mockControllerMessengerCall.mockResolvedValue(preferences as never);

      const notification = createMockNotification(TRIGGER_TYPES.PLATFORM, {
        kind: 'social_trade',
      });
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(true);
    });

    it('returns true when the specific trader is muted', async () => {
      const preferences = createMockPreferences({
        socialAI: {
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: true,
          txAmountLimit: 100,
          mutedTraderProfileIds: ['trader-123'],
        },
      });
      mockControllerMessengerCall.mockResolvedValue(preferences as never);

      const notification = createMockNotification(TRIGGER_TYPES.PLATFORM, {
        kind: 'social_trade',
        traderId: 'trader-123',
      });
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(true);
    });

    it('returns false when a different trader is muted', async () => {
      const preferences = createMockPreferences({
        socialAI: {
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: true,
          txAmountLimit: 100,
          mutedTraderProfileIds: ['trader-456'],
        },
      });
      mockControllerMessengerCall.mockResolvedValue(preferences as never);

      const notification = createMockNotification(TRIGGER_TYPES.PLATFORM, {
        kind: 'social_trade',
        traderId: 'trader-123',
      });
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(false);
    });

    it('returns false for unknown notification types (safe fallback)', async () => {
      const preferences = createMockPreferences();
      mockControllerMessengerCall.mockResolvedValue(preferences as never);

      const notification = createMockNotification(
        TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
      );
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(false);
    });

    it('supports trader_id field in addition to traderId', async () => {
      const preferences = createMockPreferences({
        socialAI: {
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: true,
          txAmountLimit: 100,
          mutedTraderProfileIds: ['trader-789'],
        },
      });
      mockControllerMessengerCall.mockResolvedValue(preferences as never);

      const notification = createMockNotification(TRIGGER_TYPES.PLATFORM, {
        kind: 'social_trade',
        trader_id: 'trader-789',
      });
      const result =
        await isNotificationSuppressedByPreferences(notification);
      expect(result).toBe(true);
    });
  });
});

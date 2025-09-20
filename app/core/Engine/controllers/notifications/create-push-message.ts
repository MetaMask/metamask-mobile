import {
  type TranslationKeys,
  createOnChainPushNotificationMessage,
} from '@metamask/notification-services-controller/push-services';
import type { INotification } from '@metamask/notification-services-controller/notification-services';
import { strings } from '../../../../../locales/i18n';
import type Translations from '../../../../../locales/languages/en.json';

type NotificationTranslations = (typeof Translations)['notifications'];
type FlattenToString<TObj> = {
  [K in keyof TObj]: TObj[K] extends string
    ? `${K & string}`
    : `${K & string}.${FlattenToString<TObj[K]>}`;
}[keyof TObj];

type NotificationStrings =
  `notifications.${FlattenToString<NotificationTranslations>}`;

const t = (name: NotificationStrings, params?: object) =>
  strings(name, params) ?? '';

const walletTranslations: TranslationKeys = {
  pushPlatformNotificationsFundsSentTitle: () =>
    t('notifications.push_notification_content.funds_sent_title'),
  pushPlatformNotificationsFundsSentDescriptionDefault: () =>
    t('notifications.push_notification_content.funds_sent_default_description'),
  pushPlatformNotificationsFundsSentDescription: (amount, symbol) =>
    t('notifications.push_notification_content.funds_sent_description', {
      amount,
      symbol,
    }),
  pushPlatformNotificationsFundsReceivedTitle: () =>
    t('notifications.push_notification_content.funds_received_title'),
  pushPlatformNotificationsFundsReceivedDescriptionDefault: () =>
    t(
      'notifications.push_notification_content.funds_received_default_description',
    ),
  pushPlatformNotificationsFundsReceivedDescription: (amount, symbol) =>
    t('notifications.push_notification_content.funds_received_description', {
      amount,
      symbol,
    }),
  pushPlatformNotificationsSwapCompletedTitle: () =>
    t('notifications.metamask_swap_completed_title'),
  pushPlatformNotificationsSwapCompletedDescription: () =>
    t(
      'notifications.push_notification_content.metamask_swap_completed_description',
    ),
  pushPlatformNotificationsNftSentTitle: () =>
    t('notifications.push_notification_content.nft_sent_title'),
  pushPlatformNotificationsNftSentDescription: () =>
    t('notifications.push_notification_content.nft_sent_description'),
  pushPlatformNotificationsNftReceivedTitle: () =>
    t('notifications.push_notification_content.nft_received_title'),
  pushPlatformNotificationsNftReceivedDescription: () =>
    t('notifications.push_notification_content.nft_received_description'),
  pushPlatformNotificationsStakingRocketpoolStakeCompletedTitle: () =>
    t('notifications.rocketpool_stake_completed_title'),
  pushPlatformNotificationsStakingRocketpoolStakeCompletedDescription: () =>
    t(
      'notifications.push_notification_content.rocketpool_stake_completed_description',
    ),
  pushPlatformNotificationsStakingRocketpoolUnstakeCompletedTitle: () =>
    t('notifications.rocketpool_unstake_completed_title'),
  pushPlatformNotificationsStakingRocketpoolUnstakeCompletedDescription: () =>
    t(
      'notifications.push_notification_content.rocketpool_unstake_completed_description',
    ),
  pushPlatformNotificationsStakingLidoStakeCompletedTitle: () =>
    t('notifications.lido_stake_completed_title'),
  pushPlatformNotificationsStakingLidoStakeCompletedDescription: () =>
    t(
      'notifications.push_notification_content.lido_stake_completed_description',
    ),
  pushPlatformNotificationsStakingLidoStakeReadyToBeWithdrawnTitle: () =>
    t('notifications.lido_stake_ready_to_be_withdrawn_title'),
  pushPlatformNotificationsStakingLidoStakeReadyToBeWithdrawnDescription: () =>
    t(
      'notifications.push_notification_content.lido_stake_ready_to_be_withdrawn_description',
    ),
  pushPlatformNotificationsStakingLidoWithdrawalRequestedTitle: () =>
    t('notifications.lido_withdrawal_requested_title'),
  pushPlatformNotificationsStakingLidoWithdrawalRequestedDescription: () =>
    t(
      'notifications.push_notification_content.lido_withdrawal_requested_description',
    ),
  pushPlatformNotificationsStakingLidoWithdrawalCompletedTitle: () =>
    t('notifications.lido_withdrawal_completed_title'),
  pushPlatformNotificationsStakingLidoWithdrawalCompletedDescription: () =>
    t(
      'notifications.push_notification_content.lido_withdrawal_completed_description',
    ),
};

const perpTranslations = {
  perpsPositionLiquidatedTitle: () =>
    t(
      'notifications.push_notification_content.perps_position_liquidated_title',
    ),
  perpsPositionLiquidatedDescriptionLong: (symbol: string) =>
    t(
      'notifications.push_notification_content.perps_position_liquidated_description_long',
      {
        symbol,
      },
    ),
  perpsPositionLiquidatedDescriptionShort: (symbol: string) =>
    t(
      'notifications.push_notification_content.perps_position_liquidated_description_short',
      {
        symbol,
      },
    ),
  perpsStopLossTriggeredTitle: () =>
    t(
      'notifications.push_notification_content.perps_stop_loss_triggered_title',
    ),
  perpsStopLossTriggeredDescriptionLong: (symbol: string) =>
    t(
      'notifications.push_notification_content.perps_stop_loss_triggered_description_long',
      {
        symbol,
      },
    ),
  perpsStopLossTriggeredDescriptionShort: (symbol: string) =>
    t(
      'notifications.push_notification_content.perps_stop_loss_triggered_description_short',
      {
        symbol,
      },
    ),
  perpsLimitOrderFilledTitle: () =>
    t('notifications.push_notification_content.perps_limit_order_filled_title'),
  perpsLimitOrderFilledDescriptionLong: (symbol: string) =>
    t(
      'notifications.push_notification_content.perps_limit_order_filled_description_long',
      {
        symbol,
      },
    ),
  perpsLimitOrderFilledDescriptionShort: (symbol: string) =>
    t(
      'notifications.push_notification_content.perps_limit_order_filled_description_short',
      {
        symbol,
      },
    ),
  perpsTakeProfitTriggeredTitle: () =>
    t(
      'notifications.push_notification_content.perps_take_profit_triggered_title',
    ),
  perpsTakeProfitTriggeredDescriptionLong: (symbol: string) =>
    t(
      'notifications.push_notification_content.perps_take_profit_triggered_description_long',
      {
        symbol,
      },
    ),
  perpsTakeProfitTriggeredDescriptionShort: (symbol: string) =>
    t(
      'notifications.push_notification_content.perps_take_profit_triggered_description_short',
      {
        symbol,
      },
    ),
};

const translations = {
  ...walletTranslations,
  ...perpTranslations,
};

export function createNotificationMessage(notification: INotification) {
  return createOnChainPushNotificationMessage(notification, translations);
}

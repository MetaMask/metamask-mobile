import type { SolanaPayStatus } from '@metamask/transaction-pay-controller';
import Engine from '../../Engine';
import Logger from '../../../../util/Logger';
import NotificationManager from '../../../NotificationManager';
import { strings } from '../../../../../locales/i18n';

let activeRecovery: Promise<unknown> | undefined;
const unavailableNotificationIds = new Set<string>();

function showRecoveredStatusNotifications(
  statuses: Record<string, SolanaPayStatus>,
): void {
  for (const [transactionId, status] of Object.entries(statuses)) {
    if (
      status.outcome.type !== 'unknown' ||
      unavailableNotificationIds.has(transactionId)
    ) {
      continue;
    }

    unavailableNotificationIds.add(transactionId);
    NotificationManager.showSimpleNotification({
      title: strings('confirm.solana_pay.status_unavailable'),
      status: 'pending',
    });
  }
}

/**
 * Reconciles persisted Solana Pay intents without ever starting a new source
 * submission. Concurrent app-open events share the same Core recovery loop.
 */
export function recoverSolanaPayTransactions(): Promise<unknown> {
  if (activeRecovery) {
    return activeRecovery;
  }

  activeRecovery =
    Engine.context.TransactionPayController.recoverSolanaPay().then(
      (result) => {
        activeRecovery = undefined;
        showRecoveredStatusNotifications(result);
        return result;
      },
      (error) => {
        activeRecovery = undefined;
        Logger.error(
          error as Error,
          'Failed to recover Solana Pay transactions',
        );
      },
    );

  return activeRecovery;
}

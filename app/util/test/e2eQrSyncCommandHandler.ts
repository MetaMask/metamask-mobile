import { E2ECommandTypes } from '../../../tests/framework/types';
import Engine from '../../core/Engine';
import Logger from '../Logger';

/**
 * Dispatches QR sync E2E commands to QrSyncController.
 * Used when Appium deep links do not reliably reach RN Linking.
 */
export function dispatchQrSyncCommand(item: {
  type: string;
  args: Record<string, unknown>;
}): void {
  if (item.type !== E2ECommandTypes.applyQrSyncSyncReady) {
    return;
  }

  try {
    const controller = Engine.context.QrSyncController;
    if (!controller) {
      Logger.error(
        new Error('QrSyncController unavailable'),
        'E2E QR Sync command apply-qr-sync-sync-ready',
      );
      return;
    }

    controller.applyTestSyncReadyPayload({
      mnemonic:
        typeof item.args.mnemonic === 'string' ? item.args.mnemonic : '',
      isPrimary:
        item.args.isPrimary === undefined ? true : Boolean(item.args.isPrimary),
      walletName:
        typeof item.args.walletName === 'string'
          ? item.args.walletName
          : undefined,
      accountName:
        typeof item.args.accountName === 'string'
          ? item.args.accountName
          : undefined,
    });
  } catch (error) {
    Logger.error(
      error as Error,
      'E2E QR Sync command apply-qr-sync-sync-ready failed',
    );
  }
}

import { NativeModules } from 'react-native';
import Logger from '../../util/Logger';
import { hasTestOverrides } from '../../util/test/utils';
import {
  type BrazePushOperationContext,
  clearPendingBrazePushUnregistration,
  ensureBrazePushUnregistrationDesired,
  hasPendingBrazePushUnregistrationSync,
  markBrazePushUnregistrationPending,
  runLatestBrazePushOperation,
} from './pushRegistrationState';

interface BrazePushNativeModule {
  unregisterPush: () => Promise<BrazePushUnregistrationResult>;
}

interface BrazePushUnregistrationResult {
  success: boolean;
  message?: string;
  isRetriable?: boolean;
  httpStatusCode?: number;
}

const nativeModules = NativeModules as {
  BrazePushModule?: BrazePushNativeModule;
};

const UNREGISTER_OPERATION_KEY = 'unregister';

export class BrazePushUnregistrationError extends Error {
  readonly isRetriable: boolean;

  readonly httpStatusCode?: number;

  constructor({
    message,
    isRetriable,
    httpStatusCode,
  }: {
    message: string;
    isRetriable: boolean;
    httpStatusCode?: number;
  }) {
    super(message);
    this.name = 'BrazePushUnregistrationError';
    this.isRetriable = isRetriable;
    this.httpStatusCode = httpStatusCode;
  }
}

const toError = (error: unknown): Error =>
  error instanceof Error
    ? error
    : new Error(
        typeof error === 'string' ? error : 'Failed to unregister Braze push',
      );

async function unregisterOnce(): Promise<void> {
  const brazePushModule = nativeModules.BrazePushModule;
  if (!brazePushModule) {
    throw new Error('BrazePushModule is not available');
  }

  const result = await brazePushModule.unregisterPush();
  if (result.success) {
    return;
  }

  throw new BrazePushUnregistrationError({
    message: result.message ?? 'Failed to unregister Braze push',
    isRetriable: result.isRetriable === true,
    ...(result.httpStatusCode === undefined
      ? {}
      : { httpStatusCode: result.httpStatusCode }),
  });
}

async function attemptPendingUnregistration({
  context,
}: {
  context: BrazePushOperationContext;
}): Promise<boolean> {
  if (!hasPendingBrazePushUnregistrationSync()) {
    Logger.log(
      '[Braze] Unregistration attempt skipped: pending marker already cleared',
    );
    return true;
  }
  if (!context.isCurrent()) {
    Logger.log(
      '[Braze] Unregistration attempt superseded by a newer push operation',
    );
    return false;
  }

  try {
    await unregisterOnce();
    await clearPendingBrazePushUnregistration();
    Logger.log('[Braze] Unregistered this device from Braze push');
    return true;
  } catch (nativeError) {
    const error = toError(nativeError);
    const isRetriable =
      error instanceof BrazePushUnregistrationError && error.isRetriable;

    Logger.log(
      '[Braze] Unregistration attempt failed',
      JSON.stringify({
        retriable: isRetriable,
        httpStatusCode:
          error instanceof BrazePushUnregistrationError
            ? error.httpStatusCode
            : undefined,
        message: error.message,
        current: context.isCurrent(),
      }),
    );

    if (!context.isCurrent()) {
      Logger.log(
        '[Braze] Unregistration attempt superseded; pending marker preserved for the newer request',
      );
      return false;
    }
    if (!isRetriable) {
      Logger.error(
        error,
        '[Braze] Push unregistration reported a non-retriable failure',
      );
    }

    Logger.log(
      '[Braze] Push unregistration remains pending until the next session',
    );
    return false;
  }
}

/**
 * Unregister this device from Braze push before disabling NaaP push.
 *
 * Failures remain persisted for the next app session, allowing the local
 * notification preference to turn off without losing the device-scoped
 * consent intent.
 *
 * @returns Whether Braze confirmed unregistration during this call.
 */
export async function unregisterBrazePush(): Promise<boolean> {
  if (hasTestOverrides) {
    return true;
  }

  try {
    return await runLatestBrazePushOperation({
      key: UNREGISTER_OPERATION_KEY,
      supersededResult: false,
      operation: async (context) => {
        await markBrazePushUnregistrationPending();
        return attemptPendingUnregistration({ context });
      },
    });
  } catch (nativeError) {
    const error = toError(nativeError);
    Logger.error(error, '[Braze] Failed to unregister push');
    Logger.log(
      '[Braze] Push unregistration intent remains pending after failure',
    );
    return false;
  }
}

/**
 * Retry a previously persisted Braze push unregistration.
 *
 * The pending marker is retained on failure so the next app launch can try
 * again.
 *
 * @returns Whether no unregistration remains pending.
 */
export async function retryPendingBrazePushUnregistration(): Promise<boolean> {
  if (hasTestOverrides || !hasPendingBrazePushUnregistrationSync()) {
    return true;
  }

  Logger.log(
    '[Braze] Retrying pending push unregistration left by a previous session',
  );

  try {
    return await runLatestBrazePushOperation({
      key: UNREGISTER_OPERATION_KEY,
      supersededResult: false,
      operation: async (context) => {
        await ensureBrazePushUnregistrationDesired();
        return attemptPendingUnregistration({ context });
      },
    });
  } catch (nativeError) {
    const error = toError(nativeError);
    Logger.error(error, '[Braze] Failed to retry push unregistration');
    return false;
  }
}

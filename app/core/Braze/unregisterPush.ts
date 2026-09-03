import { NativeModules } from 'react-native';
import Logger from '../../util/Logger';
import { hasTestOverrides } from '../../util/test/utils';

export const BRAZE_UNREGISTER_PUSH_FAILURE_CODES = [
  'SDK_UNAVAILABLE',
  'SDK_DISABLED',
  'NO_PUSH_TOKEN',
  'RATE_LIMITED',
  'SDK_DEALLOCATED',
  'REQUEST_FAILED',
  'UNKNOWN',
] as const;

export type BrazeUnregisterPushFailureCode =
  (typeof BRAZE_UNREGISTER_PUSH_FAILURE_CODES)[number];

export type BrazeUnregisterPushResult =
  | { success: true }
  | {
      success: false;
      isRetriable: boolean;
      code: BrazeUnregisterPushFailureCode;
      message: string;
    };

interface NativeUnregisterPushResult {
  success?: boolean;
  isRetriable?: boolean;
  code?: string;
  message?: string;
}

const nativeModules = NativeModules as {
  BrazePushModule?: {
    unregisterPush: () => Promise<NativeUnregisterPushResult>;
  };
};

function isFailureCode(code: string): code is BrazeUnregisterPushFailureCode {
  return (BRAZE_UNREGISTER_PUSH_FAILURE_CODES as readonly string[]).includes(
    code,
  );
}

/**
 * Braze iOS reports a local "no token" check as `requestFailed` rather than
 * `noPushToken`. Treat that as already unregistered.
 */
function isNoPushTokenMessage(message: string): boolean {
  return /no push token/iu.test(message);
}

function normalizeResult(
  result: NativeUnregisterPushResult | null | undefined,
): BrazeUnregisterPushResult {
  if (result?.success === true) {
    return { success: true };
  }

  const message = result?.message ?? 'Braze push unregister failed';
  if (isNoPushTokenMessage(message)) {
    return {
      success: false,
      isRetriable: false,
      code: 'NO_PUSH_TOKEN',
      message,
    };
  }

  const code = result?.code;
  return {
    success: false,
    isRetriable: result?.isRetriable === true,
    code: code && isFailureCode(code) ? code : 'UNKNOWN',
    message,
  };
}

const ALREADY_UNREGISTERED_CODES: ReadonlySet<BrazeUnregisterPushFailureCode> =
  new Set(['NO_PUSH_TOKEN', 'SDK_UNAVAILABLE', 'SDK_DISABLED']);

/**
 * Whether this device is not registered for Braze push (success, or a
 * non-registered state such as no stored token).
 */
export function isBrazePushUnregistered(
  result: BrazeUnregisterPushResult,
): boolean {
  if (result.success) {
    return true;
  }

  return ALREADY_UNREGISTERED_CODES.has(result.code);
}

/**
 * Ask Braze to unregister this device's push token via the native SDK.
 *
 * Resolves a result object instead of throwing so callers can inspect
 * `isRetriable` without depending on platform-specific RN error shapes.
 * Does not change MetaMask's in-app Notifications preference.
 */
export async function unregisterBrazePush(): Promise<BrazeUnregisterPushResult> {
  if (hasTestOverrides) {
    return { success: true };
  }

  const brazePushModule = nativeModules.BrazePushModule;
  if (!brazePushModule?.unregisterPush) {
    const unavailable: BrazeUnregisterPushResult = {
      success: false,
      isRetriable: false,
      code: 'SDK_UNAVAILABLE',
      message: 'BrazePushModule is not available',
    };
    Logger.error(
      new Error(unavailable.message),
      '[Braze] Native unregisterPush module is missing',
    );
    return unavailable;
  }

  try {
    const result = normalizeResult(await brazePushModule.unregisterPush());
    if (result.success) {
      Logger.log('[Braze] Unregistered this device from Braze push');
    } else if (isBrazePushUnregistered(result)) {
      Logger.log(
        `[Braze] Push already unregistered code=${result.code} ${result.message}`,
      );
    } else {
      Logger.error(
        new Error(result.message),
        `[Braze] unregisterPush failed code=${result.code} isRetriable=${result.isRetriable}`,
      );
    }
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Braze push unregister failed';
    Logger.error(error as Error, '[Braze] unregisterPush threw');
    return {
      success: false,
      isRetriable: false,
      code: 'UNKNOWN',
      message,
    };
  }
}

/**
 * Unregister this device from Braze push, throwing when Braze still holds a
 * token (so callers do not delete the FCM token or flip the in-app toggle).
 */
export async function assertBrazePushUnregistered(): Promise<void> {
  const result = await unregisterBrazePush();
  if (result.success || ALREADY_UNREGISTERED_CODES.has(result.code)) {
    return;
  }

  throw new Error(
    `Failed to unregister Braze push: ${result.code} ${result.message}`,
  );
}

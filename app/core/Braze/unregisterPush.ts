import { NativeModules } from 'react-native';
import Logger from '../../util/Logger';
import { hasTestOverrides } from '../../util/test/utils';
import {
  hasPendingBrazePushUnregistrationSync,
  markBrazePushUnregistrationPending,
  markBrazePushUnregistered,
} from './pushRegistrationState';

interface BrazePushNativeModule {
  unregisterPush: () => Promise<BrazePushUnregistrationResult>;
}

interface BrazePushUnregistrationResult {
  success: boolean;
  message?: string;
}

const nativeModules = NativeModules as {
  BrazePushModule?: BrazePushNativeModule;
};

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

  throw new Error(result.message ?? 'Failed to unregister Braze push');
}

async function attemptPendingUnregistration(): Promise<boolean> {
  if (!hasPendingBrazePushUnregistrationSync()) {
    return true;
  }

  try {
    await unregisterOnce();
    await markBrazePushUnregistered();
    return true;
  } catch (nativeError) {
    const error = toError(nativeError);
    Logger.error(error, '[Braze] Push unregistration remains pending');
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
    await markBrazePushUnregistrationPending();
    return await attemptPendingUnregistration();
  } catch (nativeError) {
    const error = toError(nativeError);
    Logger.error(error, '[Braze] Failed to unregister push');
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

  return attemptPendingUnregistration();
}

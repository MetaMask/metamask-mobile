import { showAlert } from '../../actions/alert';
import ReduxService from '../../core/redux/ReduxService';
import { strings } from '../../../locales/i18n';
import Logger from '../Logger';

const sessionState = {
  sentryReported: false,
  alertShown: false,
};

const DISK_SPACE_PATTERNS = [
  /out of space/i,
  /no space left on device/i,
  /NSCocoaErrorDomain Code=640/i,
  /NSPOSIXErrorDomain Code=28/i,
];

/**
 * Returns true when an error indicates the device filesystem is out of space.
 */
export function isDiskSpaceError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return DISK_SPACE_PATTERNS.some((pattern) => pattern.test(message));
}

function showStorageFullAlert(): void {
  if (sessionState.alertShown) {
    return;
  }

  sessionState.alertShown = true;

  try {
    ReduxService.store.dispatch(
      showAlert({
        isVisible: true,
        autodismiss: null,
        content: 'storage-full-alert',
        data: {
          msg: strings('storage.device_full_alert'),
        },
      }),
    );
  } catch {
    // Store may not be initialized yet during early persist failures.
  }
}

export interface DiskSpaceStorageErrorContext {
  message: string;
  key?: string;
  source?: string;
}

/**
 * Handles filesystem persist failures. Disk-full errors are deduplicated to one
 * Sentry report and one user alert per app session; other errors are logged normally.
 */
export function reportStorageWriteError(
  error: Error,
  context: DiskSpaceStorageErrorContext,
): void {
  if (!isDiskSpaceError(error)) {
    Logger.error(error, { message: context.message });
    return;
  }

  showStorageFullAlert();

  if (sessionState.sentryReported) {
    return;
  }

  sessionState.sentryReported = true;

  Logger.error(error, {
    tags: {
      error_category: 'disk_full',
      ...(context.source ? { storage_source: context.source } : {}),
    },
    extras: {
      key: context.key,
      message: context.message,
    },
    message: 'Device storage full — persist writes failing',
  });
}

/** Resets session state. For unit tests only. */
export function resetDiskSpaceErrorSessionStateForTesting(): void {
  sessionState.sentryReported = false;
  sessionState.alertShown = false;
}

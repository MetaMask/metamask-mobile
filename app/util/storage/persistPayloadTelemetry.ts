import { addBreadcrumb } from '@sentry/react-native';
import Logger from '../Logger';

/** Warn when a single persist payload exceeds 512 KB. */
export const PERSIST_PAYLOAD_WARN_BYTES = 512 * 1024;

/**
 * Records persist payload size for debugging storage growth. Large payloads are
 * logged locally and added as a Sentry breadcrumb when metrics consent is enabled.
 */
export function trackPersistPayloadSize(
  key: string,
  serializedValue: string,
): void {
  const sizeBytes = serializedValue.length;

  if (sizeBytes < PERSIST_PAYLOAD_WARN_BYTES) {
    return;
  }

  Logger.log(
    `Large persist payload for ${key}: ${sizeBytes} bytes (${Math.round(sizeBytes / 1024)} KB)`,
  );

  addBreadcrumb({
    category: 'persist_storage',
    message: `Large persist payload: ${key}`,
    level: 'warning',
    data: {
      key,
      sizeBytes,
      sizeKb: Math.round(sizeBytes / 1024),
    },
  });
}

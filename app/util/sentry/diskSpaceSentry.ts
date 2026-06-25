import { Event as SentryEvent } from '@sentry/core';

const DISK_SPACE_PATTERNS = [
  /out of space/i,
  /no space left on device/i,
  /NSCocoaErrorDomain Code=640/i,
  /NSPOSIXErrorDomain Code=28/i,
];

function collectReportMessages(report: SentryEvent): string[] {
  const messages: string[] = [];

  if (typeof report.message === 'string') {
    messages.push(report.message);
  }

  report.exception?.values?.forEach((item) => {
    if (typeof item.value === 'string') {
      messages.push(item.value);
    }
  });

  return messages;
}

export function isDiskSpaceSentryReport(report: SentryEvent): boolean {
  return collectReportMessages(report).some((message) =>
    DISK_SPACE_PATTERNS.some((pattern) => pattern.test(message)),
  );
}

function extractPersistKey(message: string): string {
  const failedSetMatch = message.match(
    /Failed to set item for (persist:[^\s]+)/,
  );
  if (failedSetMatch) {
    return failedSetMatch[1];
  }

  const pathMatch = message.match(/persistStore\/(persist-[^\s'"]+)/);
  if (pathMatch) {
    return pathMatch[1].replace(/^persist-/, 'persist:');
  }

  if (/ReactNative/.test(message)) {
    return 'browser_screenshot';
  }

  if (/storageService-/.test(message)) {
    return 'snap_storage';
  }

  return 'unknown';
}

function normalizeDiskSpaceMessage(persistKey: string): string {
  return `Device storage full: failed to persist ${persistKey}`;
}

/**
 * Groups disk-full Sentry events by persist target instead of absolute file paths.
 */
export function groupDiskSpaceSentryReport(report: SentryEvent): SentryEvent {
  const rawMessage = collectReportMessages(report)[0] ?? '';
  const persistKey = extractPersistKey(rawMessage);
  const normalizedMessage = normalizeDiskSpaceMessage(persistKey);

  report.fingerprint = ['disk-space-full', persistKey];

  if (typeof report.message === 'string') {
    report.message = normalizedMessage;
  }

  report.exception?.values?.forEach((item) => {
    if (typeof item.value === 'string') {
      item.value = normalizedMessage;
    }
  });

  if (!report.tags) {
    report.tags = {};
  }
  report.tags.error_category = 'disk_full';
  report.tags.persist_key = persistKey;

  return report;
}

import type { PlaywrightElement } from './PlaywrightAdapter.ts';
import { createLogger, LogLevel } from './logger.ts';

/**
 * Resolves log level for Playwright framework modules.
 * Defaults to INFO so debug traces are hidden unless E2E_LOG_LEVEL is lowered.
 */
export function resolvePlaywrightLogLevel(): LogLevel {
  const value = process.env.E2E_LOG_LEVEL?.toLowerCase();

  switch (value) {
    case 'error':
      return LogLevel.ERROR;
    case 'warn':
    case 'warning':
      return LogLevel.WARN;
    case 'info':
      return LogLevel.INFO;
    case 'debug':
      return LogLevel.DEBUG;
    case 'trace':
      return LogLevel.TRACE;
    default:
      return LogLevel.INFO;
  }
}

export function createPlaywrightLogger(name: string) {
  return createLogger({
    name,
    level: resolvePlaywrightLogLevel(),
  });
}

export function formatSelector(selector: unknown): string {
  if (selector === undefined || selector === null) {
    return '';
  }
  if (typeof selector === 'string') {
    return selector;
  }
  if (typeof selector === 'object') {
    return JSON.stringify(selector);
  }
  return String(selector);
}

export async function describeElement(
  elem: PlaywrightElement,
): Promise<string> {
  try {
    const selector = await elem.unwrap().selector;
    const label = formatSelector(selector);
    return label ? ` [${label}]` : '';
  } catch {
    return '';
  }
}

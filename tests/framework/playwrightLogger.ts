import type { PlaywrightElement } from './PlaywrightAdapter.ts';
import { createLogger, type Logger, LogLevel } from './logger.ts';

/**
 * Resolves log level for Playwright framework modules.
 * Defaults to INFO so debug traces are hidden unless E2E_LOG_LEVEL is set to "debug" (or "trace").
 */
export function resolvePlaywrightLogLevel(): LogLevel {
  // Bracket access so babel does not inline this env var at compile time.
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

/**
 * Logs a debug message only when DEBUG is enabled, deferring expensive work
 * (e.g. resolving element selectors) until after the level check.
 */
export async function debugLazy(
  logger: Logger,
  buildMessage: () => Promise<string> | string,
): Promise<void> {
  if (!logger.isLevelEnabled(LogLevel.DEBUG)) {
    return;
  }
  logger.debug(await buildMessage());
}

export async function debugElementAction(
  logger: Logger,
  action: string,
  elem: PlaywrightElement,
): Promise<void> {
  await debugLazy(
    logger,
    async () => `${action}${await describeElement(elem)}`,
  );
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

import { E2E_METAMETRICS_TRACK_URL } from '../../../app/util/test/utils';
import { createLogger } from '../../framework/logger';

/** Same shape as `EventPayload` in `helpers.ts` (kept local to avoid circular imports). */
export interface MetaMetricsEventPayload {
  event: string;
  properties: Record<string, unknown>;
}

const logger = createLogger({
  name: 'E2EAnalyticsDebug',
});

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/**
 * When enabled (`E2E_ANALYTICS_DEBUG=1`), logs MetaMetrics payloads when they are
 * captured and optionally when each POST hits the E2E mock proxy.
 *
 * @see tests/docs/analytics-e2e.md
 */
export function isE2EAnalyticsDebugEnabled(): boolean {
  const raw = process.env.E2E_ANALYTICS_DEBUG;
  if (raw === undefined || raw === '') {
    return false;
  }
  return TRUTHY.has(raw.toLowerCase().trim());
}

const MAX_PROPERTIES_JSON_LENGTH = 2000;

/**
 * Logs each captured event after `getEventsPayloads` (batch read, end of flow or whenever fetch runs).
 */
export function logCapturedMetaMetricsPayloads(
  events: readonly MetaMetricsEventPayload[],
  context: string,
): void {
  if (!isE2EAnalyticsDebugEnabled()) {
    return;
  }
  if (events.length === 0) {
    logger.info(`[E2E Analytics] ${context}: 0 MetaMetrics payloads`);
    return;
  }
  logger.info(
    `[E2E Analytics] ${context}: ${String(events.length)} MetaMetrics payload(s)`,
  );
  events.forEach((payload, index) => {
    logger.info(
      `[E2E Analytics]   [${String(index + 1)}/${String(events.length)}] Captured event: "${payload.event}"`,
    );
    const serialized = JSON.stringify(payload.properties);
    const preview =
      serialized.length > MAX_PROPERTIES_JSON_LENGTH
        ? `${serialized.slice(0, MAX_PROPERTIES_JSON_LENGTH)}…`
        : serialized;
    logger.debug(`[E2E Analytics]   Properties: ${preview}`);
  });
}

/**
 * Logs as soon as a MetaMetrics track POST is handled by the mock `/proxy` handler
 * (real-time relative to the test run, not only at teardown).
 */
export function logLiveMetaMetricsPostIfDebug(
  proxiedTargetUrl: string,
  requestBodyJson: unknown,
): void {
  if (!isE2EAnalyticsDebugEnabled()) {
    return;
  }
  if (!proxiedTargetUrl.includes(E2E_METAMETRICS_TRACK_URL)) {
    return;
  }
  const body = requestBodyJson as Record<string, unknown> | null | undefined;
  if (body && typeof body.event === 'string') {
    logger.info(`[E2E Analytics] Event sent (live): "${body.event}"`);
    const props = body.properties;
    if (props !== undefined && props !== null) {
      const serialized = JSON.stringify(props);
      const preview =
        serialized.length > MAX_PROPERTIES_JSON_LENGTH
          ? `${serialized.slice(0, MAX_PROPERTIES_JSON_LENGTH)}…`
          : serialized;
      logger.debug(`[E2E Analytics]   Properties: ${preview}`);
    }
    return;
  }
  logger.debug(
    `[E2E Analytics] MetaMetrics POST (unparsed or batch shape): ${JSON.stringify(requestBodyJson)?.slice(0, 500)}`,
  );
}

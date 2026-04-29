import { Mockttp, MockttpServer } from 'mockttp';
import Assertions from '../../framework/Assertions';
import SoftAssert from '../../framework/SoftAssert';
import type { AnalyticsExpectations } from '../../framework/types';
import { EventPayload, filterEvents, getEventsPayloads } from './helpers';

/**
 * Returns true when `analyticsExpectations` should run (non-empty configuration).
 */
export function shouldRunAnalyticsExpectations(
  config: AnalyticsExpectations | undefined,
): config is AnalyticsExpectations {
  if (!config) {
    return false;
  }
  return (
    config.validate !== undefined ||
    config.expectedTotalCount !== undefined ||
    (config.events !== undefined && config.events.length > 0) ||
    (config.eventNames !== undefined && config.eventNames.length > 0)
  );
}

/**
 * Derives the event-name filter passed to `getEventsPayloads`.
 * Prefers explicit `eventNames`; otherwise uses unique names from `events`; otherwise all payloads.
 */
export function deriveEventNamesForFetch(
  expectations: AnalyticsExpectations,
): string[] {
  if (expectations.eventNames && expectations.eventNames.length > 0) {
    return expectations.eventNames;
  }
  if (expectations.events && expectations.events.length > 0) {
    return [...new Set(expectations.events.map((entry) => entry.name))];
  }
  return [];
}

/**
 * Runs declarative MetaMetrics checks, then optional `validate`, aggregating **all**
 * failures via `SoftAssert` so every expected event / rule is evaluated (not stop-on-first).
 * Property checks for an event are skipped when that event did not meet `minCount`, to avoid
 * noisy follow-on errors; other expected events are still fully checked.
 */
export async function assertCapturedMetaMetricsEvents(
  events: EventPayload[],
  expectations: AnalyticsExpectations,
  mockServer: Mockttp | MockttpServer,
): Promise<void> {
  const softAssert = new SoftAssert();

  const expectedTotalCount = expectations.expectedTotalCount;
  if (expectedTotalCount !== undefined) {
    await softAssert.checkAndCollect(
      async () => Assertions.checkIfArrayHasLength(events, expectedTotalCount),
      `Expected ${String(expectedTotalCount)} MetaMetrics events, got ${events.length}`,
    );
  }

  if (expectations.events && expectations.events.length > 0) {
    for (const eventExpectation of expectations.events) {
      const minCount = eventExpectation.minCount ?? 1;
      const matching = filterEvents(events, eventExpectation.name);

      await softAssert.checkAndCollect(async () => {
        if (matching.length < minCount) {
          throw new Error(
            `Expected at least ${String(minCount)} "${eventExpectation.name}" events, got ${String(matching.length)}`,
          );
        }
      }, `MetaMetrics event count for "${eventExpectation.name}"`);

      const targetIndex = Math.min(
        eventExpectation.matchEventIndex ?? 0,
        Math.max(matching.length - 1, 0),
      );
      const targetPayload = matching[targetIndex];
      const canInspectPayload =
        matching.length >= minCount && targetPayload !== undefined;

      const requiredProperties = eventExpectation.requiredProperties;
      if (requiredProperties && canInspectPayload) {
        for (let i = 0; i < matching.length; i += 1) {
          const payload = matching[i];
          await softAssert.checkAndCollect(
            async () =>
              Assertions.checkIfObjectHasKeysAndValidValues(
                payload.properties,
                requiredProperties,
              ),
            `"${eventExpectation.name}" event[${String(i)}] property shape`,
          );
        }
      }

      if (!canInspectPayload) {
        continue;
      }

      const definedKeys = eventExpectation.requiredDefinedPropertyKeys;
      if (definedKeys && definedKeys.length > 0) {
        for (const key of definedKeys) {
          await softAssert.checkAndCollect(
            async () =>
              Assertions.checkIfValueIsDefined(targetPayload.properties[key]),
            `"${eventExpectation.name}" property "${key}" should be defined`,
          );
        }
      }

      const matchProperties = eventExpectation.matchProperties;
      if (matchProperties !== undefined) {
        await softAssert.checkAndCollect(
          async () =>
            Assertions.checkIfObjectsMatch(
              targetPayload.properties as object,
              matchProperties as object,
            ),
          `"${eventExpectation.name}" properties should match expected object`,
        );
      }

      const containProperties = eventExpectation.containProperties;
      if (containProperties !== undefined) {
        await softAssert.checkAndCollect(
          async () =>
            Assertions.checkIfObjectContains(
              targetPayload.properties,
              containProperties,
            ),
          `"${eventExpectation.name}" properties should contain expected subset`,
        );
      }
    }
  }

  const customValidate = expectations.validate;
  if (customValidate) {
    await softAssert.checkAndCollect(
      async () => customValidate({ events, mockServer }),
      'analyticsExpectations.validate',
    );
  }

  softAssert.throwIfErrors();
}

/**
 * Fetches MetaMetrics payloads from the mock server and runs `assertCapturedMetaMetricsEvents`.
 */
export async function runAnalyticsExpectations(
  mockServer: Mockttp | MockttpServer,
  expectations: AnalyticsExpectations,
): Promise<void> {
  const names = deriveEventNamesForFetch(expectations);
  const events = await getEventsPayloads(mockServer, names);
  await assertCapturedMetaMetricsEvents(events, expectations, mockServer);
}

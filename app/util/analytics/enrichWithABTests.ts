import { resolveABTestAssignment } from '../abTest';
import { selectRemoteFeatureFlags } from '../../selectors/featureFlagController';
import type { StateWithPartialEngine } from '../../selectors/featureFlagController/types';
import { AB_TEST_ANALYTICS_MAPPINGS } from './abTestAnalyticsRegistry';
import type { ABTestAnalyticsMapping } from './abTestAnalytics.types';

interface ActiveABTestAssignment {
  key: string;
  value: string;
}

const hasEventName = (
  mapping: ABTestAnalyticsMapping,
  eventName: string,
): boolean => mapping.eventNames.includes(eventName);

const isActiveABTestAssignment = (
  value: unknown,
): value is ActiveABTestAssignment =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'key' in value &&
      typeof value.key === 'string' &&
      'value' in value &&
      typeof value.value === 'string',
  );

const getExistingActiveABTests = (value: unknown): ActiveABTestAssignment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isActiveABTestAssignment);
};

export const getRemoteFeatureFlagsFromState = (
  state: StateWithPartialEngine | null | undefined,
): Record<string, unknown> => {
  try {
    return selectRemoteFeatureFlags(state as StateWithPartialEngine);
  } catch {
    return {};
  }
};

export const enrichWithABTests = <
  T extends {
    name: string;
    properties: Record<string, unknown>;
  },
>(
  event: T,
  featureFlags: Record<string, unknown>,
): T => {
  const relevantMappings = AB_TEST_ANALYTICS_MAPPINGS.filter((mapping) =>
    hasEventName(mapping, event.name),
  );

  if (relevantMappings.length === 0) {
    return event;
  }

  const injectedAssignments = relevantMappings.flatMap((mapping) => {
    const { variantName, isActive } = resolveABTestAssignment(
      featureFlags,
      mapping.flagKey,
      mapping.validVariants,
    );

    return isActive ? [{ key: mapping.flagKey, value: variantName }] : [];
  });

  if (injectedAssignments.length === 0) {
    return event;
  }

  const existingAssignments = getExistingActiveABTests(
    event.properties.active_ab_tests,
  );
  const mergedAssignments = [...existingAssignments];
  const existingKeys = new Set(existingAssignments.map(({ key }) => key));

  for (const assignment of injectedAssignments) {
    if (existingKeys.has(assignment.key)) {
      continue;
    }

    existingKeys.add(assignment.key);
    mergedAssignments.push(assignment);
  }

  const enrichedEvent = Object.create(
    Object.getPrototypeOf(event),
    Object.getOwnPropertyDescriptors(event),
  ) as T;

  enrichedEvent.properties = {
    ...event.properties,
    active_ab_tests: mergedAssignments,
  };

  return enrichedEvent;
};

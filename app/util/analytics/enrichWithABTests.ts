import { resolveABTestAssignment } from '../abTest';
import { selectRemoteFeatureFlags } from '../../selectors/featureFlagController';
import type { StateWithPartialEngine } from '../../selectors/featureFlagController/types';
import { AB_TEST_ANALYTICS_MAPPINGS } from './abTestAnalyticsRegistry';
import type { ABTestAnalyticsMapping } from './abTestAnalytics.types';
import {
  createActiveABTestAssignment,
  normalizeActiveABTestAssignments,
  type ActiveABTestAssignment,
} from './activeABTestAssignments';

const cloneEventWithAssignments = <
  T extends {
    properties: Record<string, unknown>;
  },
>(
  event: T,
  assignments: ActiveABTestAssignment[],
): T => {
  const clonedEvent = Object.create(
    Object.getPrototypeOf(event),
    Object.getOwnPropertyDescriptors(event),
  ) as T;

  clonedEvent.properties = {
    ...event.properties,
    active_ab_tests: assignments,
  };

  return clonedEvent;
};

const matchesMapping = (
  mapping: ABTestAnalyticsMapping,
  event: { name: string; properties: Record<string, unknown> },
): boolean => {
  if (!mapping.eventNames.includes(event.name)) {
    return false;
  }

  const requirements = mapping.eventPropertyRequirements?.[event.name];
  if (!requirements) {
    return true;
  }

  return Object.entries(requirements).every(
    ([propertyKey, expectedValue]) =>
      event.properties[propertyKey] === expectedValue,
  );
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
  const existingAssignments = normalizeActiveABTestAssignments(
    event.properties.active_ab_tests,
  );
  const relevantMappings = AB_TEST_ANALYTICS_MAPPINGS.filter((mapping) =>
    matchesMapping(mapping, event),
  );

  if (relevantMappings.length === 0) {
    if (existingAssignments.length === 0) {
      return event;
    }

    return cloneEventWithAssignments(event, existingAssignments);
  }

  const injectedAssignments = relevantMappings.flatMap((mapping) => {
    const { variantName, isActive } = resolveABTestAssignment(
      featureFlags,
      mapping.flagKey,
      mapping.validVariants,
    );

    return isActive
      ? [createActiveABTestAssignment(mapping.flagKey, variantName)]
      : [];
  });

  if (injectedAssignments.length === 0) {
    if (existingAssignments.length === 0) {
      return event;
    }

    return cloneEventWithAssignments(event, existingAssignments);
  }
  const mergedAssignments = [...existingAssignments];
  const existingKeys = new Set(existingAssignments.map(({ key }) => key));

  for (const assignment of injectedAssignments) {
    if (existingKeys.has(assignment.key)) {
      continue;
    }

    existingKeys.add(assignment.key);
    mergedAssignments.push(assignment);
  }

  return cloneEventWithAssignments(event, mergedAssignments);
};

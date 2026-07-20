import type { PredictOutcome, PredictOutcomeGroup } from '../types';
import {
  FINAL_RESOLUTION_STATUSES,
  normalizeResolutionStatus,
} from './marketState';

export interface SplitOutcomeGroupsByStatusResult {
  openOutcomeGroups: PredictOutcomeGroup[];
  resolvedOutcomeGroups: PredictOutcomeGroup[];
}

export const isResolvedOutcome = (outcome: PredictOutcome): boolean => {
  if (outcome.status === 'closed' || outcome.status === 'resolved') {
    return true;
  }

  const resolutionStatus = normalizeResolutionStatus(outcome.resolutionStatus);
  return Boolean(
    resolutionStatus && FINAL_RESOLUTION_STATUSES.has(resolutionStatus),
  );
};

const hasVisibleGroupContent = (group: PredictOutcomeGroup): boolean =>
  group.outcomes.length > 0 || Boolean(group.subgroups?.length);

const buildOutcomeGroup = (
  group: PredictOutcomeGroup,
  outcomes: PredictOutcome[],
  subgroups: PredictOutcomeGroup[],
): PredictOutcomeGroup => {
  const { subgroups: _subgroups, ...groupWithoutSubgroups } = group;

  return {
    ...groupWithoutSubgroups,
    outcomes,
    ...(subgroups.length > 0 && { subgroups }),
  };
};

const splitOutcomeGroupByStatus = (
  group: PredictOutcomeGroup,
): {
  openOutcomeGroup?: PredictOutcomeGroup;
  resolvedOutcomeGroup?: PredictOutcomeGroup;
} => {
  const openOutcomes = group.outcomes.filter(
    (outcome) => !isResolvedOutcome(outcome),
  );
  const resolvedOutcomes = group.outcomes.filter(isResolvedOutcome);

  const splitSubgroups = group.subgroups?.map(splitOutcomeGroupByStatus) ?? [];
  const openSubgroups = splitSubgroups
    .map((splitGroup) => splitGroup.openOutcomeGroup)
    .filter((subgroup): subgroup is PredictOutcomeGroup => Boolean(subgroup));
  const resolvedSubgroups = splitSubgroups
    .map((splitGroup) => splitGroup.resolvedOutcomeGroup)
    .filter((subgroup): subgroup is PredictOutcomeGroup => Boolean(subgroup));

  if (group.outcomes.length === 0 && !group.subgroups?.length) {
    return {
      openOutcomeGroup: group,
    };
  }

  const hasOpenContent = openOutcomes.length > 0 || openSubgroups.length > 0;
  const hasResolvedContent =
    resolvedOutcomes.length > 0 || resolvedSubgroups.length > 0;

  if (hasOpenContent && !hasResolvedContent) {
    return {
      openOutcomeGroup: group,
    };
  }

  if (!hasOpenContent && hasResolvedContent) {
    return {
      resolvedOutcomeGroup: group,
    };
  }

  const openOutcomeGroup = buildOutcomeGroup(
    group,
    openOutcomes,
    openSubgroups,
  );
  const resolvedOutcomeGroup = buildOutcomeGroup(
    group,
    resolvedOutcomes,
    resolvedSubgroups,
  );

  return {
    ...(hasVisibleGroupContent(openOutcomeGroup) && { openOutcomeGroup }),
    ...(hasVisibleGroupContent(resolvedOutcomeGroup) && {
      resolvedOutcomeGroup,
    }),
  };
};

export const splitOutcomeGroupsByStatus = (
  outcomeGroups: PredictOutcomeGroup[],
): SplitOutcomeGroupsByStatusResult => {
  const splitGroups = outcomeGroups.map(splitOutcomeGroupByStatus);

  return {
    openOutcomeGroups: splitGroups
      .map((splitGroup) => splitGroup.openOutcomeGroup)
      .filter((group): group is PredictOutcomeGroup => Boolean(group)),
    resolvedOutcomeGroups: splitGroups
      .map((splitGroup) => splitGroup.resolvedOutcomeGroup)
      .filter((group): group is PredictOutcomeGroup => Boolean(group)),
  };
};

export const countOutcomeGroupOutcomes = (group: PredictOutcomeGroup): number =>
  group.outcomes.length +
  (group.subgroups?.reduce(
    (count, subgroup) => count + countOutcomeGroupOutcomes(subgroup),
    0,
  ) ?? 0);

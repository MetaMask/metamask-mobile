import { useMemo } from 'react';
import {
  OPEN_PREDICT_OUTCOME_STATUS,
  type PredictOutcome,
  type PredictOutcomeGroup,
} from '../../types';
import {
  buildOutcomeCardModels,
  type OutcomeCardModel,
} from './outcomeCardModel';

interface UsePredictGameGroupOutcomesParams {
  group?: PredictOutcomeGroup;
}

interface UsePredictGameGroupOutcomesResult {
  openCardModels: OutcomeCardModel[];
  closedOutcomes: PredictOutcome[];
  showResolvedSection: boolean;
}

const isOpenOutcome = (outcome: PredictOutcome): boolean =>
  outcome.status === OPEN_PREDICT_OUTCOME_STATUS &&
  outcome.resolutionStatus !== 'resolved';

const isResolvedOutcome = (outcome: PredictOutcome): boolean =>
  outcome.status === 'closed' ||
  outcome.status === 'resolved' ||
  outcome.resolutionStatus === 'resolved';

const splitOutcomeGroupByStatus = (
  group: PredictOutcomeGroup,
): {
  openGroup: PredictOutcomeGroup | null;
  closedOutcomes: PredictOutcome[];
} => {
  if (group.subgroups?.length) {
    const subgroupResults = group.subgroups.map(splitOutcomeGroupByStatus);
    const openSubgroups = subgroupResults
      .map((result) => result.openGroup)
      .filter((subgroup): subgroup is PredictOutcomeGroup => Boolean(subgroup));
    const closedOutcomes = subgroupResults.flatMap(
      (result) => result.closedOutcomes,
    );

    return {
      openGroup:
        openSubgroups.length > 0
          ? { ...group, outcomes: [], subgroups: openSubgroups }
          : null,
      closedOutcomes,
    };
  }

  const openOutcomes = group.outcomes.filter(isOpenOutcome);
  const closedOutcomes = group.outcomes.filter(isResolvedOutcome);

  return {
    openGroup:
      openOutcomes.length > 0 ? { ...group, outcomes: openOutcomes } : null,
    closedOutcomes,
  };
};

export const usePredictGameGroupOutcomes = ({
  group,
}: UsePredictGameGroupOutcomesParams): UsePredictGameGroupOutcomesResult => {
  const { openGroup, closedOutcomes } = useMemo(
    () =>
      group
        ? splitOutcomeGroupByStatus(group)
        : { openGroup: null, closedOutcomes: [] },
    [group],
  );

  const openCardModels = useMemo(
    () => (openGroup ? buildOutcomeCardModels(openGroup) : []),
    [openGroup],
  );

  return {
    openCardModels,
    closedOutcomes,
    showResolvedSection: closedOutcomes.length > 0,
  };
};

export { buildOutcomeCardModels };

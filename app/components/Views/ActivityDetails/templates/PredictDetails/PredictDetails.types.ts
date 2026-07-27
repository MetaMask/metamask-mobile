import { strings } from '../../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PredictActivity } from '../../../../UI/Predict/types';

export type PredictActivityType =
  | 'predictionsAddFunds'
  | 'predictionsWithdrawFunds'
  | 'predictionClaimWinnings'
  | 'predictionCashedOut'
  | 'predictionPlaced';

export type PredictActivityListItem = ActivityListItem & {
  type: PredictActivityType;
};

export function asPredictActivityItem(
  item: ActivityListItem,
): PredictActivityListItem {
  return item as PredictActivityListItem;
}

export function getPredictActivity(
  item: ActivityListItem,
): PredictActivity | undefined {
  return item.raw?.type === 'predictActivity' ? item.raw.data : undefined;
}

export function formatPredictDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getPredictFundsStepLabels(): string[] {
  return [
    strings('predict.transactions.steps.bridge_funds'),
    strings('predict.transactions.steps.add_funds'),
  ];
}

export function getPredictFundsCtaLabel(
  status: ActivityListItem['status'],
  isDeposit: boolean,
): string {
  if (status === 'failed') {
    return strings('predict.transactions.try_again');
  }

  return isDeposit
    ? strings('predict.transactions.fund_again')
    : strings('predict.deposit.withdraw');
}

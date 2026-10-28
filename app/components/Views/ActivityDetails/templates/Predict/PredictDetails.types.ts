import { strings } from '../../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../../util/activity-adapters';

type PredictActivityType =
  | 'predictionsAddFunds'
  | 'predictionsWithdrawFunds'
  | 'predictionClaimWinnings'
  | 'predictionCashedOut'
  | 'predictionPlaced';

export type PredictActivityListItem = ActivityListItem & {
  type: PredictActivityType;
};

export function formatPredictDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

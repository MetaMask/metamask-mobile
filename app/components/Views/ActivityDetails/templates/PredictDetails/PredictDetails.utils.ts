import { strings } from '../../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../../util/activity-adapters';
import {
  formatPredictDate,
  getPredictFundsStepLabels,
} from './PredictDetails.types';
import type { ActivityDetailsStep } from '../../components';
import type { PayFundsFailure } from '../../hooks/usePayFundsFailure';

const POLYMARKET_BASE_URL = 'https://polymarket.com';

export function getPolymarketActivityUrl(activity?: {
  providerId?: string;
  eventSlug?: string;
  slug?: string;
}): string | undefined {
  // Only Polymarket has a public web URL today. Guard on providerId so other
  // providers don't get sent to a wrong (Polymarket) destination.
  if (activity?.providerId !== 'polymarket') {
    return undefined;
  }
  const slug = activity?.eventSlug ?? activity?.slug;
  return slug
    ? `${POLYMARKET_BASE_URL}/event/${encodeURIComponent(slug)}`
    : POLYMARKET_BASE_URL;
}

export function getPredictFundsSteps(
  status: ActivityListItem['status'],
  timestamp: number,
  failure?: PayFundsFailure,
): ActivityDetailsStep[] {
  const labels = getPredictFundsStepLabels();
  const completedTimestamp = formatPredictDate(timestamp);

  if (status === 'success') {
    return labels.map((label) => ({
      label,
      subtext: completedTimestamp,
      status: 'completed',
    }));
  }

  const failedIndex =
    status === 'failed' ? (failure?.failedLeg ? 0 : labels.length - 1) : undefined;

  return labels.map((label, index) => {
    if (index === failedIndex) {
      return {
        label,
        subtext: strings('transaction.failed'),
        status: 'failed',
        failureMessage: failure?.message,
        failureExplorerTarget: failure?.explorerTarget,
      };
    }

    if (failedIndex !== undefined) {
      return index < failedIndex
        ? { label, subtext: completedTimestamp, status: 'completed' }
        : { label, status: 'upcoming' };
    }

    const isTerminal = index === labels.length - 1;
    if (!isTerminal) {
      return { label, subtext: completedTimestamp, status: 'completed' };
    }

    return {
      label,
      subtext: strings('transaction.pending'),
      status: 'pending',
    };
  });
}

export function getPredictFundsStepTitle(
  status: ActivityListItem['status'],
  completedCount: number,
  totalSteps: number,
) {
  if (status === 'success') {
    return strings('predict.transactions.steps.title_completed', {
      completed: totalSteps,
    });
  }

  if (status === 'failed') {
    return strings('predict.transactions.steps.title_failed', {
      completed: completedCount,
      failed: 1,
    });
  }

  return strings('predict.transactions.steps.title_pending', {
    completed: completedCount,
    pending: totalSteps - completedCount,
  });
}
